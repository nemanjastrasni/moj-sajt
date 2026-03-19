"use client"

import { signIn } from "next-auth/react"
import { useState } from "react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [show, setShow] = useState(false)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      
      <div className="bg-white p-8 rounded-2xl shadow-lg w-80 flex flex-col gap-4">
        
        <h1 className="text-2xl font-bold text-center">Login</h1>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="border px-3 py-2 rounded"
        />

        <div className="flex gap-2">
          <input
            type={show ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="border px-3 py-2 rounded flex-1"
          />
          <button onClick={() => setShow(!show)}>👁</button>
        </div>

        <button
         onClick={async () => {
  await signIn("credentials", {
    email,
    password,
    redirect: true,
    callbackUrl: "/"
  })
}}
          className="bg-black text-white py-2 rounded"
        >
          Login
        </button>

        <button
          onClick={() => signIn("google", { callbackUrl: "/" })}
          className="border py-2 rounded"
        >
          Continue with Google
        </button>

      </div>
    </div>
  )
}