import { describe, it, expect, afterEach } from 'vitest'
import fs from 'fs/promises'
import path from 'path'
import { FileAuthStateAdapter } from '../../src/core/auth/file.auth.js'

describe('FileAuthStateAdapter', () => {
  const testBaseDir = path.join(process.cwd(), 'tests', 'fixtures', 'sessions')
  const adapter = new FileAuthStateAdapter(testBaseDir)

  afterEach(async () => {
    await fs.rm(testBaseDir, { recursive: true, force: true }).catch(() => {})
  })

  it('harus membuat direktori sesi dan mengembalikan auth state yang valid', async () => {
    const { state, saveCreds } = await adapter.getAuthState('test-session-1')
    expect(state).toBeDefined()
    expect(state.creds).toBeDefined()
    expect(typeof saveCreds).toBe('function')

    const exists = await fs.stat(path.join(testBaseDir, 'test-session-1')).then(() => true).catch(() => false)
    expect(exists).toBe(true)
  })

  it('harus mendaftar semua sesi yang ada di direktori', async () => {
    await adapter.getAuthState('session-a')
    await adapter.getAuthState('session-b')

    const list = await adapter.listSavedSessions()
    expect(list).toContain('session-a')
    expect(list).toContain('session-b')
  })

  it('harus menghapus folder sesi saat deleteAuthState dipanggil', async () => {
    await adapter.getAuthState('session-to-delete')
    let exists = await fs.stat(path.join(testBaseDir, 'session-to-delete')).then(() => true).catch(() => false)
    expect(exists).toBe(true)

    await adapter.deleteAuthState('session-to-delete')
    exists = await fs.stat(path.join(testBaseDir, 'session-to-delete')).then(() => true).catch(() => false)
    expect(exists).toBe(false)
  })
})
