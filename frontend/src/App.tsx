import { useState, useEffect, useCallback } from 'react'
import { Navbar } from './components/Navbar.js'
import { SessionCard } from './components/SessionCard.js'
import { AddSessionModal } from './components/AddSessionModal.js'
import { QueueModal } from './components/QueueModal.js'
import { MessageTestModal } from './components/MessageTestModal.js'
import type { SessionSummary } from './types.js'
import { Plus, MessageSquare } from 'lucide-react'

export function App() {
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [qrModalSession, setQrModalSession] = useState<SessionSummary | null>(null)
  const [queueModalSessionId, setQueueModalSessionId] = useState<string | null>(null)
  const [testSendSessionId, setTestSendSessionId] = useState<string | null>(null)

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/sessions')
      const data = await res.json()
      if (data.success) {
        setSessions(data.data || [])
      }
    } catch (err) {
      console.error('Gagal mengambil daftar sesi:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        const res = await fetch('/api/v1/sessions')
        const data = await res.json()
        if (active && data.success) {
          setSessions(data.data || [])
        }
      } catch (err) {
        console.error('Gagal mengambil daftar sesi:', err)
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void load()
    const interval = setInterval(load, 6000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [])

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm(`Yakin ingin menghapus sesi "${sessionId}"? Akun akan di-unlink dari WhatsApp.`)) {
      return
    }

    try {
      const res = await fetch(`/api/v1/sessions/${sessionId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        fetchSessions()
      } else {
        alert(data.error || 'Gagal menghapus sesi.')
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    }
  }

  const connectedCount = sessions.filter((s) => s.status === 'CONNECTED').length

  return (
    <div className="min-h-screen bg-[#0b141a] text-[#e9edef] flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      <Navbar
        sessionCount={sessions.length}
        connectedCount={connectedCount}
        onAddClick={() => {
          setQrModalSession(null)
          setIsAddModalOpen(true)
        }}
        onRefresh={fetchSessions}
        isLoading={isLoading}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {sessions.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-[#202c33] rounded-3xl bg-[#111b21]/40 p-8">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Belum Ada Akun WhatsApp</h2>
            <p className="text-sm text-gray-400 max-w-md mb-6">
              Mulai hubungkan nomor WhatsApp Anda dengan mengklik tombol di bawah. Sistem akan meminta nomor target terlebih dahulu sebelum menghasilkan QR Code.
            </p>
            <button
              onClick={() => {
                setQrModalSession(null)
                setIsAddModalOpen(true)
              }}
              className="flex items-center space-x-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              <span>Tambah Akun WhatsApp Pertama</span>
            </button>
          </div>
        ) : (
          /* Grid of Session Cards */
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-white">Daftar Akun WhatsApp</h2>
                <p className="text-xs text-gray-400">Kelola koneksi, antrean pengiriman, dan uji coba pesan</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  onOpenQr={(selectedSession) => {
                    setQrModalSession(selectedSession)
                    setIsAddModalOpen(true)
                  }}
                  onOpenTestSend={() => setTestSendSessionId(session.id)}
                  onOpenQueue={() => setQueueModalSessionId(session.id)}
                  onDelete={handleDeleteSession}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#202c33] bg-[#111b21] py-4 text-center text-xs text-gray-500">
        <p>WAGate v2.6 • Multi-Session WhatsApp Gateway & Engine • Built with Baileys, Hono & React</p>
      </footer>

      {/* Modals */}
      <AddSessionModal
        isOpen={isAddModalOpen}
        initialSession={qrModalSession}
        onClose={() => {
          setIsAddModalOpen(false)
          setQrModalSession(null)
          fetchSessions()
        }}
        onSuccess={fetchSessions}
      />

      <QueueModal
        sessionId={queueModalSessionId}
        isOpen={Boolean(queueModalSessionId)}
        onClose={() => setQueueModalSessionId(null)}
      />

      <MessageTestModal
        sessionId={testSendSessionId}
        isOpen={Boolean(testSendSessionId)}
        onClose={() => setTestSendSessionId(null)}
      />
    </div>
  )
}

export default App
