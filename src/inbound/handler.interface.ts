import type { MessageContext } from './context.js'

export interface MessageHandler {
  name: string
  enabled?: boolean
  matcher: (ctx: MessageContext) => boolean | Promise<boolean>
  action: (ctx: MessageContext) => Promise<void>
}
