import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Contacts",
}

type Props = {
  children: React.ReactNode
  modal: React.ReactNode
}

export default function ContactsLayout({ children, modal }: Props) {
  return (
    <>
      {children}
      {modal}
    </>
  )
}
