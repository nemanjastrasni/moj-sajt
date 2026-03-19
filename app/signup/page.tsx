"use client"

import { useState } from "react"

export default function SignupPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")

  const handleSignup = async () => {
    await fetch("/api/signup", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    })

    window.location.href = "/login"
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white p-8 rounded shadow flex flex-col gap-3">
        
        <input placeholder="Name" onChange={e => setName(e.target.value)} />
        <input placeholder="Email" onChange={e => setEmail(e.target.value)} />
        <input placeholder="Password" type="password" onChange={e => setPassword(e.target.value)} />

        <button onClick={handleSignup}>
          Signup
        </button>

      </div>
    </div>
  )
}