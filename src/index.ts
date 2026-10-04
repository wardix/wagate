import { serve } from '@hono/node-server'
import { MongoClient } from 'mongodb'
import { config } from './config/app.config.js'
import { FileAuthStateAdapter } from './core/auth/file.auth.js'
import { MongoAuthStateAdapter } from './core/auth/mongo.auth.js'
import { SessionManager } from './core/session.manager.js'
import { createBaileysSocket } from './core/socket.factory.js'
import { createServer } from './api/server.js'
import { MessageStore } from './database/message.store.js'
import { MessageRouter } from './inbound/message.router.js'
import { pingHandler } from './inbound/handlers/ping.handler.js'
import { menuHandler } from './inbound/handlers/menu.handler.js'
import { webhookHandler } from './inbound/handlers/webhook.handler.js'
import type { IAuthStateAdapter } from './core/auth/auth.interface.js'

async function bootstrap() {
  console.log('🚀 Memulai WAGate Engine...')

  // Inisialisasi Pluggable Storage Adapter
  let authAdapter: IAuthStateAdapter
  let messageStore: MessageStore | undefined

  if (config.sessionStorage === 'mongodb') {
    console.log(`📦 Menggunakan penyimpanan sesi MongoDB: ${config.mongodbUri}`)
    const mongoClient = new MongoClient(config.mongodbUri)
    await mongoClient.connect()
    const db = mongoClient.db()

    const sessionCollection = db.collection('whatsapp_sessions')
    await sessionCollection.createIndex({ sessionId: 1, keyId: 1 }, { unique: true }).catch(() => {})
    authAdapter = new MongoAuthStateAdapter(sessionCollection)

    const messageCollection = db.collection('whatsapp_messages')
    await messageCollection.createIndex({ sessionId: 1, createdAt: -1 }).catch(() => {})
    messageStore = new MessageStore(messageCollection)
  } else {
    console.log(`📁 Menggunakan penyimpanan sesi File Lokal: ${config.sessionsDir}`)
    authAdapter = new FileAuthStateAdapter(config.sessionsDir)
  }

  // Inisialisasi Inbound Message Router & daftarkan handlers
  const messageRouter = new MessageRouter()
  messageRouter.register(pingHandler)
  messageRouter.register(menuHandler)
  messageRouter.register(webhookHandler)

  // Inisialisasi Session Manager dengan konfigurasi delay antrean, router pesan, dan store
  const sessionManager = new SessionManager(
    authAdapter,
    createBaileysSocket,
    config.queueMinDelayMs,
    config.queueMaxDelayMs,
    messageRouter,
    messageStore
  )

  // Buat Hono Application
  const app = createServer(sessionManager, messageStore)

  // Jalankan HTTP Server
  serve({
    fetch: app.fetch,
    port: config.port
  }, (info) => {
    console.log(`✅ WAGate Server berjalan di http://localhost:${info.port}`)
    console.log(`📡 Sesi API: http://localhost:${info.port}/api/v1/sessions`)
    console.log(`📡 Pesan & Antrean: http://localhost:${info.port}/api/v1/sessions/:sessionId/messages`)
  })
}

bootstrap().catch((err) => {
  console.error('❌ Gagal menjalankan server WAGate:', err)
  process.exit(1)
})
