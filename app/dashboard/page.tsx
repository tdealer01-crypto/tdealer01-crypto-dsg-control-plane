"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
    })
  }, [])

  return (
    <div style={{ padding: 40 }}>
      <h1>Dashboard</h1>
      {user ? <p>{user.email}</p> : <p>Loading...</p>}
    </div>
  )
}
