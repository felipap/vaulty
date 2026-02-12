import type { Metadata } from "next"
import { AccessTokens } from "./AccessTokens"
import { DangerZone } from "./DangerZone"

export const metadata: Metadata = {
  title: "Settings",
}

export default function Page() {
  return (
    <div className="space-y-8">
      <h1 className="heading-page">Settings</h1>
      <AccessTokens />
      <hr className="border-zinc-200 dark:border-zinc-700" />
      <DangerZone />
    </div>
  )
}
