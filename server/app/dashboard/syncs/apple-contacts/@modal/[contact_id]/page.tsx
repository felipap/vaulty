import { getContact } from "../../actions"
import { notFound } from "next/navigation"
import { ContactDrawer } from "./ContactDrawer"

type Props = {
  params: Promise<{ contact_id: string }>
}

export default async function Page({ params }: Props) {
  const { contact_id } = await params
  const contact = await getContact(contact_id)

  if (!contact) {
    notFound()
  }

  return <ContactDrawer contact={contact} />
}
