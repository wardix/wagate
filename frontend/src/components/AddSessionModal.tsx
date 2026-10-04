import React, { useState, useEffect } from 'react'
import { X, QrCode, CheckCircle2, AlertTriangle, ShieldAlert, Loader2, RefreshCw } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

export interface SessionModalTarget {
  id: string
  expectedPhone: string
  status?: string
  qr?: string | null
}

interface AddSessionModalProps {
  isOpen: boolean
  initialSession?: SessionModalTarget | null
  onClose: () => void
  onSuccess: () => void
}

export const AddSessionModal: React.FC<AddSessionModalProps> = ({
  isOpen,
  initialSession,
  onClose,
  onSuccess
}) => {
  // Input states for creating a new session
  const [inputSessionId, setInputSessionId] = useState('')
  const [inputExpectedPhone, setInputExpectedPhone] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Track session created via this modal
  const [createdSession, setCreatedSession] = useState<{ id: string; expectedPhone: string } | null>(null)

  // Real-time state during QR pairing
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [sessionStatus, setSessionStatus] = useState<string>('IDLE')
  const [connectedUser, setConnectedUser] = useState<any>(null)
  const [mismatchError, setMismatchError] = useState<string | null>(null)
  const [isRestarting, setIsRestarting] = useState(false)

  // Active target session (either existing session being re-scanned or newly created session)
  const activeSessionId = initialSession?.id || createdSession?.id || null
  const targetPhone = initialSession?.expectedPhone || createdSession?.expectedPhone || ''
  const displayQr = qrCode || initialSession?.qr || null

  const handleClose = () => {
    setInputSessionId('')
    setInputExpectedPhone('')
    setErrorMessage(null)
    setCreatedSession(null)
    setQrCode(null)
    setSessionStatus('IDLE')
    setConnectedUser(null)
    setMismatchError(null)
    setIsRestarting(false)
    onClose()
  }

  // Setup Server-Sent Events (SSE) listener when activeSessionId is present
  useEffect(() => {
    if (!activeSessionId) return

    // Jika sesi terputus atau logged out saat modal dibuka, otomatis picu restart socket
    if (initialSession && (initialSession.status === 'DISCONNECTED' || initialSession.status === 'LOGGED_OUT')) {
      void fetch(`/api/v1/sessions/${activeSessionId}/restart`, { method: 'POST' }).catch(() => {})
    }

    const eventSource = new EventSource(`/api/v1/sessions/${activeSessionId}/events`)

    eventSource.addEventListener('init', (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data.qr) setQrCode(data.qr)
        if (data.status) setSessionStatus(data.status)
        if (data.user) setConnectedUser(data.user)
      } catch {}
    })

    eventSource.addEventListener('status', (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data.qr) setQrCode(data.qr)
        if (data.status) setSessionStatus(data.status)
        if (data.user) setConnectedUser(data.user)
        if (data.error) setMismatchError(data.error)

        if (data.status === 'CONNECTED') {
          onSuccess()
        }
      } catch {}
    })

    eventSource.onerror = () => {
      eventSource.close()
    }

    return () => {
      eventSource.close()
    }
  }, [activeSessionId, initialSession, onSuccess])

  const handleSubmitNewSession = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setMismatchError(null)

    if (!inputSessionId.trim() || !inputExpectedPhone.trim()) {
      setErrorMessage('ID Sesi dan Nomor WhatsApp wajib diisi.')
      return
    }

    setIsSubmitting(true)

    try {
      const cleanId = inputSessionId.trim().toLowerCase()
      const cleanPhone = inputExpectedPhone.trim()

      const res = await fetch('/api/v1/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: cleanId,
          expectedPhone: cleanPhone
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Gagal membuat sesi baru.')
      }

      setCreatedSession({ id: cleanId, expectedPhone: cleanPhone })
      setSessionStatus('WAITING_QR')
      if (data.data?.qr) {
        setQrCode(data.data.qr)
      }
    } catch (err: any) {
      setErrorMessage(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleManualRestart = async () => {
    if (!activeSessionId) return
    setIsRestarting(true)
    setMismatchError(null)
    setQrCode(null)
    try {
      const res = await fetch(`/api/v1/sessions/${activeSessionId}/restart`, { method: 'POST' })
      const data = await res.json()
      if (data.success && data.data?.qr) {
        setQrCode(data.data.qr)
      }
    } catch (err: any) {
      console.error('Gagal me-restart sesi:', err)
    } finally {
      setIsRestarting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#111b21] border border-[#202c33] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#202c33] bg-[#182229]">
          <div className="flex items-center space-x-2">
            <QrCode className="w-5 h-5 text-emerald-400" />
            <h2 className="font-semibold text-white text-base">
              {activeSessionId ? (
                <span>Pindai QR: <span className="font-mono text-emerald-400">{activeSessionId}</span></span>
              ) : (
                'Tambah Akun WhatsApp Baru'
              )}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-[#202c33] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!activeSessionId ? (
            /* Form Input (Khusus Sesi Baru) */
            <form onSubmit={handleSubmitNewSession} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  ID Sesi / Nama Akun (Unik)
                </label>
                <input
                  type="text"
                  placeholder="contoh: cs-store, sales-jkt"
                  value={inputSessionId}
                  onChange={(e) => setInputSessionId(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#202c33] border border-[#2a3942] text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  required
                />
                <p className="text-[11px] text-gray-400 mt-1">Hanya huruf kecil, angka, strip (-), atau underscore (_).</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Nomor WhatsApp yang Ditargetkan (Strict Verification)
                </label>
                <input
                  type="text"
                  placeholder="contoh: 08123456789 atau 628123456789"
                  value={inputExpectedPhone}
                  onChange={(e) => setInputExpectedPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#202c33] border border-[#2a3942] text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors font-mono"
                  required
                />
                <p className="text-[11px] text-amber-400/90 mt-1 flex items-start space-x-1">
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>Sistem akan otomatis menolak & membatalkan sesi jika nomor yang memindai QR berbeda.</span>
                </p>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-2 disabled:opacity-50 mt-6 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Mempersiapkan QR Code...</span>
                  </>
                ) : (
                  <>
                    <QrCode className="w-4 h-4" />
                    <span>Mulai & Tampilkan QR Code</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Live QR / Pairing Screen (Sesi Baru maupun Sesi Eksis) */
            <div className="text-center py-2 space-y-4">
              {sessionStatus === 'CONNECTED' ? (
                /* SUCCESS STATE */
                <div className="py-6 space-y-3 animate-in zoom-in-95 duration-200">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Akun Berhasil Terhubung!</h3>
                  <div className="bg-[#182229] p-3 rounded-xl border border-[#202c33] max-w-xs mx-auto text-xs space-y-1">
                    <p className="text-gray-400">Nomor: <strong className="text-white font-mono">{connectedUser?.phone || targetPhone}</strong></p>
                    {connectedUser?.name && <p className="text-gray-400">Profil: <strong className="text-emerald-400">{connectedUser.name}</strong></p>}
                  </div>
                  <button
                    onClick={handleClose}
                    className="mt-4 px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Selesai & Tutup
                  </button>
                </div>
              ) : mismatchError || sessionStatus === 'REJECTED' ? (
                /* REJECTED / MISMATCH STATE */
                <div className="py-4 space-y-3 animate-in zoom-in-95 duration-200">
                  <div className="w-16 h-16 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
                    <ShieldAlert className="w-10 h-10" />
                  </div>
                  <h3 className="text-base font-bold text-rose-400">Autentikasi Ditolak!</h3>
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 text-left">
                    <p>{mismatchError || 'Nomor WhatsApp yang memindai QR berbeda dengan target nomor yang didaftarkan. Sesi otomatis dibatalkan demi keamanan.'}</p>
                  </div>
                  <button
                    onClick={handleManualRestart}
                    disabled={isRestarting}
                    className="mt-2 px-5 py-2 bg-[#202c33] hover:bg-[#2a3942] text-gray-200 rounded-xl text-xs font-medium cursor-pointer"
                  >
                    {isRestarting ? 'Menyiapkan QR Baru...' : 'Coba Lagi dengan Nomor yang Benar'}
                  </button>
                </div>
              ) : (
                /* QR DISPLAY */
                <div className="space-y-4">
                  <div className="p-4 bg-white rounded-2xl inline-block shadow-lg">
                    {displayQr ? (
                      <QRCodeSVG value={displayQr} size={220} level="M" />
                    ) : (
                      <div className="w-[220px] h-[220px] flex flex-col items-center justify-center text-gray-500 space-y-2">
                        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                        <span className="text-xs">Menunggu QR string...</span>
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-gray-300 space-y-1">
                    <p className="font-semibold text-white">
                      Pindai dengan WhatsApp nomor <span className="font-mono text-emerald-400">{targetPhone}</span>
                    </p>
                    <p className="text-gray-400 text-[11px]">Buka WhatsApp di HP &gt; Menu (⋮) &gt; Perangkat Tertaut &gt; Tautkan Perangkat</p>
                  </div>

                  {/* Tombol Muat Ulang QR */}
                  <div className="pt-2">
                    <button
                      onClick={handleManualRestart}
                      disabled={isRestarting}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-[#202c33] hover:bg-[#2a3942] text-gray-300 rounded-lg text-xs font-medium border border-[#2a3942] cursor-pointer disabled:opacity-50 transition-colors"
                      title="Minta QR code baru jika kode kedaluwarsa"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRestarting ? 'animate-spin text-emerald-400' : ''}`} />
                      <span>{isRestarting ? 'Memperbarui QR...' : 'Muat Ulang QR'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
