import type { WASocket, AnyMessageContent, MiscMessageGenerationOptions } from '@whiskeysockets/baileys'

/**
 * Normalisasi format nomor atau JID
 * Contoh input: '08123456789' -> '628123456789@s.whatsapp.net'
 */
export function formatJid(target: string): string {
  if (target.endsWith('@s.whatsapp.net') || target.endsWith('@g.us')) {
    return target
  }
  let cleanNumber = target.replace(/[^0-9]/g, '')
  if (cleanNumber.startsWith('0')) {
    cleanNumber = '62' + cleanNumber.substring(1)
  }
  return `${cleanNumber}@s.whatsapp.net`
}

export class MessageSender {
  constructor(private sock: WASocket) {}

  /**
   * Mengirim pesan teks biasa atau membalas pesan sebelumnya
   */
  async sendText(to: string, text: string, options?: MiscMessageGenerationOptions) {
    const jid = formatJid(to)
    return await this.sock.sendMessage(jid, { text }, options)
  }

  /**
   * Mengirim media gambar
   */
  async sendImage(to: string, imageUrlOrBuffer: string | Buffer, caption?: string, options?: MiscMessageGenerationOptions) {
    const jid = formatJid(to)
    const content = typeof imageUrlOrBuffer === 'string' 
      ? { url: imageUrlOrBuffer } 
      : imageUrlOrBuffer

    return await this.sock.sendMessage(jid, {
      image: content,
      caption: caption || ''
    }, options)
  }

  /**
   * Mengirim dokumen (PDF, Docx, Zip, dll)
   */
  async sendDocument(
    to: string, 
    fileUrlOrBuffer: string | Buffer, 
    fileName: string, 
    mimetype: string,
    caption?: string,
    options?: MiscMessageGenerationOptions
  ) {
    const jid = formatJid(to)
    const content = typeof fileUrlOrBuffer === 'string' 
      ? { url: fileUrlOrBuffer } 
      : fileUrlOrBuffer

    return await this.sock.sendMessage(jid, {
      document: content,
      fileName,
      mimetype,
      caption: caption || ''
    }, options)
  }

  /**
   * Mengirim voice note (PTT) atau file audio
   */
  async sendAudio(to: string, audioUrlOrBuffer: string | Buffer, isVoiceNote: boolean = true) {
    const jid = formatJid(to)
    const content = typeof audioUrlOrBuffer === 'string' 
      ? { url: audioUrlOrBuffer } 
      : audioUrlOrBuffer

    return await this.sock.sendMessage(jid, {
      audio: content,
      mimetype: 'audio/mp4',
      ptt: isVoiceNote
    })
  }

  /**
   * Mengirim reaksi emoji ke pesan tertentu
   */
  async sendReaction(to: string, messageKey: any, emoji: string) {
    const jid = formatJid(to)
    return await this.sock.sendMessage(jid, {
      react: {
        text: emoji,
        key: messageKey
      }
    })
  }

  /**
   * Menampilkan efek mengetik (typing indicator) dengan jeda simulasi
   */
  async simulateTyping(to: string, durationMs: number = 1500) {
    const jid = formatJid(to)
    await this.sock.sendPresenceUpdate('composing', jid)
    await new Promise((resolve) => setTimeout(resolve, durationMs))
    await this.sock.sendPresenceUpdate('paused', jid)
  }

  /**
   * Menandai pesan sebagai telah dibaca (centang biru)
   */
  async markRead(keys: any[]) {
    await this.sock.readMessages(keys)
  }
}
