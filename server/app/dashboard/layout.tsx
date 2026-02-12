import { isAuthenticated } from "@/lib/admin-auth"
import { isDashboardIpWhitelistEnabled } from "@/lib/auth-utils"
import { redirect } from "next/navigation"
import { DashboardNav } from "./DashboardNav"
import { IpWhitelistWarningBanner } from "./IpWhitelistWarningBanner"

interface Props {
  children: React.ReactNode
}

export default async function DashboardLayout({ children }: Props) {
  if (!(await isAuthenticated())) {
    redirect("/")
  }

  const isWhitelistEnabled = isDashboardIpWhitelistEnabled()

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a]">
      <DashboardNav />
      {!isWhitelistEnabled && <IpWhitelistWarningBanner />}
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  )
}
