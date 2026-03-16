"use client"

import { useState } from "react"

export default function Signup() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const handleSubmit = async (e: any) => {
    e.preventDefault()

    await fetch("/api/signup", {
      method: "POST",
      body: JSON.stringify({ name, email, password })
    })

    alert("Account created")
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-sm mx-auto mt-20">
      <input placeholder="Name" onChange={e => setName(e.target.value)} />
      <input placeholder="Email" onChange={e => setEmail(e.target.value)} />
      <input type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} />
      <button type="submit">Sign up</button>
    </form>
  )
}