import { isOfflinePlaylist, type OfflinePlaylist } from "./model"
const DB = "gitarakordi-offline-v1", STORE = "playlists"
export const OFFLINE_EVENT = "gitarakordi-offline-change"
const EPOCH = "gitarakordi-offline-epoch"
export const OFFLINE_OWNER = "gitarakordi-offline-owner"
export function offlineEpoch() { return localStorage.getItem(EPOCH) ?? "0" }
function notify() {
  window.dispatchEvent(new Event(OFFLINE_EVENT))
  try { localStorage.setItem("gitarakordi-offline-change", String(Date.now())) } catch { /* Same-tab notifications still work if storage is full. */ }
}
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "id" })
    request.onerror = () => reject(Error("Offline memorija nije dostupna na ovom uređaju."))
    request.onblocked = () => reject(Error("Zatvori druge kartice aplikacije i pokušaj ponovo."))
    request.onsuccess = () => resolve(request.result)
  })
}
export async function readOfflineLists(): Promise<OfflinePlaylist[]> {
  const db = await open()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly"), req = tx.objectStore(STORE).getAll()
    tx.oncomplete = () => { db.close(); resolve((req.result as unknown[]).filter(isOfflinePlaylist)) }
    tx.onabort = tx.onerror = () => { db.close(); reject(Error("Offline memorija nije dostupna.")) }
  })
}
export async function saveOfflineList(list: OfflinePlaylist, epoch: string) {
  if (!isOfflinePlaylist(list)) throw Error("Preuzeti podaci nisu potpuni.")
  if (offlineEpoch() !== epoch) throw Error("Preuzimanje je prekinuto zbog odjave.")
  const owner = localStorage.getItem(OFFLINE_OWNER)
  if (owner && owner !== list.ownerId) throw Error("Sačekaj uklanjanje offline kopija prethodnog naloga, pa pokušaj ponovo.")
  localStorage.setItem(OFFLINE_OWNER, list.ownerId)
  const db = await open()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite"), store = tx.objectStore(STORE), all = store.getAll()
    let error = "Nema dovoljno prostora. Prethodna kopija nije promenjena."
    all.onsuccess = () => {
      try {
      if (offlineEpoch() !== epoch) { error = "Preuzimanje je prekinuto zbog odjave."; tx.abort(); return }
      const previous = (all.result as OfflinePlaylist[]).filter(item => item.id !== list.id)
      if (previous.some(item => item.ownerId !== list.ownerId)) { error = "Obriši offline kopije prethodnog naloga pre preuzimanja."; tx.abort(); return }
      if (new Blob([JSON.stringify([...previous, list])]).size > 20 * 1024 * 1024) { error = "Offline prostor je ograničen na 20 MB. Ukloni neku kopiju."; tx.abort(); return }
      store.put(list)
      } catch { tx.abort() }
    }
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onabort = tx.onerror = () => { db.close(); reject(Error(error)) }
  })
  notify()
}
export async function removeOfflineList(id?: string) {
  localStorage.setItem(EPOCH, crypto.randomUUID())
  const db = await open()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite"), store = tx.objectStore(STORE)
    if (id) store.delete(id); else store.clear()
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onabort = tx.onerror = () => { db.close(); reject(Error("Brisanje offline kopije nije uspelo.")) }
  })
  if (!id) localStorage.removeItem(OFFLINE_OWNER)
  notify()
}
export async function prepareOfflineShell() {
  if (!navigator.serviceWorker || !window.isSecureContext) throw Error("Ovaj pregledač ne podržava offline aplikaciju.")
  await navigator.serviceWorker.register("/offline-sw.js", { scope: "/", updateViaCache: "none" })
  const registration = await new Promise<ServiceWorkerRegistration>((resolve, reject) => {
    const timer = setTimeout(() => reject(Error("Offline aplikacija se nije pripremila. Pokušaj ponovo.")), 60000)
    void navigator.serviceWorker.ready.then(value => { clearTimeout(timer); resolve(value) }, error => { clearTimeout(timer); reject(error) })
  })
  await new Promise<void>((resolve, reject) => {
    const channel = new MessageChannel(), timer = setTimeout(() => { channel.port1.close(); reject(Error("Priprema offline aplikacije je istekla. Pokušaj ponovo.")) }, 60000)
    channel.port1.onmessage = event => { clearTimeout(timer); channel.port1.close(); if (event.data?.ok === true) resolve(); else reject(Error("Priprema offline aplikacije nije uspela. Proveri vezu i pokušaj ponovo.")) }
    registration.active?.postMessage({ type: "PREPARE_OFFLINE" }, [channel.port2])
  })
}
