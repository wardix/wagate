import dotenv from 'dotenv'

dotenv.config()

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  apiKey: process.env.API_KEY || 'secret-token-12345',
  sessionStorage: (process.env.SESSION_STORAGE || 'file') as 'file' | 'mongodb',
  sessionsDir: process.env.SESSIONS_DIR || './sessions',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/wagate',
  saveMessagesToDb: process.env.SAVE_MESSAGES_TO_DB === 'true',
  autoDownloadMedia: process.env.AUTO_DOWNLOAD_MEDIA !== 'false',
  mediaStorageDir: process.env.MEDIA_STORAGE_DIR || './storage/media',
  queueMinDelayMs: parseInt(process.env.QUEUE_MIN_DELAY_MS || '1500', 10),
  queueMaxDelayMs: parseInt(process.env.QUEUE_MAX_DELAY_MS || '3000', 10),
  webhookUrl: process.env.WEBHOOK_URL || ''
}
