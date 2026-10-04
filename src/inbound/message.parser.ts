import type { WAMessage, proto } from '@whiskeysockets/baileys'

export interface ParsedMessage {
  id: string
  from: string
  sender: string
  senderName: string
  isGroup: boolean
  text: string
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker' | 'reaction' | 'other'
  timestamp: number
  quoted?: {
    id?: string | null
    text?: string | null
    sender?: string | null
  }
  raw: WAMessage
}

export function parseMessage(msg: WAMessage): ParsedMessage | null {
  if (!msg.key || !msg.message) return null

  const from = msg.key.remoteJid || ''
  const isGroup = from.endsWith('@g.us')
  const sender = isGroup ? (msg.key.participant || from) : from
  const senderName = msg.pushName || 'WhatsApp User'
  const messageContent = unwrapMessage(msg.message)

  let text = ''
  let type: ParsedMessage['type'] = 'other'

  if (messageContent.conversation) {
    text = messageContent.conversation
    type = 'text'
  } else if (messageContent.extendedTextMessage) {
    text = messageContent.extendedTextMessage.text || ''
    type = 'text'
  } else if (messageContent.imageMessage) {
    text = messageContent.imageMessage.caption || ''
    type = 'image'
  } else if (messageContent.videoMessage) {
    text = messageContent.videoMessage.caption || ''
    type = 'video'
  } else if (messageContent.audioMessage) {
    type = 'audio'
  } else if (messageContent.documentMessage) {
    text = messageContent.documentMessage.caption || messageContent.documentMessage.fileName || ''
    type = 'document'
  } else if (messageContent.stickerMessage) {
    type = 'sticker'
  } else if (messageContent.reactionMessage) {
    text = messageContent.reactionMessage.text || ''
    type = 'reaction'
  }

  // Quoted message info if any
  let quoted: ParsedMessage['quoted'] = undefined
  const contextInfo = messageContent.extendedTextMessage?.contextInfo ||
    messageContent.imageMessage?.contextInfo ||
    messageContent.videoMessage?.contextInfo ||
    messageContent.documentMessage?.contextInfo

  if (contextInfo?.quotedMessage) {
    const quotedContent = unwrapMessage(contextInfo.quotedMessage)
    quoted = {
      id: contextInfo.stanzaId,
      sender: contextInfo.participant,
      text: quotedContent.conversation ||
        quotedContent.extendedTextMessage?.text ||
        quotedContent.imageMessage?.caption ||
        quotedContent.documentMessage?.caption ||
        ''
    }
  }

  return {
    id: msg.key.id || '',
    from,
    sender,
    senderName,
    isGroup,
    text: text.trim(),
    type,
    timestamp: typeof msg.messageTimestamp === 'number' 
      ? msg.messageTimestamp 
      : Number(msg.messageTimestamp || Date.now() / 1000),
    quoted,
    raw: msg
  }
}

// Helper to unwrap ephemeral, view once, or template messages
function unwrapMessage(msg: proto.IMessage): proto.IMessage {
  if (msg.ephemeralMessage?.message) {
    return unwrapMessage(msg.ephemeralMessage.message)
  }
  if (msg.viewOnceMessage?.message) {
    return unwrapMessage(msg.viewOnceMessage.message)
  }
  if (msg.viewOnceMessageV2?.message) {
    return unwrapMessage(msg.viewOnceMessageV2.message)
  }
  return msg
}
