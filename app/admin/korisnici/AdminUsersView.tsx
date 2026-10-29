import Image from "next/image"
import type { PresenceSnapshot } from "@/lib/presence/model"
import { AdminPresenceProvider, GuestPresenceList, UserPresenceCells } from "@/app/components/AdminPresence"
import UiText from "@/app/components/UiText"
import UserRoleButton from "./UserRoleButton"
import ConfirmSubmitButton from "../ConfirmSubmitButton"

type AdminUser = {id:string;name:string|null;email:string|null;city:string|null;birthYear:number|null;image:string|null;role:string;banned:boolean}
export default function AdminUsersView({users,actorId,snapshot}:{users:AdminUser[];actorId:string;snapshot:PresenceSnapshot|null}) {
  return <section className="admin-page">
    <h1>Korisnici</h1>
    <AdminPresenceProvider key={snapshot?.checkedAt ?? "unavailable"} initial={snapshot}>
      <div className="admin-table-scroll" role="region" aria-label="Korisnici i prisustvo" tabIndex={0}><table className="admin-table admin-users">
        <thead><tr>
          <th scope="col">Slika</th><th scope="col">Ime</th><th scope="col">Email</th><th scope="col">Grad</th><th scope="col">God.</th><th scope="col">Uloga</th><th scope="col">Online</th>
          <th scope="col"><UiText text="Zemlja posete (priblizno)" /></th><th scope="col">Poslednja aktivnost</th><th scope="col">Status</th><th scope="col">Akcije</th>
        </tr></thead>
        <tbody>{users.map(user=><tr key={user.id}>
          <td>{user.image ? <Image src={user.image} width={32} height={32} unoptimized alt="" className="h-8 w-8 rounded-full object-cover" /> : "-"}</td>
          <td>{user.name || "-"}</td><td data-label="Email">{user.email}</td><td data-label="Grad">{user.city || "-"}</td><td data-label="Godište">{user.birthYear || "-"}</td><td data-label="Uloga">{user.role === "admin" ? "Admin" : user.role === "user" ? "Korisnik" : user.role}</td>
          <UserPresenceCells userId={user.id} />
          <td data-label="Status">{user.banned ? "Blokiran" : "Aktivan"}</td>
          <td data-label="Akcije"><div className="admin-row-actions"><UserRoleButton key={user.id + user.role} user={user} currentId={actorId} />
            {!user.banned && user.id !== actorId && <form action="/api/admin/users/ban" method="POST"><input type="hidden" name="userId" value={user.id} /><ConfirmSubmitButton name={user.email || user.name || user.id} label="Blokiraj" description="Korisniku će biti onemogućen pristup nalogu. Pesme i plejliste neće biti obrisane." /></form>}
          </div></td>
        </tr>)}</tbody>
      </table></div>
      <GuestPresenceList />
    </AdminPresenceProvider>
  </section>
}
