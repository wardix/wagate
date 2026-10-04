import { describe, it, expect } from 'vitest'
import { parseMessage } from '../../src/inbound/message.parser.js'
import type { WAMessage } from '@whiskeysockets/baileys'

describe('Inbound Message Parser', () => {
  it('harus mem-parsing pesan teks percakapan biasa (conversation)', () => {
    const rawMsg: WAMessage = {
      key: {
        id: 'MSG-001',
        remoteJid: '628123456789@s.whatsapp.net',
        fromMe: false
      },
      pushName: 'Budi Santoso',
      messageTimestamp: 1728000000,
      message: {
        conversation: 'Halo, saya ingin order'
      }
    }

    const parsed = parseMessage(rawMsg)
    expect(parsed).not.toBeNull()
    expect(parsed?.id).toBe('MSG-001')
    expect(parsed?.from).toBe('628123456789@s.whatsapp.net')
    expect(parsed?.sender).toBe('628123456789@s.whatsapp.net')
    expect(parsed?.senderName).toBe('Budi Santoso')
    expect(parsed?.text).toBe('Halo, saya ingin order')
    expect(parsed?.type).toBe('text')
    expect(parsed?.isGroup).toBe(false)
  })

  it('harus mem-parsing pesan teks berformat/link (extendedTextMessage) beserta referensi quoted message', () => {
    const rawMsg: WAMessage = {
      key: {
        id: 'MSG-002',
        remoteJid: '628123456789@s.whatsapp.net',
        fromMe: false
      },
      pushName: 'Siti',
      messageTimestamp: 1728000100,
      message: {
        extendedTextMessage: {
          text: 'Saya balas pesan ini',
          contextInfo: {
            stanzaId: 'MSG-QUOTED-001',
            participant: '628999999999@s.whatsapp.net',
            quotedMessage: {
              conversation: 'Pesan sebelumnya dari CS'
            }
          }
        }
      }
    }

    const parsed = parseMessage(rawMsg)
    expect(parsed?.text).toBe('Saya balas pesan ini')
    expect(parsed?.type).toBe('text')
    expect(parsed?.quoted).toBeDefined()
    expect(parsed?.quoted?.id).toBe('MSG-QUOTED-001')
    expect(parsed?.quoted?.text).toBe('Pesan sebelumnya dari CS')
  })

  it('harus mem-parsing pesan gambar beserta caption-nya', () => {
    const rawMsg: WAMessage = {
      key: {
        id: 'MSG-003',
        remoteJid: '628123456789@s.whatsapp.net',
        fromMe: false
      },
      pushName: 'Budi',
      message: {
        imageMessage: {
          caption: 'Ini bukti transfer'
        }
      }
    }

    const parsed = parseMessage(rawMsg)
    expect(parsed?.type).toBe('image')
    expect(parsed?.text).toBe('Ini bukti transfer')
  })

  it('harus mendeteksi pesan grup dan memisahkan remoteJid grup dengan sender asli (participant)', () => {
    const rawMsg: WAMessage = {
      key: {
        id: 'MSG-004',
        remoteJid: '1203630123456789@g.us',
        participant: '6281111222333@s.whatsapp.net',
        fromMe: false
      },
      pushName: 'Anggota Grup',
      message: {
        conversation: '!menu'
      }
    }

    const parsed = parseMessage(rawMsg)
    expect(parsed?.isGroup).toBe(true)
    expect(parsed?.from).toBe('1203630123456789@g.us')
    expect(parsed?.sender).toBe('6281111222333@s.whatsapp.net')
    expect(parsed?.text).toBe('!menu')
  })

  it('harus unwrap pesan viewOnceMessageV2 secara otomatis', () => {
    const rawMsg: WAMessage = {
      key: {
        id: 'MSG-005',
        remoteJid: '628123456789@s.whatsapp.net',
        fromMe: false
      },
      message: {
        viewOnceMessageV2: {
          message: {
            imageMessage: {
              caption: 'Foto sekali lihat'
            }
          }
        }
      }
    }

    const parsed = parseMessage(rawMsg)
    expect(parsed?.type).toBe('image')
    expect(parsed?.text).toBe('Foto sekali lihat')
  })
})
