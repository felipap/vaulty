import { isAuthenticated } from "@/lib/admin-auth"
import { redirect } from "next/navigation"
import { LoginForm } from "./LoginForm"

export default async function Page() {
  if (await isAuthenticated()) {
    redirect("/dashboard")
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-[#0a0a0a]">
      <div className="w-full max-w-[320px] px-6">
        <h1 className="mb-1 text-center text-xl font-semibold tracking-tight">
          Vaulty
        </h1>
        <p className="mb-8 text-center text-xs text-neutral-400">
          Enter your admin passphrase
        </p>

        <LoginForm />
      </div>
    </div>
  )
}
