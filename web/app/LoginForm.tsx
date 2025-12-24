"use client"

import { useActionState } from "react"
import { login } from "./actions"

type State = { error?: string }

export function LoginForm() {
  const [state, formAction, isPending] = useActionState<State, FormData>(
    login,
    {}
  )

  return (
    <form action={formAction} className="space-y-4">
      <input
        name="passphrase"
        type="password"
        placeholder="Passphrase"
        required
        autoFocus
        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:focus:border-zinc-500"
      />

      {state.error && (
        <p className="text-sm text-red-500">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-zinc-900 py-2 text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {isPending ? "..." : "Enter"}
      </button>
    </form>
  )
}



