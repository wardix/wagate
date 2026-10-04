import React, { useState, useEffect, useCallback } from 'react'
import { X, Clock, Trash2, Ban, RefreshCw } from 'lucide-react'
import type { QueuedMessage } from '../types.js'

interface QueueModalProps {
  sessionId: string | null
  isOpen: boolean
  onClose: () => void
}

export const QueueModal: React.FC<QueueModalProps> = ({ sessionId, isOpen, onClose }) => {
  const [queue, setQueue] = useState<QueuedMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  const handleClose = () => {
    setActionMessage(null)
    onClose()
  }

  const fetchQueue = useCallback(async () => {
    if (!sessionId) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/v1/sessions/${sessionId}/queue`)
      const data = await res.json()
      if (data.success) {
        setQueue(data.data || [])
      }
    } catch (err) {
      console.error('Gagal mengambil antrean:', err)
    } finally {
      setIsLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    if (!isOpen || !sessionId) return
    let active = true

    const load = async () => {
      try {
        const res = await fetch(`/api/v1/sessions/${sessionId}/queue`)
        const data = await res.json()
        if (active && data.success) {
          setQueue(data.data || [])
        }
      } catch (err) {
        console.error('Gagal mengambil antrean:', err)
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [isOpen, sessionId])

  const handleCancelMessage = async (queueId: string) => {
    if (!sessionId) return
    try {
      const res = await fetch(`/api/v1/sessions/${sessionId}/queue/${queueId}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (data.success) {
        setActionMessage(`Pesan "${queueId}" berhasil dibatalkan.`)
        fetchQueue()
      }
    } catch (err: any) {
      alert(`Gagal membatalkan: ${err.message}`)
    }
  }

  const handleClearAll = async () => {
    if (!sessionId) return
    if (!confirm('Yakin ingin membatalkan dan mengosongkan SELURUH antrean pesan untuk akun ini?')) return

    try {
      const res = await fetch(`/api/v1/sessions/${sessionId}/queue`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (data.success) {
        setActionMessage(data.message)
        fetchQueue()
      }
    } catch (err: any) {
      alert(`Gagal mengosongkan antrean: ${err.message}`)
    }
  }

  if (!isOpen || !sessionId) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#111b21] border border-[#202c33] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#202c33] bg-[#182229]">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-amber-400" />
            <h2 className="font-semibold text-white text-base">
              Antrean Pesan Keluar: <span className="text-emerald-400 font-mono">{sessionId}</span>
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchQueue}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#202c33] transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#202c33] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action message banner */}
        {actionMessage && (
          <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-6 py-2.5 text-xs text-emerald-400">
            {actionMessage}
          </div>
        )}

        {/* Content list */}
        <div className="p-6 overflow-y-auto flex-1">
          {queue.length === 0 ? (
            <div className="text-center py-12 text-gray-500 space-y-2">
              <Clock className="w-10 h-10 mx-auto text-gray-600 opacity-50" />
              <p className="text-sm">Tidak ada pesan yang sedang mengantre saat ini.</p>
              <p className="text-xs text-gray-600">Semua pesan keluar telah terkirim atau antrean kosong.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-400 pb-2 border-b border-[#202c33]">
                <span>Menampilkan <strong>{queue.length}</strong> pesan di antrean</span>
                <button
                  onClick={handleClearAll}
                  className="flex items-center space-x-1 text-rose-400 hover:text-rose-300 transition-colors font-medium cursor-pointer"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Kosongkan Semua Antrean</span>
                </button>
              </div>

              {queue.map((item: QueuedMessage) => (
                <div
                  key={item.queueId}
                  className="bg-[#182229] border border-[#202c33] p-4 rounded-xl flex items-center justify-between hover:border-[#2a3942] transition-colors"
                >
                  <div className="space-y-1 max-w-[75%]">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-semibold text-emerald-400">{item.to}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                        queued
                      </span>
                    </div>
                    <p className="text-sm text-gray-200 truncate">{item.text || '(Media / Non-text)'}</p>
                    <p className="text-[11px] text-gray-500 font-mono">ID: {item.queueId}</p>
                  </div>

                  <button
                    onClick={() => handleCancelMessage(item.queueId)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-medium transition-colors cursor-pointer"
                    title="Batalkan pesan ini dari antrean"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Batalkan</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
