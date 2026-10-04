import { SessionInstance, type SessionStatus, type SessionUserInfo } from './session.instance.js'
import type { IAuthStateAdapter } from './auth/auth.interface.js'
import type { MessageRouter } from '../inbound/message.router.js'
import type { MessageStore } from '../database/message.store.js'
import { normalizePhone } from '../utils/phone.js'

export interface SessionSummary {
  id: string
  status: SessionStatus
  expectedPhone: string
  user: SessionUserInfo | null
  qr: string | null
}

export class SessionManager {
  private sessions = new Map<string, SessionInstance>()

  constructor(
    private readonly authAdapter: IAuthStateAdapter,
    private readonly socketFactory: (authState: any) => any,
    private readonly minDelayMs: number = 0,
    private readonly maxDelayMs: number = 0,
    private readonly messageRouter?: MessageRouter,
    private readonly messageStore?: MessageStore
  ) {}

  /**
   * Membuat dan mendaftarkan sesi baru dengan ID dan target nomor telepon yang diharapkan
   */
  async createSession(sessionId: string, expectedPhone: string): Promise<SessionInstance> {
    if (this.sessions.has(sessionId)) {
      throw new Error(`Sesi dengan ID "${sessionId}" sudah digunakan.`)
    }

    const normPhone = normalizePhone(expectedPhone)
    if (!normPhone) {
      throw new Error('Nomor telepon yang diharapkan wajib diisi.')
    }

    const instance = new SessionInstance(
      sessionId,
      normPhone,
      this.authAdapter,
      this.socketFactory,
      this.minDelayMs,
      this.maxDelayMs,
      this.messageRouter,
      this.messageStore
    )

    this.sessions.set(sessionId, instance)

    // Mulai siklus hidup socket
    await instance.start()

    return instance
  }

  /**
   * Mengambil instance sesi berdasarkan ID
   */
  getSession(sessionId: string): SessionInstance | undefined {
    return this.sessions.get(sessionId)
  }

  /**
   * Mengecek apakah sesi dengan ID tertentu sudah terdaftar
   */
  hasSession(sessionId: string): boolean {
    return this.sessions.has(sessionId)
  }

  /**
   * Menghapus sesi: memutuskan koneksi dan membersihkan data penyimpanan
   */
  async deleteSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (session) {
      await session.stop()
      this.sessions.delete(sessionId)
    }
    await this.authAdapter.deleteAuthState(sessionId)
  }

  /**
   * Mengambil ringkasan semua sesi yang terdaftar
   */
  getAllSessions(): SessionSummary[] {
    const list: SessionSummary[] = []
    for (const session of this.sessions.values()) {
      list.push({
        id: session.id,
        status: session.status,
        expectedPhone: session.expectedPhone,
        user: session.user,
        qr: session.qr
      })
    }
    return list
  }
}
