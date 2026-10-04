import type { MessageHandler } from '../handler.interface.js'

export const pingHandler: MessageHandler = {
  name: 'ping-command',
  matcher: (ctx) => ctx.text.toLowerCase() === '!ping',
  action: async (ctx) => {
    await ctx.react('🏓')
    await ctx.reply('Pong! 🏓 Server WAGate aktif dan merespon normal.')
  }
}
