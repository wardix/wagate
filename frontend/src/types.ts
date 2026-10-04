export type SessionStatus = 
  | 'INITIALIZING'
  | 'WAITING_QR'
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'REJECTED'
  | 'LOGGED_OUT'

export interface SessionUserInfo {
  id: string
  phone: string
  name?: string
  avatar?: string | null
}

export interface SessionSummary {
  id: string
  status: SessionStatus
  expectedPhone: string
  user: SessionUserInfo | null
  qr: string | null
}

export interface QueuedMessage {
  queueId: string
  sessionId: string
  to: string
  text: string
  type: string
  status: string
  createdAt: string
}
