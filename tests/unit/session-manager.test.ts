import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EventEmitter } from 'events'
import { SessionManager } from '../../src/core/session.manager.js'
import type { IAuthStateAdapter } from '../../src/core/auth/auth.interface.js'

// Mock socket factory
class MockSocket extends EventEmitter {
  user: { id: string; name?: string } | null = null
  logout = vi.fn().mockResolvedValue(undefined)
  end = vi.fn()
}

describe('SessionManager & Strict Phone Verification', () => {
  let mockAuthAdapter: IAuthStateAdapter
  let sessionManager: SessionManager
  let mockSocket: MockSocket

  beforeEach(() => {
    mockSocket = new MockSocket()
    
    mockAuthAdapter = {
      getAuthState: vi.fn().mockResolvedValue({
        state: {
          creds: {} as any,
          keys: {
            get: vi.fn().mockResolvedValue({}),
            set: vi.fn().mockResolvedValue(undefined)
          }
        },
        saveCreds: vi.fn().mockResolvedValue(undefined)
      }),
      deleteAuthState: vi.fn().mockResolvedValue(undefined),
      listSavedSessions: vi.fn().mockResolvedValue([])
    }

    // Dependency injection socket factory so test doesn't connect to WhatsApp Web
    const socketFactory = vi.fn().mockReturnValue(mockSocket)

    sessionManager = new SessionManager(mockAuthAdapter, socketFactory)
  })

  it('harus berhasil mendaftarkan sesi baru dengan ID dan expectedPhone yang valid', async () => {
    const session = await sessionManager.createSession('cs-1', '08123456789')
    expect(session.id).toBe('cs-1')
    expect(session.expectedPhone).toBe('628123456789')
    expect(sessionManager.hasSession('cs-1')).toBe(true)
  })

  it('harus menolak pembuatan sesi jika ID sesi sudah digunakan', async () => {
    await sessionManager.createSession('cs-1', '08123456789')
    await expect(sessionManager.createSession('cs-1', '08123456789')).rejects.toThrow(
      /sudah digunakan/i
    )
  })

  it('harus menyimpan QR code saat Baileys memancarkan event QR', async () => {
    const session = await sessionManager.createSession('cs-2', '08123456789')
    
    // Simulasikan Baileys mengirim QR
    mockSocket.emit('connection.update', { qr: 'mock-qr-code-string-123' })

    expect(session.status).toBe('WAITING_QR')
    expect(session.qr).toBe('mock-qr-code-string-123')
  })

  it('harus menerima koneksi jika nomor yang scan sesuai dengan expectedPhone', async () => {
    const session = await sessionManager.createSession('cs-3', '08123456789')
    
    // Set authenticated user on socket
    mockSocket.user = { id: '628123456789:2@s.whatsapp.net', name: 'Ahmad CS' }

    // Simulasikan koneksi open
    mockSocket.emit('connection.update', { connection: 'open' })

    expect(session.status).toBe('CONNECTED')
    expect(session.user?.phone).toBe('628123456789')
    expect(session.user?.name).toBe('Ahmad CS')
    expect(mockSocket.logout).not.toHaveBeenCalled()
  })

  it('STRICT VERIFICATION: harus memutuskan sesi dan memanggil logout jika nomor yang scan BERBEDA', async () => {
    const session = await sessionManager.createSession('cs-4', '08123456789')
    
    // User login dengan nomor berbeda
    mockSocket.user = { id: '628999999999:1@s.whatsapp.net', name: 'Nomor Lain' }

    // Simulasikan koneksi open
    mockSocket.emit('connection.update', { connection: 'open' })
    await new Promise((resolve) => setTimeout(resolve, 10))

    // Validasi penolakan
    expect(session.status).toBe('REJECTED')
    expect(mockSocket.logout).toHaveBeenCalled()
    expect(mockAuthAdapter.deleteAuthState).toHaveBeenCalledWith('cs-4')
  })

  it('harus dapat menghapus sesi aktif secara menyeluruh', async () => {
    await sessionManager.createSession('cs-5', '08123456789')
    expect(sessionManager.hasSession('cs-5')).toBe(true)

    await sessionManager.deleteSession('cs-5')
    expect(sessionManager.hasSession('cs-5')).toBe(false)
    expect(mockAuthAdapter.deleteAuthState).toHaveBeenCalledWith('cs-5')
  })

  it('harus dapat me-restart sesi yang terputus untuk mendapatkan koneksi/QR baru', async () => {
    const session = await sessionManager.createSession('cs-6', '08123456789')
    mockSocket.emit('connection.update', { connection: 'close' })
    expect(session.status).toBe('DISCONNECTED')

    const restarted = await sessionManager.restartSession('cs-6')
    expect(restarted.id).toBe('cs-6')
    expect(mockSocket.end).toHaveBeenCalled()
    expect(restarted.status).toBe('INITIALIZING')
  })
})
