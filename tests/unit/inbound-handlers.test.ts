import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MessageContext } from '../../src/inbound/context.js'
import { MessageRouter } from '../../src/inbound/message.router.js'
import type { ParsedMessage } from '../../src/inbound/message.parser.js'
import type { MessageHandler } from '../../src/inbound/handler.interface.js'

describe('Inbound Action Handlers & MessageContext', () => {
  let mockSocket: any
  let mockSession: any
  let sampleParsedMsg: ParsedMessage

  beforeEach(() => {
    mockSocket = {
      sendMessage: vi.fn().mockResolvedValue({ key: { id: 'REPLY-001' } }),
      sendPresenceUpdate: vi.fn().mockResolvedValue(undefined),
      readMessages: vi.fn().mockResolvedValue(undefined)
    }

    mockSession = {
      id: 'cs-1',
      socket: mockSocket,
      queue: {
        enqueue: vi.fn((_id: string, fn: () => Promise<any>) => fn())
      }
    }

    sampleParsedMsg = {
      id: 'IN-001',
      from: '628123456789@s.whatsapp.net',
      sender: '628123456789@s.whatsapp.net',
      senderName: 'Pelanggan',
      isGroup: false,
      text: '!ping',
      type: 'text',
      timestamp: 1728000000,
      raw: {
        key: { id: 'IN-001', remoteJid: '628123456789@s.whatsapp.net', fromMe: false }
      }
    }
  })

  describe('MessageContext Helpers', () => {
    it('ctx.reply: harus mengirim balasan quote ke pengirim pesan', async () => {
      const ctx = new MessageContext(sampleParsedMsg, mockSession)
      await ctx.reply('Pong!')

      expect(mockSocket.sendMessage).toHaveBeenCalledWith(
        '628123456789@s.whatsapp.net',
        { text: 'Pong!' },
        { quoted: sampleParsedMsg.raw }
      )
    })

    it('ctx.react: harus mengirim reaksi emoji ke pesan pengirim', async () => {
      const ctx = new MessageContext(sampleParsedMsg, mockSession)
      await ctx.react('❤️')

      expect(mockSocket.sendMessage).toHaveBeenCalledWith(
        '628123456789@s.whatsapp.net',
        { react: { text: '❤️', key: sampleParsedMsg.raw.key } }
      )
    })

    it('ctx.simulateTyping: harus mengirim presence composing lalu paused', async () => {
      const ctx = new MessageContext(sampleParsedMsg, mockSession)
      await ctx.simulateTyping(50)

      expect(mockSocket.sendPresenceUpdate).toHaveBeenCalledWith('composing', '628123456789@s.whatsapp.net')
      expect(mockSocket.sendPresenceUpdate).toHaveBeenCalledWith('paused', '628123456789@s.whatsapp.net')
    })

    it('ctx.markRead: harus memanggil readMessages dengan key pesan', async () => {
      const ctx = new MessageContext(sampleParsedMsg, mockSession)
      await ctx.markRead()

      expect(mockSocket.readMessages).toHaveBeenCalledWith([sampleParsedMsg.raw.key])
    })
  })

  describe('MessageRouter Pipeline', () => {
    it('harus mengeksekusi handler yang cocok dengan matcher', async () => {
      const router = new MessageRouter()
      let pingExecuted = false

      const pingHandler: MessageHandler = {
        name: 'ping-handler',
        matcher: (ctx) => ctx.text.toLowerCase() === '!ping',
        action: async (ctx) => {
          pingExecuted = true
          await ctx.reply('Pong! 🏓')
        }
      }

      router.register(pingHandler)
      await router.dispatch(sampleParsedMsg, mockSession)

      expect(pingExecuted).toBe(true)
      expect(mockSocket.sendMessage).toHaveBeenCalled()
    })

    it('tidak boleh mengeksekusi handler jika matcher tidak cocok', async () => {
      const router = new MessageRouter()
      let orderExecuted = false

      const orderHandler: MessageHandler = {
        name: 'order-handler',
        matcher: (ctx) => ctx.text.startsWith('!order'),
        action: async () => {
          orderExecuted = true
        }
      }

      router.register(orderHandler)
      await router.dispatch(sampleParsedMsg, mockSession)

      expect(orderExecuted).toBe(false)
    })
  })
})
