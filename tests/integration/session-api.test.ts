import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSessionRouter } from '../../src/api/routes/session.routes.js'
import { SessionManager } from '../../src/core/session.manager.js'
import { Hono } from 'hono'

describe('Session REST API & SSE Endpoints (Hono)', () => {
  let app: Hono
  let mockSessionManager: any

  beforeEach(() => {
    mockSessionManager = {
      getAllSessions: vi.fn().mockReturnValue([
        { id: 'cs-1', status: 'CONNECTED', expectedPhone: '628123456789', user: { phone: '628123456789' } }
      ]),
      createSession: vi.fn(async (sessionId: string, expectedPhone: string) => {
        if (sessionId === 'already-exists') {
          throw new Error('Sesi dengan ID "already-exists" sudah digunakan.')
        }
        return {
          id: sessionId,
          status: 'INITIALIZING',
          expectedPhone,
          on: vi.fn(),
          off: vi.fn()
        }
      }),
      getSession: vi.fn((sessionId: string) => {
        if (sessionId === 'cs-1') {
          return {
            id: 'cs-1',
            status: 'CONNECTED',
            expectedPhone: '628123456789',
            qr: null,
            user: { id: '628123456789@s.whatsapp.net', phone: '628123456789', name: 'CS Team' },
            on: vi.fn(),
            off: vi.fn()
          }
        }
        return undefined
      }),
      hasSession: vi.fn((sessionId: string) => sessionId === 'cs-1'),
      deleteSession: vi.fn().mockResolvedValue(undefined)
    }

    app = new Hono()
    const sessionRouter = createSessionRouter(mockSessionManager as unknown as SessionManager)
    app.route('/api/v1/sessions', sessionRouter)
  })

  it('GET /api/v1/sessions: harus mengembalikan daftar semua sesi', async () => {
    const res = await app.request('/api/v1/sessions')
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.success).toBe(true)
    expect(Array.isArray(json.data)).toBe(true)
    expect(json.data).toHaveLength(1)
    expect(json.data[0].id).toBe('cs-1')
  })

  it('POST /api/v1/sessions: harus menolak jika sessionId atau expectedPhone kosong', async () => {
    const res = await app.request('/api/v1/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: 'new-cs' }) // Tanpa expectedPhone
    })

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.success).toBe(false)
  })

  it('POST /api/v1/sessions: harus berhasil mendaftarkan sesi baru jika input valid', async () => {
    const res = await app.request('/api/v1/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: 'new-cs', expectedPhone: '08123456789' })
    })

    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.id).toBe('new-cs')
    expect(mockSessionManager.createSession).toHaveBeenCalledWith('new-cs', '08123456789')
  })

  it('GET /api/v1/sessions/:id/status: harus mengembalikan status spesifik sesi', async () => {
    const res = await app.request('/api/v1/sessions/cs-1/status')
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.status).toBe('CONNECTED')
    expect(json.data.user.name).toBe('CS Team')
  })

  it('GET /api/v1/sessions/:id/status: harus 404 jika sesi tidak ditemukan', async () => {
    const res = await app.request('/api/v1/sessions/unknown-cs/status')
    expect(res.status).toBe(404)
  })

  it('DELETE /api/v1/sessions/:id: harus memanggil deleteSession', async () => {
    const res = await app.request('/api/v1/sessions/cs-1', {
      method: 'DELETE'
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(mockSessionManager.deleteSession).toHaveBeenCalledWith('cs-1')
  })
})
