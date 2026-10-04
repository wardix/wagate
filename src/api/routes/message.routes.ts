import { Hono } from 'hono'
import { toJid } from '../../utils/phone.js'
import type { SessionManager } from '../../core/session.manager.js'
import type { MessageStore } from '../../database/message.store.js'

export function createMessageRouter(sessionManager: SessionManager, messageStore?: MessageStore): Hono {
  const router = new Hono()

  /**
   * POST /api/v1/sessions/:sessionId/messages/text
   * Mengantrikan pengiriman pesan teks
   */
  router.post('/text', async (c) => {
    const sessionId = c.req.param('sessionId')
    if (!sessionId) {
      return c.json({ success: false, error: 'sessionId wajib diisi di URL.' }, 400)
    }

    const session = sessionManager.getSession(sessionId)
    if (!session) {
      return c.json({ success: false, error: `Sesi "${sessionId}" tidak ditemukan.` }, 404)
    }

    if (session.status !== 'CONNECTED' || !session.socket) {
      return c.json({ success: false, error: `Sesi "${sessionId}" sedang tidak terhubung (${session.status}).` }, 400)
    }

    const body = await c.req.json().catch(() => ({}))
    const { to, text, simulateTyping } = body

    if (!to || typeof to !== 'string') {
      return c.json({ success: false, error: 'Tujuan pengiriman "to" wajib diisi.' }, 400)
    }

    if (!text || typeof text !== 'string') {
      return c.json({ success: false, error: 'Konten pesan "text" wajib diisi.' }, 400)
    }

    const targetJid = toJid(to)
    const queueId = `Q-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`

    // Simpan pesan ke database dengan status 'queued' jika store aktif
    if (messageStore) {
      await messageStore.saveMessage({
        sessionId,
        queueId,
        direction: 'outbound',
        from: session.user?.id || session.expectedPhone,
        to: targetJid,
        text,
        type: 'text',
        status: 'queued',
        createdAt: new Date()
      })
    }

    // Masukkan ke dalam antrean aman akun terkait
    session.queue.enqueue(queueId, async () => {
      try {
        if (simulateTyping) {
          await session.socket.sendPresenceUpdate('composing', targetJid)
          await new Promise((r) => setTimeout(r, 1000))
          await session.socket.sendPresenceUpdate('paused', targetJid)
        }

        const sent = await session.socket.sendMessage(targetJid, { text })
        const messageId = sent?.key?.id

        if (messageStore && messageId) {
          await messageStore.updateMessageStatus(messageId, 'sent')
        }

        return sent
      } catch (err: any) {
        if (messageStore) {
          const doc = await messageStore.getMessage({ queueId })
          if (doc) {
            doc.status = 'failed'
            doc.error = err.message
          }
        }
        throw err
      }
    })

    return c.json({
      success: true,
      message: 'Pesan telah masuk ke dalam antrean pengiriman',
      data: {
        queueId,
        sessionId,
        to: targetJid,
        status: 'queued'
      }
    }, 202)
  })

  /**
   * POST /api/v1/sessions/:sessionId/messages/media
   * Mengantrikan pengiriman media (gambar, dokumen, audio, video)
   */
  router.post('/media', async (c) => {
    const sessionId = c.req.param('sessionId')
    if (!sessionId) {
      return c.json({ success: false, error: 'sessionId wajib diisi di URL.' }, 400)
    }

    const session = sessionManager.getSession(sessionId)
    if (!session || session.status !== 'CONNECTED' || !session.socket) {
      return c.json({ success: false, error: `Sesi "${sessionId}" tidak aktif.` }, 400)
    }

    const body = await c.req.json().catch(() => ({}))
    const { to, type, url, caption, fileName, mimetype } = body

    if (!to || !url || !type) {
      return c.json({ success: false, error: '"to", "url", dan "type" wajib diisi.' }, 400)
    }

    const targetJid = toJid(to)
    const queueId = `Q-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`

    if (messageStore) {
      await messageStore.saveMessage({
        sessionId,
        queueId,
        direction: 'outbound',
        from: session.user?.id || session.expectedPhone,
        to: targetJid,
        text: caption || '',
        type,
        status: 'queued',
        media: { url, fileName, mimetype },
        createdAt: new Date()
      })
    }

    session.queue.enqueue(queueId, async () => {
      const contentPayload: any = {}
      if (type === 'image') contentPayload.image = { url }
      else if (type === 'video') contentPayload.video = { url }
      else if (type === 'audio') contentPayload.audio = { url }
      else if (type === 'document') contentPayload.document = { url }

      if (caption) contentPayload.caption = caption
      if (fileName) contentPayload.fileName = fileName
      if (mimetype) contentPayload.mimetype = mimetype

      const sent = await session.socket.sendMessage(targetJid, contentPayload)
      const messageId = sent?.key?.id
      if (messageStore && messageId) {
        await messageStore.updateMessageStatus(messageId, 'sent')
      }
      return sent
    })

    return c.json({
      success: true,
      message: 'Media telah masuk ke dalam antrean pengiriman',
      data: { queueId, sessionId, to: targetJid, status: 'queued' }
    }, 202)
  })

  /**
   * GET /api/v1/sessions/:sessionId/messages
   * Mengambil riwayat percakapan dari database
   */
  router.get('/', async (c) => {
    const sessionId = c.req.param('sessionId')
    if (!sessionId) {
      return c.json({ success: false, error: 'sessionId wajib diisi di URL.' }, 400)
    }

    const contact = c.req.query('contact')
    const page = parseInt(c.req.query('page') || '1', 10)
    const limit = parseInt(c.req.query('limit') || '50', 10)

    if (!messageStore) {
      return c.json({ success: true, data: [] })
    }

    const messages = await messageStore.getMessages(sessionId, { contact, page, limit })
    return c.json({ success: true, data: messages })
  })

  return router
}
