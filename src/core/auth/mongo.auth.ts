import {
  initAuthCreds,
  BufferJSON,
  proto,
  type AuthenticationCreds,
  type AuthenticationState,
  type SignalDataTypeMap
} from '@whiskeysockets/baileys'
import type { IAuthStateAdapter } from './auth.interface.js'

export class MongoAuthStateAdapter implements IAuthStateAdapter {
  constructor(private readonly collection: any) {}

  private getKeyId(sessionId: string, type: string, id: string): string {
    return `${sessionId}_${type}-${id}`
  }

  private getCredsId(sessionId: string): string {
    return `${sessionId}_creds`
  }

  async getAuthState(sessionId: string): Promise<{
    state: AuthenticationState
    saveCreds: () => Promise<void>
  }> {
    const credsId = this.getCredsId(sessionId)
    const existingCredsDoc = await this.collection.findOne({ _id: credsId })

    let creds: AuthenticationCreds
    if (existingCredsDoc && existingCredsDoc.data) {
      creds = JSON.parse(existingCredsDoc.data, BufferJSON.reviver)
    } else {
      creds = initAuthCreds()
    }

    const saveCreds = async () => {
      await this.collection.updateOne(
        { _id: credsId },
        {
          $set: {
            _id: credsId,
            sessionId,
            keyId: 'creds',
            data: JSON.stringify(creds, BufferJSON.replacer),
            updatedAt: new Date()
          }
        },
        { upsert: true }
      )
    }

    const state: AuthenticationState = {
      creds,
      keys: {
        get: async <T extends keyof SignalDataTypeMap>(
          type: T,
          ids: string[]
        ): Promise<{ [key: string]: SignalDataTypeMap[T] }> => {
          const data: { [key: string]: SignalDataTypeMap[T] } = {}
          for (const id of ids) {
            const docId = this.getKeyId(sessionId, type, id)
            const doc = await this.collection.findOne({ _id: docId })
            if (doc && doc.data) {
              let value = JSON.parse(doc.data, BufferJSON.reviver)
              if (type === 'app-state-sync-key' && value) {
                value = proto.Message.AppStateSyncKeyData.fromObject(value)
              }
              data[id] = value
            }
          }
          return data
        },
        set: async (data: any): Promise<void> => {
          for (const category in data) {
            for (const id in data[category]) {
              const value = data[category][id]
              const docId = this.getKeyId(sessionId, category, id)
              if (value) {
                await this.collection.updateOne(
                  { _id: docId },
                  {
                    $set: {
                      _id: docId,
                      sessionId,
                      keyId: `${category}-${id}`,
                      data: JSON.stringify(value, BufferJSON.replacer),
                      updatedAt: new Date()
                    }
                  },
                  { upsert: true }
                )
              } else {
                await this.collection.deleteMany({ _id: docId })
              }
            }
          }
        }
      }
    }

    return { state, saveCreds }
  }

  async deleteAuthState(sessionId: string): Promise<void> {
    await this.collection.deleteMany({ sessionId })
  }

  async listSavedSessions(): Promise<string[]> {
    return await this.collection.distinct('sessionId')
  }
}
