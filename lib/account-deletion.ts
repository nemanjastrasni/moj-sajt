import { CONTACT_MAILTO } from "./site-contact"

// Public, unauthenticated request path. The user sends the message in their mail app.
// Never put profile data, credentials or a session token in this URL.
export const ACCOUNT_DELETION_SUBJECT = "Zahtev za brisanje naloga i podataka — GitarAkordi"
export const ACCOUNT_DELETION_BODY = [
  "Želim trajno brisanje svog GitarAkordi naloga i povezanih ličnih podataka.",
  "",
  "Email adresa mog GitarAkordi naloga:",
  "",
  "Molim da potvrdite prijem zahteva i sledeće korake provere vlasništva naloga.",
  "",
  "Ne šaljem lozinku, podatke kartice ili lična dokumenta.",
].join("\n")
export const ACCOUNT_DELETION_MAILTO = `${CONTACT_MAILTO}?subject=${encodeURIComponent(ACCOUNT_DELETION_SUBJECT)}&body=${encodeURIComponent(ACCOUNT_DELETION_BODY)}`
