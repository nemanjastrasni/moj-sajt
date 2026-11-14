/* eslint-disable @typescript-eslint/no-require-imports -- Shared server/transaction fingerprint, no content is stored in decisions. */
const {hash}=require('./artist-wiki-store.cjs')
function findingVersion(finding,row){
 return hash([finding.subject,row.id,row.name??row.title??null,row.slug??null,row.category??null,finding.field,
  finding.subject==='song'?[row.lyrics??null,row.chords??null]:row[finding.field]??null])
}
module.exports={findingVersion}
