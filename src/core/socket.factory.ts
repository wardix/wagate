import makeWASocket from '@whiskeysockets/baileys'
import pino from 'pino'

/**
 * Factory standar untuk menginisialisasi WASocket Baileys asli
 */
export function createBaileysSocket(authState: any) {
  return makeWASocket({
    auth: authState,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    syncFullHistory: false,
    browser: ['WAGate Engine', 'Chrome', '120.0.0']
  })
}
