import type { MessageHandler } from '../handler.interface.js'

export const menuHandler: MessageHandler = {
  name: 'menu-command',
  matcher: (ctx) => ['!menu', '!help', '/help', '/menu'].includes(ctx.text.toLowerCase()),
  action: async (ctx) => {
    const menuText = 
      `🤖 *WAGate Bot Commands:*\n\n` +
      `• *!ping* - Cek status konektivitas bot\n` +
      `• *!info* - Tampilkan info profil akun ini\n` +
      `• *!menu* - Tampilkan daftar perintah ini\n\n` +
      `_Pesan dikirim secara otomatis oleh WAGate Engine._`

    await ctx.simulateTyping(800)
    await ctx.reply(menuText)
  }
}
