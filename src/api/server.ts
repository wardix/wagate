import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { createSessionRouter } from './routes/session.routes.js'
import type { SessionManager } from '../core/session.manager.js'

export function createServer(sessionManager: SessionManager): Hono {
  const app = new Hono()

  // Middlewares
  app.use('*', logger())
  app.use('*', cors())

  // Health check
  app.get('/health', (c) => c.json({ status: 'ok', service: 'wagate', timestamp: new Date() }))
  app.get('/', (c) => c.json({
    name: 'WAGate - WhatsApp Gateway & Management Dashboard',
    status: 'online',
    version: '2.6.0'
  }))

  // Mount session management routes
  app.route('/api/v1/sessions', createSessionRouter(sessionManager))

  return app
}
