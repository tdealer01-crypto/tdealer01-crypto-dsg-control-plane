import { getUser } from "@/lib/getUser"

export default async function Dashboard() {
  const user = await getUser()

  return (
    <div>
      <h1>Dashboard</h1>
      <p>{user?.email}</p>
    </div>
  )
}
