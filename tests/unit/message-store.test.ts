import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MessageStore, type StoredMessage } from '../../src/database/message.store.js'

describe('MessageStore (MongoDB Persistence)', () => {
  let mockCollection: any
  let memoryStore: Map<string, any>
  let messageStore: MessageStore

  beforeEach(() => {
    memoryStore = new Map()

    mockCollection = {
      insertOne: vi.fn(async (doc: any) => {
        const id = doc.queueId || doc.messageId || String(Math.random())
        memoryStore.set(id, { ...doc, _id: id })
        return { insertedId: id }
      }),
      updateOne: vi.fn(async (query: any, update: any) => {
        for (const [id, item] of memoryStore.entries()) {
          let match = true
          for (const key in query) {
            if (item[key] !== query[key]) {
              match = false
              break
            }
          }
          if (match) {
            memoryStore.set(id, { ...item, ...update.$set })
            return { matchedCount: 1, modifiedCount: 1 }
          }
        }
        return { matchedCount: 0, modifiedCount: 0 }
      }),
      updateMany: vi.fn(async (query: any, update: any) => {
        let count = 0
        for (const [id, item] of memoryStore.entries()) {
          let match = true
          for (const key in query) {
            if (item[key] !== query[key]) {
              match = false
              break
            }
          }
          if (match) {
            memoryStore.set(id, { ...item, ...update.$set })
            count++
          }
        }
        return { matchedCount: count, modifiedCount: count }
      }),
      find: vi.fn((query: any) => {
        const results: any[] = []
        for (const item of memoryStore.values()) {
          let match = true
          for (const key in query) {
            if (item[key] !== query[key]) {
              match = false
              break
            }
          }
          if (match) results.push(item)
        }
        return {
          sort: vi.fn().mockReturnThis(),
          skip: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          toArray: vi.fn().mockResolvedValue(results)
        }
      }),
      createIndex: vi.fn().mockResolvedValue('index_ok')
    }

    messageStore = new MessageStore(mockCollection)
  })

  it('harus menyimpan pesan baru dengan status queued atau sent', async () => {
    const msg: StoredMessage = {
      sessionId: 'cs-1',
      queueId: 'Q-001',
      direction: 'outbound',
      from: '628123456789@s.whatsapp.net',
      to: '628999999999@s.whatsapp.net',
      text: 'Halo dari WAGate',
      type: 'text',
      status: 'queued',
      createdAt: new Date()
    }

    await messageStore.saveMessage(msg)
    expect(mockCollection.insertOne).toHaveBeenCalledWith(msg)
    expect(memoryStore.has('Q-001')).toBe(true)
  })

  it('harus dapat membaca seluruh pesan yang sedang mengantre (status: queued)', async () => {
    await messageStore.saveMessage({
      sessionId: 'cs-1',
      queueId: 'Q-001',
      direction: 'outbound',
      from: '628123456789@s.whatsapp.net',
      to: '628999999999@s.whatsapp.net',
      text: 'Pesan 1',
      type: 'text',
      status: 'queued',
      createdAt: new Date()
    })

    const queued = await messageStore.getQueuedMessages('cs-1')
    expect(queued).toHaveLength(1)
    expect(queued[0].queueId).toBe('Q-001')
  })

  it('harus membatalkan pesan antrean tertentu saat cancelQueuedMessage dipanggil', async () => {
    await messageStore.saveMessage({
      sessionId: 'cs-1',
      queueId: 'Q-002',
      direction: 'outbound',
      from: '628123456789@s.whatsapp.net',
      to: '628999999999@s.whatsapp.net',
      text: 'Pesan akan dibatalkan',
      type: 'text',
      status: 'queued',
      createdAt: new Date()
    })

    const success = await messageStore.cancelQueuedMessage('cs-1', 'Q-002')
    expect(success).toBe(true)

    const item = memoryStore.get('Q-002')
    expect(item.status).toBe('cancelled')
  })

  it('harus dapat mengosongkan seluruh antrean akun tertentu sekaligus', async () => {
    await messageStore.saveMessage({
      sessionId: 'cs-2',
      queueId: 'Q-A',
      direction: 'outbound',
      from: '628123456789@s.whatsapp.net',
      to: '628999999999@s.whatsapp.net',
      text: 'Pesan A',
      type: 'text',
      status: 'queued',
      createdAt: new Date()
    })
    await messageStore.saveMessage({
      sessionId: 'cs-2',
      queueId: 'Q-B',
      direction: 'outbound',
      from: '628123456789@s.whatsapp.net',
      to: '628999999999@s.whatsapp.net',
      text: 'Pesan B',
      type: 'text',
      status: 'queued',
      createdAt: new Date()
    })

    const count = await messageStore.clearQueue('cs-2')
    expect(count).toBe(2)

    expect(memoryStore.get('Q-A').status).toBe('cancelled')
    expect(memoryStore.get('Q-B').status).toBe('cancelled')
  })

  it('harus memperbarui status pesan berdasarkan event receipts WhatsApp', async () => {
    await messageStore.saveMessage({
      sessionId: 'cs-1',
      messageId: 'WA-MSG-001',
      direction: 'outbound',
      from: '628123456789@s.whatsapp.net',
      to: '628999999999@s.whatsapp.net',
      text: 'Pesan terkirim',
      type: 'text',
      status: 'sent',
      createdAt: new Date()
    })

    await messageStore.updateMessageStatus('WA-MSG-001', 'read')
    expect(memoryStore.get('WA-MSG-001').status).toBe('read')
  })
})
