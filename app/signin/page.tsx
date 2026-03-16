"use client"

import { signIn } from "next-auth/react"
import { useState } from "react"

export default function SignIn() {
  const [email,setEmail] = useState("")
  const [password,setPassword] = useState("")

  const handleSubmit = async (e:any)=>{
    e.preventDefault()

    await signIn("credentials",{
      email,
      password,
      callbackUrl:"/"
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-sm mx-auto mt-20">
      <input placeholder="email" onChange={e=>setEmail(e.target.value)} />
      <input type="password" placeholder="password" onChange={e=>setPassword(e.target.value)} />

      <button type="submit">Sign in</button>

      <button type="button" onClick={()=>signIn("github")}>
        Sign in with GitHub
      </button>
    </form>
  )
}