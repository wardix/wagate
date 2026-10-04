export type MessageStatus = 
  | 'queued' 
  | 'pending' 
  | 'sent' 
  | 'delivered' 
  | 'read' 
  | 'failed' 
  | 'cancelled'

export interface StoredMessage {
  sessionId: string
  queueId?: string
  messageId?: string
  direction: 'inbound' | 'outbound'
  from: string
  to: string
  senderName?: string
  isGroup?: boolean
  text: string
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker' | 'reaction' | 'other'
  status: MessageStatus
  media?: {
    localPath?: string
    url?: string
    mimetype?: string
    fileName?: string
    fileSize?: number
  } | null
  createdAt: Date
  sentAt?: Date
  deliveredAt?: Date
  readAt?: Date
  error?: string
}

export class MessageStore {
  constructor(private readonly collection: any) {}

  /**
   * Menyimpan pesan baru ke database MongoDB
   */
  async saveMessage(msg: StoredMessage): Promise<void> {
    await this.collection.insertOne(msg)
  }

  /**
   * Mengambil daftar pesan yang sedang mengantre (status: queued) secara berurutan (FIFO)
   */
  async getQueuedMessages(sessionId: string): Promise<StoredMessage[]> {
    return await this.collection
      .find({ sessionId, status: 'queued' })
      .sort({ createdAt: 1 })
      .toArray()
  }

  /**
   * Membatalkan satu pesan yang masih berada di antrean
   */
  async cancelQueuedMessage(sessionId: string, queueId: string): Promise<boolean> {
    const res = await this.collection.updateOne(
      { sessionId, queueId, status: 'queued' },
      { $set: { status: 'cancelled', updatedAt: new Date() } }
    )
    return (res.modifiedCount || res.matchedCount) > 0
  }

  /**
   * Mengosongkan seluruh pesan di antrean akun tertentu
   */
  async clearQueue(sessionId: string): Promise<number> {
    const res = await this.collection.updateMany(
      { sessionId, status: 'queued' },
      { $set: { status: 'cancelled', updatedAt: new Date() } }
    )
    return res.modifiedCount || 0
  }

  /**
   * Mengambil status pesan tertentu berdasarkan queueId atau messageId
   */
  async getMessage(filter: { queueId?: string; messageId?: string }): Promise<StoredMessage | null> {
    return await this.collection.findOne(filter)
  }

  /**
   * Memperbarui status pesan (misal: sent, delivered, read)
   */
  async updateMessageStatus(messageId: string, status: MessageStatus): Promise<void> {
    const updatePayload: any = { status, updatedAt: new Date() }
    if (status === 'sent') updatePayload.sentAt = new Date()
    if (status === 'delivered') updatePayload.deliveredAt = new Date()
    if (status === 'read') updatePayload.readAt = new Date()

    await this.collection.updateOne(
      { messageId },
      { $set: updatePayload }
    )
  }

  /**
   * Mengambil riwayat percakapan dengan filter kontak dan paginasi
   */
  async getMessages(sessionId: string, filter?: { contact?: string; limit?: number; page?: number }): Promise<StoredMessage[]> {
    const limit = filter?.limit || 50
    const page = filter?.page || 1
    const skip = (page - 1) * limit

    const query: any = { sessionId }
    if (filter?.contact) {
      query.$or = [{ from: filter.contact }, { to: filter.contact }]
    }

    return await this.collection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()
  }
}
