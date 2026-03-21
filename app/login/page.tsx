"use client"

import { useState } from "react"
import { supabase } from "../lib/supabase"

export default function Login() {
  const [email, setEmail] = useState("")

  const login = async () => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
    })

    if (error) {
      alert("Error: " + error.message)
    } else {
      alert("Check your email")
    }
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Login</h1>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="email"
      />
      <button onClick={login}>Send Login Link</button>
    </div>
  )
}
