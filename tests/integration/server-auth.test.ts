import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createServer } from '../../src/api/server.js'
import { config } from '../../src/config/app.config.js'

describe('Server Authentication Middleware (Basic Auth + API Key)', () => {
  let app: any
  let mockSessionManager: any

  beforeEach(() => {
    config.authEnabled = true
    config.dashboardUser = 'admin'
    config.dashboardPass = 'rahasia123'
    config.apiKey = 'test-secret-token'

    mockSessionManager = {
      getAllSessions: vi.fn().mockReturnValue([])
    }

    app = createServer(mockSessionManager)
  })

  it('harus mengizinkan akses ke /health tanpa autentikasi apapun', async () => {
    const res = await app.request('/health')
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toBe('ok')
  })

  it('harus menolak akses ke endpoint yang dilindungi jika tidak menyertakan kredensial', async () => {
    const res = await app.request('/api/v1/sessions')
    expect(res.status).toBe(401)
  })

  it('harus menolak akses jika Basic Auth salah', async () => {
    const wrongAuth = 'Basic ' + Buffer.from('admin:wrongpass').toString('base64')
    const res = await app.request('/api/v1/sessions', {
      headers: { Authorization: wrongAuth }
    })
    expect(res.status).toBe(401)
  })

  it('harus mengizinkan akses jika Basic Auth benar', async () => {
    const validAuth = 'Basic ' + Buffer.from('admin:rahasia123').toString('base64')
    const res = await app.request('/api/v1/sessions', {
      headers: { Authorization: validAuth }
    })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
  })

  it('harus mengizinkan akses API jika menyertakan X-Api-Key yang valid', async () => {
    const res = await app.request('/api/v1/sessions', {
      headers: { 'x-api-key': 'test-secret-token' }
    })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
  })
})
