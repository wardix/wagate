import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { createMessageRouter } from '../../src/api/routes/message.routes.js'
import { createQueueRouter } from '../../src/api/routes/queue.routes.js'

describe('Message & Queue REST API Endpoints (Hono)', () => {
  let app: Hono
  let mockSessionManager: any
  let mockMessageStore: any
  let mockSocket: any

  beforeEach(() => {
    mockSocket = {
      sendMessage: vi.fn().mockResolvedValue({ key: { id: 'WA-MSG-999' } }),
      sendPresenceUpdate: vi.fn().mockResolvedValue(undefined)
    }

    const mockSession = {
      id: 'cs-1',
      status: 'CONNECTED',
      socket: mockSocket,
      queue: {
        enqueue: vi.fn((taskId: string, fn: () => Promise<any>) => fn()),
        cancel: vi.fn().mockReturnValue(true)
      }
    }

    mockSessionManager = {
      getSession: vi.fn((sessionId: string) => {
        if (sessionId === 'cs-1') return mockSession
        return undefined
      })
    }

    mockMessageStore = {
      saveMessage: vi.fn().mockResolvedValue(undefined),
      getQueuedMessages: vi.fn().mockResolvedValue([
        { queueId: 'Q-001', to: '628123456789@s.whatsapp.net', text: 'Halo', status: 'queued' }
      ]),
      cancelQueuedMessage: vi.fn().mockResolvedValue(true),
      clearQueue: vi.fn().mockResolvedValue(3),
      updateMessageStatus: vi.fn().mockResolvedValue(undefined),
      getMessages: vi.fn().mockResolvedValue([
        { messageId: 'MSG-1', text: 'Riwayat 1', direction: 'inbound' }
      ])
    }

    app = new Hono()
    app.route('/api/v1/sessions/:sessionId/messages', createMessageRouter(mockSessionManager, mockMessageStore))
    app.route('/api/v1/sessions/:sessionId/queue', createQueueRouter(mockSessionManager, mockMessageStore))
  })

  it('POST /messages/text: harus mengantrikan pengiriman pesan dan mengembalikan HTTP 202', async () => {
    const res = await app.request('/api/v1/sessions/cs-1/messages/text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: '08123456789',
        text: 'Halo dari API!'
      })
    })

    expect(res.status).toBe(202)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.queueId).toBeDefined()
    expect(json.data.status).toBe('queued')
    expect(mockMessageStore.saveMessage).toHaveBeenCalled()
    expect(mockSocket.sendMessage).toHaveBeenCalled()
  })

  it('GET /queue: harus mengembalikan daftar pesan di antrean akun terkait', async () => {
    const res = await app.request('/api/v1/sessions/cs-1/queue')
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data).toHaveLength(1)
    expect(json.data[0].queueId).toBe('Q-001')
  })

  it('DELETE /queue/:queueId: harus membatalkan 1 pesan di antrean', async () => {
    const res = await app.request('/api/v1/sessions/cs-1/queue/Q-001', {
      method: 'DELETE'
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(mockMessageStore.cancelQueuedMessage).toHaveBeenCalledWith('cs-1', 'Q-001')
  })

  it('DELETE /queue: harus mengosongkan seluruh antrean akun terkait', async () => {
    const res = await app.request('/api/v1/sessions/cs-1/queue', {
      method: 'DELETE'
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(mockMessageStore.clearQueue).toHaveBeenCalledWith('cs-1')
  })

  it('GET /messages: harus mengembalikan riwayat chat percakapan', async () => {
    const res = await app.request('/api/v1/sessions/cs-1/messages?contact=628123456789')
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data).toHaveLength(1)
  })
})
