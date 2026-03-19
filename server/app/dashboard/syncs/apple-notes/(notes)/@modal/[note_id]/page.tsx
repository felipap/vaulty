import { getAppleNote } from "../../../actions"
import { notFound } from "next/navigation"
import { NoteDrawer } from "./NoteDrawer"

type Props = {
  params: Promise<{ note_id: string }>
}

export default async function Page({ params }: Props) {
  const { note_id } = await params
  const note = await getAppleNote(note_id)

  if (!note) {
    notFound()
  }

  return <NoteDrawer note={note} />
}
