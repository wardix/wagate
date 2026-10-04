import type { ParsedMessage } from './message.parser.js'
import type { SessionInstance } from '../core/session.instance.js'

export class MessageContext {
  public readonly id: string
  public readonly from: string
  public readonly sender: string
  public readonly senderName: string
  public readonly isGroup: boolean
  public readonly text: string
  public readonly type: ParsedMessage['type']
  public readonly timestamp: number
  public readonly quoted?: ParsedMessage['quoted']
  public readonly raw: any
  public readonly sessionId: string

  constructor(
    public readonly message: ParsedMessage,
    public readonly session: SessionInstance | any
  ) {
    this.id = message.id
    this.from = message.from
    this.sender = message.sender
    this.senderName = message.senderName
    this.isGroup = message.isGroup
    this.text = message.text
    this.type = message.type
    this.timestamp = message.timestamp
    this.quoted = message.quoted
    this.raw = message.raw
    this.sessionId = session.id
  }

  /**
   * Membalas pesan pengirim dengan mengutip (quote) pesan aslinya
   */
  async reply(text: string, options: any = {}): Promise<any> {
    const socket = this.session.socket
    if (!socket) throw new Error(`Socket pada sesi "${this.sessionId}" tidak aktif.`)

    return await socket.sendMessage(
      this.from,
      { text },
      { quoted: this.raw, ...options }
    )
  }

  /**
   * Membalas pesan dengan media gambar
   */
  async replyImage(imageUrlOrBuffer: string | Buffer, caption?: string, options: any = {}): Promise<any> {
    const socket = this.session.socket
    if (!socket) throw new Error(`Socket pada sesi "${this.sessionId}" tidak aktif.`)

    const imageContent = typeof imageUrlOrBuffer === 'string'
      ? { url: imageUrlOrBuffer }
      : imageUrlOrBuffer

    return await socket.sendMessage(
      this.from,
      { image: imageContent, caption: caption || '' },
      { quoted: this.raw, ...options }
    )
  }

  /**
   * Membalas pesan dengan dokumen (PDF, Docx, Zip, dll)
   */
  async replyDocument(
    fileUrlOrBuffer: string | Buffer,
    fileName: string,
    mimetype: string,
    caption?: string,
    options: any = {}
  ): Promise<any> {
    const socket = this.session.socket
    if (!socket) throw new Error(`Socket pada sesi "${this.sessionId}" tidak aktif.`)

    const docContent = typeof fileUrlOrBuffer === 'string'
      ? { url: fileUrlOrBuffer }
      : fileUrlOrBuffer

    return await socket.sendMessage(
      this.from,
      { document: docContent, fileName, mimetype, caption: caption || '' },
      { quoted: this.raw, ...options }
    )
  }

  /**
   * Mengirim reaksi emoji ke pesan pengirim
   */
  async react(emoji: string): Promise<any> {
    const socket = this.session.socket
    if (!socket) throw new Error(`Socket pada sesi "${this.sessionId}" tidak aktif.`)

    return await socket.sendMessage(this.from, {
      react: {
        text: emoji,
        key: this.raw.key
      }
    })
  }

  /**
   * Menampilkan status "Sedang Mengetik" (composing) selama beberapa milidetik
   */
  async simulateTyping(durationMs: number = 1000): Promise<void> {
    const socket = this.session.socket
    if (!socket) return

    await socket.sendPresenceUpdate('composing', this.from)
    await new Promise((resolve) => setTimeout(resolve, durationMs))
    await socket.sendPresenceUpdate('paused', this.from)
  }

  /**
   * Menandai pesan masuk sebagai telah dibaca (centang biru)
   */
  async markRead(): Promise<void> {
    const socket = this.session.socket
    if (!socket) return

    await socket.readMessages([this.raw.key])
  }
}
