import React from 'react'
import { 
  CheckCircle2, 
  AlertCircle, 
  QrCode, 
  Send, 
  Clock, 
  Trash2, 
  Phone, 
  User, 
  ShieldAlert 
} from 'lucide-react'
import type { SessionSummary } from '../types.js'

interface SessionCardProps {
  session: SessionSummary
  onOpenQr: (session: SessionSummary) => void
  onOpenTestSend: (session: SessionSummary) => void
  onOpenQueue: (session: SessionSummary) => void
  onDelete: (sessionId: string) => void
}

export const SessionCard: React.FC<SessionCardProps> = ({
  session,
  onOpenQr,
  onOpenTestSend,
  onOpenQueue,
  onDelete
}) => {
  const isConnected = session.status === 'CONNECTED'
  const isRejected = session.status === 'REJECTED'

  const getStatusBadge = () => {
    switch (session.status) {
      case 'CONNECTED':
        return (
          <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Terhubung</span>
          </span>
        )
      case 'WAITING_QR':
        return (
          <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>Menunggu QR</span>
          </span>
        )
      case 'REJECTED':
        return (
          <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Nomor Ditolak</span>
          </span>
        )
      default:
        return (
          <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-500/10 text-gray-400 border border-gray-500/20">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{session.status}</span>
          </span>
        )
    }
  }

  return (
    <div className="bg-[#111b21] rounded-2xl border border-[#202c33] p-5 shadow-lg hover:border-[#2a3942] transition-all flex flex-col justify-between">
      {/* Header Info */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500/30 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </div>
            <h3 className="font-bold text-white text-base tracking-wide">{session.id}</h3>
          </div>
          {getStatusBadge()}
        </div>

        {/* Details List */}
        <div className="space-y-2.5 bg-[#182229] p-3.5 rounded-xl border border-[#202c33] mb-4 text-xs">
          <div className="flex items-center justify-between text-gray-400">
            <span className="flex items-center space-x-1.5">
              <Phone className="w-3.5 h-3.5 text-gray-500" />
              <span>Target Nomor:</span>
            </span>
            <span className="font-mono text-gray-200 font-medium">{session.expectedPhone}</span>
          </div>

          {session.user && (
            <>
              <div className="flex items-center justify-between text-gray-400">
                <span className="flex items-center space-x-1.5">
                  <User className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Nama Profil:</span>
                </span>
                <span className="text-emerald-400 font-medium">{session.user.name || 'WhatsApp User'}</span>
              </div>
              <div className="flex items-center justify-between text-gray-400">
                <span className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Nomor Aktif:</span>
                </span>
                <span className="font-mono text-emerald-300 font-medium">{session.user.phone}</span>
              </div>
            </>
          )}

          {isRejected && (
            <p className="text-rose-400 text-xs italic mt-1">
              *Nomor yang memindai QR tidak sesuai dengan target yang didaftarkan.
            </p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-[#202c33]">
        {!isConnected ? (
          <button
            onClick={() => onOpenQr(session)}
            className="col-span-2 flex items-center justify-center space-x-2 py-2 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold transition-colors"
          >
            <QrCode className="w-4 h-4" />
            <span>Pindai QR / Verifikasi</span>
          </button>
        ) : (
          <>
            <button
              onClick={() => onOpenTestSend(session)}
              className="flex items-center justify-center space-x-1.5 py-2 px-3 bg-[#202c33] hover:bg-[#2a3942] text-gray-200 rounded-lg text-xs font-medium transition-colors border border-[#2a3942]"
            >
              <Send className="w-3.5 h-3.5 text-emerald-400" />
              <span>Test Kirim</span>
            </button>

            <button
              onClick={() => onOpenQueue(session)}
              className="flex items-center justify-center space-x-1.5 py-2 px-3 bg-[#202c33] hover:bg-[#2a3942] text-gray-200 rounded-lg text-xs font-medium transition-colors border border-[#2a3942]"
            >
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Antrean</span>
            </button>
          </>
        )}

        <button
          onClick={() => onDelete(session.id)}
          className="col-span-2 flex items-center justify-center space-x-1.5 py-2 px-3 bg-rose-500/5 hover:bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg text-xs font-medium transition-colors mt-1"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Hapus Sesi / Logout</span>
        </button>
      </div>
    </div>
  )
}
