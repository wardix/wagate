import { serve } from '@hono/node-server'
import { MongoClient } from 'mongodb'
import { config } from './config/app.config.js'
import { FileAuthStateAdapter } from './core/auth/file.auth.js'
import { MongoAuthStateAdapter } from './core/auth/mongo.auth.js'
import { SessionManager } from './core/session.manager.js'
import { createBaileysSocket } from './core/socket.factory.js'
import { createServer } from './api/server.js'
import type { IAuthStateAdapter } from './core/auth/auth.interface.js'

async function bootstrap() {
  console.log('🚀 Memulai WAGate Engine...')

  // Inisialisasi Pluggable Storage Adapter
  let authAdapter: IAuthStateAdapter

  if (config.sessionStorage === 'mongodb') {
    console.log(`📦 Menggunakan penyimpanan sesi MongoDB: ${config.mongodbUri}`)
    const mongoClient = new MongoClient(config.mongodbUri)
    await mongoClient.connect()
    const db = mongoClient.db()
    const sessionCollection = db.collection('whatsapp_sessions')
    await sessionCollection.createIndex({ sessionId: 1, keyId: 1 }, { unique: true }).catch(() => {})
    authAdapter = new MongoAuthStateAdapter(sessionCollection)
  } else {
    console.log(`📁 Menggunakan penyimpanan sesi File Lokal: ${config.sessionsDir}`)
    authAdapter = new FileAuthStateAdapter(config.sessionsDir)
  }

  // Inisialisasi Session Manager
  const sessionManager = new SessionManager(authAdapter, createBaileysSocket)

  // Buat Hono Application
  const app = createServer(sessionManager)

  // Jalankan HTTP Server
  serve({
    fetch: app.fetch,
    port: config.port
  }, (info) => {
    console.log(`✅ WAGate Server berjalan di http://localhost:${info.port}`)
    console.log(`📡 REST API endpoint: http://localhost:${info.port}/api/v1/sessions`)
  })
}

bootstrap().catch((err) => {
  console.error('❌ Gagal menjalankan server WAGate:', err)
  process.exit(1)
})
