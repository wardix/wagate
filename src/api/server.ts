import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { serveStatic } from '@hono/node-server/serve-static'
import fs from 'fs'
import { createSessionRouter } from './routes/session.routes.js'
import { createMessageRouter } from './routes/message.routes.js'
import { createQueueRouter } from './routes/queue.routes.js'
import type { SessionManager } from '../core/session.manager.js'
import type { MessageStore } from '../database/message.store.js'

export function createServer(sessionManager: SessionManager, messageStore?: MessageStore): Hono {
  const app = new Hono()

  // Middlewares
  app.use('*', logger())
  app.use('*', cors())

  // Health check endpoint
  app.get('/health', (c) => c.json({ status: 'ok', service: 'wagate', timestamp: new Date() }))

  // Mount API routes
  app.route('/api/v1/sessions', createSessionRouter(sessionManager))
  app.route('/api/v1/sessions/:sessionId/messages', createMessageRouter(sessionManager, messageStore))
  app.route('/api/v1/sessions/:sessionId/queue', createQueueRouter(sessionManager, messageStore))

  // Sajikan Frontend React (Build dist) jika tersedia
  if (fs.existsSync('./frontend/dist')) {
    app.use('/*', serveStatic({ root: './frontend/dist' }))
    app.get('*', serveStatic({ path: './frontend/dist/index.html' }))
  } else {
    app.get('/', (c) => c.json({
      name: 'WAGate - WhatsApp Gateway & Management Dashboard',
      status: 'online',
      version: '2.6.0',
      note: 'Frontend dist belum dibuild. Jalankan "npm run build" di folder frontend/.'
    }))
  }

  return app
}
