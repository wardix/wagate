import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { SessionManager } from '../../core/session.manager.js'

export function createSessionRouter(sessionManager: SessionManager): Hono {
  const router = new Hono()

  /**
   * GET /api/v1/sessions
   * Mengambil daftar seluruh sesi aktif
   */
  router.get('/', (c) => {
    const list = sessionManager.getAllSessions()
    return c.json({ success: true, data: list })
  })

  /**
   * POST /api/v1/sessions
   * Membuat dan mendaftarkan sesi baru dengan verifikasi nomor ketat
   */
  router.post('/', async (c) => {
    try {
      const body = await c.req.json().catch(() => ({}))
      const { sessionId, expectedPhone } = body

      if (!sessionId || typeof sessionId !== 'string') {
        return c.json({ success: false, error: 'sessionId wajib diisi (string).' }, 400)
      }

      if (!expectedPhone || typeof expectedPhone !== 'string') {
        return c.json({ success: false, error: 'expectedPhone wajib diisi (string).' }, 400)
      }

      const session = await sessionManager.createSession(sessionId, expectedPhone)

      return c.json({
        success: true,
        data: {
          id: session.id,
          status: session.status,
          expectedPhone: session.expectedPhone,
          qr: session.qr
        }
      }, 201)
    } catch (err: any) {
      return c.json({ success: false, error: err.message }, 400)
    }
  })

  /**
   * GET /api/v1/sessions/:sessionId/status
   * Mengecek status spesifik dari satu sesi
   */
  router.get('/:sessionId/status', (c) => {
    const sessionId = c.req.param('sessionId')
    const session = sessionManager.getSession(sessionId)

    if (!session) {
      return c.json({ success: false, error: `Sesi "${sessionId}" tidak ditemukan.` }, 404)
    }

    return c.json({
      success: true,
      data: {
        id: session.id,
        status: session.status,
        expectedPhone: session.expectedPhone,
        qr: session.qr,
        user: session.user
      }
    })
  })

  /**
   * GET /api/v1/sessions/:sessionId/events
   * Server-Sent Events (SSE) untuk streaming status koneksi, QR code, dan info login
   */
  router.get('/:sessionId/events', async (c) => {
    const sessionId = c.req.param('sessionId')
    const session = sessionManager.getSession(sessionId)

    if (!session) {
      return c.json({ success: false, error: `Sesi "${sessionId}" tidak ditemukan.` }, 404)
    }

    return streamSSE(c, async (stream) => {
      // Kirim event status awal saat klien pertama kali tersambung
      await stream.writeSSE({
        event: 'init',
        data: JSON.stringify({
          id: session.id,
          status: session.status,
          expectedPhone: session.expectedPhone,
          qr: session.qr,
          user: session.user
        })
      })

      // Listener perubahan status & QR
      const onStatusUpdate = async (data: any) => {
        await stream.writeSSE({
          event: 'status',
          data: JSON.stringify(data)
        }).catch(() => {})
      }

      session.on('status', onStatusUpdate)

      // Bersihkan listener saat koneksi SSE ditutup
      stream.onAbort(() => {
        session.off('status', onStatusUpdate)
      })
    })
  })

  /**
   * DELETE /api/v1/sessions/:sessionId
   * Menghapus sesi: unlink dari WhatsApp dan bersihkan data kredensial
   */
  router.delete('/:sessionId', async (c) => {
    const sessionId = c.req.param('sessionId')
    
    if (!sessionManager.hasSession(sessionId)) {
      return c.json({ success: false, error: `Sesi "${sessionId}" tidak ditemukan.` }, 404)
    }

    await sessionManager.deleteSession(sessionId)
    return c.json({ success: true, message: `Sesi "${sessionId}" berhasil dihapus.` })
  })

  return router
}
