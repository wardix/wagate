import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { basicAuth } from 'hono/basic-auth'
import { serveStatic } from '@hono/node-server/serve-static'
import fs from 'fs'
import { config } from '../config/app.config.js'
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

  // Health check endpoint (Public, tanpa autentikasi)
  app.get('/health', (c) => c.json({ status: 'ok', service: 'wagate', timestamp: new Date() }))

  // Authentication Middleware (HTTP Basic Auth & X-Api-Key)
  if (config.authEnabled) {
    const basicAuthHandler = basicAuth({
      username: config.dashboardUser,
      password: config.dashboardPass,
      realm: 'WAGate Gateway'
    })

    app.use('*', async (c, next) => {
      // Izinkan akses jika menyertakan X-Api-Key yang valid
      const apiKey = c.req.header('x-api-key')
      if (apiKey && apiKey === config.apiKey) {
        return next()
      }

      // Default gunakan Basic Auth untuk browser / dashboard
      return basicAuthHandler(c, next)
    })
  }

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
