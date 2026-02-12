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
        className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 font-mono text-sm outline-none transition-colors placeholder:text-neutral-300 focus:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-900 dark:placeholder:text-neutral-600 dark:focus:border-neutral-600"
      />

      {state.error && (
        <p className="font-mono text-xs text-red-500">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-neutral-900 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        {isPending ? "..." : "Enter"}
      </button>
    </form>
  )
}
