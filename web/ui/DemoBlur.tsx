import { type ReactNode } from "react"

type Props = {
  children: ReactNode
}

export function DemoBlur({ children }: Props) {
  return children
  // return <span className="inline-block blur-sm">{children}</span>
}
