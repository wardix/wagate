import { MessageContext } from './context.js'
import type { ParsedMessage } from './message.parser.js'
import type { MessageHandler } from './handler.interface.js'
import type { SessionInstance } from '../core/session.instance.js'

export class MessageRouter {
  private handlers: MessageHandler[] = []

  /**
   * Mendaftarkan handler aksi baru ke dalam pipeline
   */
  register(handler: MessageHandler): void {
    this.handlers.push(handler)
  }

  /**
   * Mendistribusikan pesan masuk ke handler yang kriterianya cocok
   */
  async dispatch(message: ParsedMessage, session: SessionInstance | any): Promise<boolean> {
    // Abaikan pesan jika dikirim oleh bot itu sendiri
    if (message.raw?.key?.fromMe) {
      return false
    }

    const ctx = new MessageContext(message, session)

    for (const handler of this.handlers) {
      if (handler.enabled === false) continue

      try {
        const isMatch = await handler.matcher(ctx)
        if (isMatch) {
          await handler.action(ctx)
          return true // Berhasil dieksekusi oleh handler
        }
      } catch (err) {
        console.error(`[MessageRouter] Error saat mengeksekusi handler "${handler.name}":`, err)
      }
    }

    return false
  }

  getHandlers(): MessageHandler[] {
    return [...this.handlers]
  }
}
