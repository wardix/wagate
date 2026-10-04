import { Hono } from 'hono'
import type { SessionManager } from '../../core/session.manager.js'
import type { MessageStore } from '../../database/message.store.js'

export function createQueueRouter(sessionManager: SessionManager, messageStore?: MessageStore): Hono {
  const router = new Hono()

  /**
   * GET /api/v1/sessions/:sessionId/queue
   * Melihat seluruh daftar pesan yang sedang mengantre
   */
  router.get('/', async (c) => {
    const sessionId = c.req.param('sessionId')
    if (!sessionId) {
      return c.json({ success: false, error: 'sessionId wajib diisi di URL.' }, 400)
    }

    if (!messageStore) {
      return c.json({ success: true, data: [] })
    }

    const queuedMessages = await messageStore.getQueuedMessages(sessionId)
    return c.json({ success: true, data: queuedMessages })
  })

  /**
   * DELETE /api/v1/sessions/:sessionId/queue/:queueId
   * Membatalkan pengiriman satu pesan di antrean
   */
  router.delete('/:queueId', async (c) => {
    const sessionId = c.req.param('sessionId')
    const queueId = c.req.param('queueId')

    if (!sessionId || !queueId) {
      return c.json({ success: false, error: 'sessionId dan queueId wajib diisi.' }, 400)
    }

    const session = sessionManager.getSession(sessionId)

    // Batalkan di memory queue worker jika sesi aktif
    if (session) {
      session.queue.cancel(queueId)
    }

    // Perbarui status menjadi 'cancelled' di database
    if (messageStore) {
      await messageStore.cancelQueuedMessage(sessionId, queueId)
    }

    return c.json({
      success: true,
      message: `Pesan dengan ID antrean "${queueId}" berhasil dibatalkan.`
    })
  })

  /**
   * DELETE /api/v1/sessions/:sessionId/queue
   * Mengosongkan seluruh antrean pesan pada akun tertentu
   */
  router.delete('/', async (c) => {
    const sessionId = c.req.param('sessionId')
    if (!sessionId) {
      return c.json({ success: false, error: 'sessionId wajib diisi di URL.' }, 400)
    }

    let clearedCount = 0
    if (messageStore) {
      clearedCount = await messageStore.clearQueue(sessionId)
    }

    return c.json({
      success: true,
      message: `Berhasil membatalkan ${clearedCount} pesan di antrean akun "${sessionId}".`
    })
  })

  return router
}
