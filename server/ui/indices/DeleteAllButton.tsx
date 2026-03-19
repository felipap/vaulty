"use client"

import { Button } from "@/ui/Button"
import { TrashIcon } from "@/ui/icons"

type Props = {
  confirmMessage: string
  onDelete: () => void | Promise<void>
}

export function DeleteAllButton({ confirmMessage, onDelete }: Props) {
  async function handleClick() {
    const confirmed = confirm(confirmMessage)
    if (!confirmed) {
      return
    }
    await onDelete()
  }

  return (
    <Button
      variant="danger"
      size="sm"
      icon={<TrashIcon size={12} />}
      onClick={handleClick}
    >
      Delete All
    </Button>
  )
}
