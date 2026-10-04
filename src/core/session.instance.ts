import { EventEmitter } from 'events'
import { extractPhoneFromJid, isPhoneMatch, normalizePhone } from '../utils/phone.js'
import type { IAuthStateAdapter } from './auth/auth.interface.js'

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

  constructor(
    public readonly id: string,
    expectedPhone: string,
    private readonly authAdapter: IAuthStateAdapter,
    private readonly socketFactory: (authState: any) => any
  ) {
    super()
    this.expectedPhone = normalizePhone(expectedPhone)
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

    // Handle connection update (bisa via socket.ev atau EventEmitter langsung)
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
        this.emit('status', { status: this.status, user: this.user })
      }

      if (connection === 'close') {
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

    if (this.socket.ev && typeof this.socket.ev.on === 'function') {
      this.socket.ev.on('connection.update', onConnectionUpdate)
    } else if (typeof this.socket.on === 'function') {
      this.socket.on('connection.update', onConnectionUpdate)
    }
  }

  /**
   * Menutup socket dan membersihkan listener
   */
  async stop(): Promise<void> {
    this.status = 'DISCONNECTED'
    if (this.socket) {
      if (typeof this.socket.end === 'function') {
        this.socket.end()
      }
    }
    this.removeAllListeners()
  }
}
