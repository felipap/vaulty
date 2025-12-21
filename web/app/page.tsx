import { redirect } from "next/navigation"
import { isAuthenticated } from "@/lib/admin-auth"
import { LoginForm } from "./LoginForm"

async function Page() {
  if (await isAuthenticated()) {
    redirect("/dashboard")
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="mb-2 text-center text-2xl font-semibold">Context</h1>
        <p className="mb-6 text-center text-sm text-zinc-500">
          Enter your admin passphrase
        </p>

        <LoginForm />
      </div>
    </div>
  )
}

export default Page
