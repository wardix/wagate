import type { AuthenticationState } from '@whiskeysockets/baileys'

export interface IAuthStateAdapter {
  /**
   * Mengambil atau menginisialisasi authentication state untuk sesi tertentu
   */
  getAuthState(sessionId: string): Promise<{
    state: AuthenticationState
    saveCreds: () => Promise<void>
  }>

  /**
   * Menghapus seluruh data kredensial dan kunci sesi dari penyimpanan (disk atau DB)
   */
  deleteAuthState(sessionId: string): Promise<void>

  /**
   * Mengembalikan daftar semua sessionId yang tersimpan di penyimpanan
   */
  listSavedSessions(): Promise<string[]>
}
