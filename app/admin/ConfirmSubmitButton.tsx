"use client"

import { useRef, useState } from "react"
import { createPortal, useFormStatus } from "react-dom"
import { Trash2 } from "lucide-react"
import AdminDeleteDialog from "@/app/components/AdminDeleteDialog"

export default function ConfirmSubmitButton({ name, label, description }: { name: string; label: string; description: string }) {
  const button = useRef<HTMLButtonElement>(null), { pending } = useFormStatus()
  const [open,setOpen] = useState(false)
  return <>
    <button ref={button} type="submit" className="ui-button ui-button-danger" disabled={pending} onClick={event=>{event.preventDefault();setOpen(true)}}><Trash2 aria-hidden="true" />{label}</button>
    {open && createPortal(<AdminDeleteDialog open name={name} title={label + "?"} description={description} busy={pending} error="" close={()=>setOpen(false)} confirm={()=>{button.current?.form?.requestSubmit(button.current);setOpen(false)}} />, document.body)}
  </>
}
