import makeWASocket, { Browsers } from '@whiskeysockets/baileys'
import pino from 'pino'

/**
 * Factory standar untuk menginisialisasi WASocket Baileys asli
 */
export function createBaileysSocket(authState: any) {
  return makeWASocket({
    auth: authState,
    logger: pino({ level: 'warn' }),
    printQRInTerminal: false,
    syncFullHistory: false,
    browser: Browsers.ubuntu('Chrome')
  })
}
