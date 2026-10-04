import type { MessageHandler } from '../handler.interface.js'
import { config } from '../../config/app.config.js'

export const webhookHandler: MessageHandler = {
  name: 'webhook-forwarder',
  matcher: () => Boolean(config.webhookUrl),
  action: async (ctx) => {
    if (!config.webhookUrl) return

    try {
      const payload = {
        event: 'message.received',
        sessionId: ctx.sessionId,
        messageId: ctx.id,
        from: ctx.from,
        sender: ctx.sender,
        senderName: ctx.senderName,
        isGroup: ctx.isGroup,
        text: ctx.text,
        type: ctx.type,
        timestamp: ctx.timestamp,
        quoted: ctx.quoted
      }

      await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
    } catch (err) {
      console.error('[WebhookHandler] Gagal meneruskan pesan ke webhook:', err)
    }
  }
}
