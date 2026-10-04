import dotenv from 'dotenv'

dotenv.config()

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  apiKey: process.env.API_KEY || 'secret-token-12345',
  sessionDir: process.env.SESSION_DIR || 'auth_session',
  webhookUrl: process.env.WEBHOOK_URL || '',
  autoReadMessages: process.env.AUTO_READ_MESSAGES === 'true',
  printQrTerminal: process.env.PRINT_QR_TERMINAL !== 'false'
}
