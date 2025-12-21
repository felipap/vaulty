"use server"

import { setAuthCookie, clearAuthCookie } from "@/lib/admin-auth"
import { redirect } from "next/navigation"

export async function login(
  _prevState: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const passphrase = formData.get("passphrase") as string

  if (!passphrase) {
    return { error: "Passphrase required" }
  }

  const success = await setAuthCookie(passphrase)
  if (!success) {
    return { error: "Invalid passphrase" }
  }

  redirect("/dashboard")
}

export async function logout(): Promise<void> {
  await clearAuthCookie()
  redirect("/")
}

