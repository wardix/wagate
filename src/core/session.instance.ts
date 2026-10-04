import { EventEmitter } from 'events'
import { extractPhoneFromJid, isPhoneMatch, normalizePhone } from '../utils/phone.js'
import { parseMessage } from '../inbound/message.parser.js'
import { SafeMessageQueue } from '../outbound/message.queue.js'
import type { IAuthStateAdapter } from './auth/auth.interface.js'
import type { MessageRouter } from '../inbound/message.router.js'
import type { MessageStore } from '../database/message.store.js'

export type SessionStatus = 
  | 'INITIALIZING'
  | 'WAITING_QR'
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'REJECTED'
  | 'LOGGED_OUT'

export interface SessionUserInfo {
  id: string
  phone: string
  name?: string
  avatar?: string | null
}

export class SessionInstance extends EventEmitter {
  public status: SessionStatus = 'INITIALIZING'
  public qr: string | null = null
  public user: SessionUserInfo | null = null
  public socket: any = null
  public readonly expectedPhone: string
  public readonly queue: SafeMessageQueue

  constructor(
    public readonly id: string,
    expectedPhone: string,
    private readonly authAdapter: IAuthStateAdapter,
    private readonly socketFactory: (authState: any) => any,
    minDelayMs: number = 0,
    maxDelayMs: number = 0,
    private readonly messageRouter?: MessageRouter,
    private readonly messageStore?: MessageStore
  ) {
    super()
    this.expectedPhone = normalizePhone(expectedPhone)
    this.queue = new SafeMessageQueue(minDelayMs, maxDelayMs)
  }

  /**
   * Memulai inisialisasi socket dan memasang event listener
   */
  async start(): Promise<void> {
    const { state, saveCreds } = await this.authAdapter.getAuthState(this.id)
    this.socket = this.socketFactory(state)

    // Handle creds update
    if (this.socket.ev && typeof this.socket.ev.on === 'function') {
      this.socket.ev.on('creds.update', saveCreds)
    }

    // Handle connection update
    const onConnectionUpdate = async (update: any) => {
      const { connection, qr, lastDisconnect } = update

      if (qr) {
        this.qr = qr
        this.status = 'WAITING_QR'
        this.emit('status', { status: this.status, qr: this.qr })
      }

      if (connection === 'open') {
        const rawId = this.socket.user?.id || ''
        const userName = this.socket.user?.name || ''
        const authenticatedPhone = extractPhoneFromJid(rawId)

        // STRICT PHONE VERIFICATION CHECK
        if (!isPhoneMatch(this.expectedPhone, authenticatedPhone)) {
          this.status = 'REJECTED'
          this.emit('status', { 
            status: this.status, 
            error: `Nomor tidak sesuai! Diharapkan: ${this.expectedPhone}, yang memindai: ${authenticatedPhone}` 
          })

          if (typeof this.socket.logout === 'function') {
            await this.socket.logout()
          }
          await this.authAdapter.deleteAuthState(this.id)
          return
        }

        // JIKA COCOK
        this.status = 'CONNECTED'
        this.qr = null
        this.user = {
          id: rawId,
          phone: authenticatedPhone,
          name: userName
        }
        this.queue.resume()
        this.emit('status', { status: this.status, user: this.user })
      }

      if (connection === 'close') {
        this.queue.pause()
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode
        if (statusCode === 401 || statusCode === 403) {
          this.status = 'LOGGED_OUT'
          await this.authAdapter.deleteAuthState(this.id)
        } else {
          this.status = 'DISCONNECTED'
        }
        this.emit('status', { status: this.status, lastDisconnect })
      }
    }

    // Handle inbound messages
    const onMessagesUpsert = async ({ messages, type }: any) => {
      if (type !== 'notify' || !Array.isArray(messages)) return

      for (const m of messages) {
        const parsed = parseMessage(m)
        if (!parsed) continue

        // Simpan ke message store jika tersedia
        if (this.messageStore) {
          await this.messageStore.saveMessage({
            sessionId: this.id,
            messageId: parsed.id,
            direction: m.key.fromMe ? 'outbound' : 'inbound',
            from: parsed.from,
            to: this.user?.id || this.expectedPhone,
            senderName: parsed.senderName,
            isGroup: parsed.isGroup,
            text: parsed.text,
            type: parsed.type,
            status: m.key.fromMe ? 'sent' : 'delivered',
            createdAt: new Date()
          }).catch(() => {})
        }

        // Kirim ke message router untuk dievaluasi oleh handler
        if (this.messageRouter && !m.key.fromMe) {
          await this.messageRouter.dispatch(parsed, this).catch((err) => {
            console.error(`[SessionInstance:${this.id}] Error pada message router:`, err)
          })
        }
      }
    }

    // Handle receipts update (centang dua dan centang biru)
    const onReceiptUpdate = async (receipts: any[]) => {
      if (!this.messageStore || !Array.isArray(receipts)) return
      for (const r of receipts) {
        const messageId = r.key?.id
        if (!messageId) continue
        const status = r.receipt?.readTimestamp ? 'read' : 'delivered'
        await this.messageStore.updateMessageStatus(messageId, status).catch(() => {})
      }
    }

    // Pasang listener pada event emitter Baileys
    if (this.socket.ev && typeof this.socket.ev.on === 'function') {
      this.socket.ev.on('connection.update', onConnectionUpdate)
      this.socket.ev.on('messages.upsert', onMessagesUpsert)
      this.socket.ev.on('message-receipt.update', onReceiptUpdate)
    } else if (typeof this.socket.on === 'function') {
      this.socket.on('connection.update', onConnectionUpdate)
      this.socket.on('messages.upsert', onMessagesUpsert)
      this.socket.on('message-receipt.update', onReceiptUpdate)
    }
  }

  /**
   * Menutup socket dan membersihkan listener
   */
  async stop(): Promise<void> {
    this.status = 'DISCONNECTED'
    this.queue.pause()
    if (this.socket) {
      if (typeof this.socket.end === 'function') {
        this.socket.end()
      }
    }
    this.removeAllListeners()
  }

  /**
   * Menutup socket lama dan menginisialisasi ulang koneksi baru (misal untuk QR baru)
   */
  async restart(): Promise<void> {
    if (this.socket) {
      if (typeof this.socket.end === 'function') {
        try {
          this.socket.end()
        } catch {}
      }
    }
    this.status = 'INITIALIZING'
    this.qr = null
    this.user = null
    await this.start()
  }
}
