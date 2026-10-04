import React from 'react'
import { MessageSquareCode, Plus, RefreshCw } from 'lucide-react'

interface NavbarProps {
  sessionCount: number
  connectedCount: number
  onAddClick: () => void
  onRefresh: () => void
  isLoading: boolean
}

export const Navbar: React.FC<NavbarProps> = ({
  sessionCount,
  connectedCount,
  onAddClick,
  onRefresh,
  isLoading
}) => {
  return (
    <header className="border-b border-[#202c33] bg-[#111b21] px-6 py-4 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-inner">
            <MessageSquareCode className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold tracking-tight text-white">WAGate</h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium border border-emerald-500/30">
                v2.6
              </span>
            </div>
            <p className="text-xs text-gray-400">Multi-Session WhatsApp Gateway & Engine</p>
          </div>
        </div>

        {/* Stats & Actions */}
        <div className="flex items-center space-x-4">
          <div className="hidden sm:flex items-center space-x-3 bg-[#202c33] px-3 py-1.5 rounded-lg border border-[#2a3942] text-xs">
            <span className="text-gray-400">Total Sesi: <strong className="text-white">{sessionCount}</strong></span>
            <span className="text-gray-600">|</span>
            <span className="text-gray-400">Terhubung: <strong className="text-emerald-400">{connectedCount}</strong></span>
          </div>

          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 rounded-lg bg-[#202c33] hover:bg-[#2a3942] text-gray-300 transition-colors border border-[#2a3942]"
            title="Muat Ulang Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          <button
            onClick={onAddClick}
            className="flex items-center space-x-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium text-sm transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Akun</span>
          </button>
        </div>
      </div>
    </header>
  )
}
