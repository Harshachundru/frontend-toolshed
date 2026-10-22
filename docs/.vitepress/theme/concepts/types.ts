// Shapes shared by the generic diagrams on the core concepts page.

export interface Step {
  title: string
  sub?: string
  detail: string
}

export interface Message {
  from: number
  to: number
  label: string
  note: string
  dashed?: boolean
}

export interface Scenario {
  name: string
  messages: Message[]
}
