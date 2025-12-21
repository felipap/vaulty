import { redirect } from "next/navigation"
import { isAuthenticated } from "@/lib/admin-auth"
import { DashboardClient } from "./DashboardClient"

async function Page() {
  if (!(await isAuthenticated())) {
    redirect("/")
  }

  return <DashboardClient />
}

export default Page
