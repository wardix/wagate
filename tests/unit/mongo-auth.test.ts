import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MongoAuthStateAdapter } from '../../src/core/auth/mongo.auth.js'

describe('MongoAuthStateAdapter', () => {
  let mockCollection: any
  let memoryStore: Map<string, any>

  beforeEach(() => {
    memoryStore = new Map()

    mockCollection = {
      findOne: vi.fn(async (query: any) => {
        return memoryStore.get(query._id) || null
      }),
      updateOne: vi.fn(async (query: any, update: any, options: any) => {
        const existing = memoryStore.get(query._id) || {}
        const updated = { ...existing, ...update.$set }
        memoryStore.set(query._id, updated)
        return { acknowledged: true }
      }),
      deleteMany: vi.fn(async (query: any) => {
        let count = 0
        for (const [key, val] of memoryStore.entries()) {
          if (val.sessionId === query.sessionId) {
            memoryStore.delete(key)
            count++
          }
        }
        return { deletedCount: count }
      }),
      distinct: vi.fn(async (field: string) => {
        const values = new Set<string>()
        for (const val of memoryStore.values()) {
          if (val[field]) values.add(val[field])
        }
        return Array.from(values)
      }),
      createIndex: vi.fn().mockResolvedValue('index_created')
    }
  })

  it('harus menginisialisasi kredensial baru jika belum ada di database', async () => {
    const adapter = new MongoAuthStateAdapter(mockCollection)
    const { state, saveCreds } = await adapter.getAuthState('test-session-mongo')

    expect(state).toBeDefined()
    expect(state.creds).toBeDefined()
    expect(typeof saveCreds).toBe('function')

    // Panggil saveCreds
    await saveCreds()
    expect(mockCollection.updateOne).toHaveBeenCalled()
    expect(memoryStore.has('test-session-mongo_creds')).toBe(true)
  })

  it('harus dapat menyimpan dan membaca keys (pre-keys / session keys)', async () => {
    const adapter = new MongoAuthStateAdapter(mockCollection)
    const { state } = await adapter.getAuthState('test-session-keys')

    // Test set keys
    await state.keys.set({
      'app-state-sync-key': {
        'key-1': { keyData: Buffer.from('test-binary-data') }
      }
    })

    // Test get keys
    const fetched = await state.keys.get('app-state-sync-key', ['key-1'])
    expect(fetched['key-1']).toBeDefined()
    expect(Buffer.isBuffer(fetched['key-1'].keyData)).toBe(true)
  })

  it('harus menghapus seluruh dokumen sesi saat deleteAuthState dipanggil', async () => {
    const adapter = new MongoAuthStateAdapter(mockCollection)
    const { saveCreds } = await adapter.getAuthState('session-to-purge')
    await saveCreds()

    expect(memoryStore.has('session-to-purge_creds')).toBe(true)

    await adapter.deleteAuthState('session-to-purge')
    expect(mockCollection.deleteMany).toHaveBeenCalledWith({ sessionId: 'session-to-purge' })
    expect(memoryStore.has('session-to-purge_creds')).toBe(false)
  })
})
