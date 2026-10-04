import React, { useState } from 'react'
import { X, Send, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

interface MessageTestModalProps {
  sessionId: string | null
  isOpen: boolean
  onClose: () => void
}

export const MessageTestModal: React.FC<MessageTestModalProps> = ({ sessionId, isOpen, onClose }) => {
  const [to, setTo] = useState('')
  const [text, setText] = useState('')
  const [simulateTyping, setSimulateTyping] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sessionId || !to.trim() || !text.trim()) return

    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch(`/api/v1/sessions/${sessionId}/messages/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: to.trim(),
          text: text.trim(),
          simulateTyping
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengirim pesan.')
      }

      setResult(data)
      setText('')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen || !sessionId) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#111b21] border border-[#202c33] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#202c33] bg-[#182229]">
          <div className="flex items-center space-x-2">
            <Send className="w-5 h-5 text-emerald-400" />
            <h2 className="font-semibold text-white text-base">
              Test Kirim Pesan: <span className="text-emerald-400 font-mono">{sessionId}</span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-[#202c33] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSend} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Nomor WhatsApp Tujuan
            </label>
            <input
              type="text"
              placeholder="contoh: 08123456789 atau 628123456789"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#202c33] border border-[#2a3942] text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Isi Pesan
            </label>
            <textarea
              rows={3}
              placeholder="Ketik pesan WhatsApp di sini..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#202c33] border border-[#2a3942] text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors resize-none"
              required
            />
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <input
              type="checkbox"
              id="simulateTyping"
              checked={simulateTyping}
              onChange={(e) => setSimulateTyping(e.target.checked)}
              className="w-4 h-4 rounded bg-[#202c33] border-[#2a3942] text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
            />
            <label htmlFor="simulateTyping" className="text-xs text-gray-300 cursor-pointer">
              Simulasikan efek &quot;Sedang Mengetik&quot; (1 detik) sebelum kirim
            </label>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <div>
                <p className="font-semibold">Berhasil masuk antrean pengiriman!</p>
                <p className="text-[11px] text-gray-400 font-mono mt-0.5">ID: {result.data?.queueId}</p>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-2 disabled:opacity-50 mt-4 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Mengantrikan Pesan...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Kirim Pesan Sekarang</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
