import fs from 'fs/promises'
import path from 'path'
import { useMultiFileAuthState, type AuthenticationState } from '@whiskeysockets/baileys'
import type { IAuthStateAdapter } from './auth.interface.js'

export class FileAuthStateAdapter implements IAuthStateAdapter {
  constructor(private readonly baseDir: string = './sessions') {}

  private getSessionPath(sessionId: string): string {
    return path.join(this.baseDir, sessionId)
  }

  async getAuthState(sessionId: string): Promise<{
    state: AuthenticationState
    saveCreds: () => Promise<void>
  }> {
    const sessionDir = this.getSessionPath(sessionId)
    await fs.mkdir(sessionDir, { recursive: true })
    return await useMultiFileAuthState(sessionDir)
  }

  async deleteAuthState(sessionId: string): Promise<void> {
    const sessionDir = this.getSessionPath(sessionId)
    await fs.rm(sessionDir, { recursive: true, force: true }).catch(() => {})
  }

  async listSavedSessions(): Promise<string[]> {
    try {
      await fs.mkdir(this.baseDir, { recursive: true })
      const entries = await fs.readdir(this.baseDir, { withFileTypes: true })
      return entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
    } catch {
      return []
    }
  }
}
