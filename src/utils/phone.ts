/**
 * Membersihkan nomor telepon dan menormalisasi format lokal Indonesia (08...) ke format internasional (628...).
 */
export function normalizePhone(phone: string): string {
  if (!phone) return ''
  // Hapus semua karakter non-angka
  let cleaned = phone.replace(/[^0-9]/g, '')
  
  // Jika diawali 08, ubah menjadi 628
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1)
  }
  
  return cleaned
}

/**
 * Mengubah nomor telepon menjadi format JID WhatsApp baku.
 * Contoh: 08123456789 -> 628123456789@s.whatsapp.net
 */
export function toJid(target: string): string {
  if (!target) return ''
  if (target.endsWith('@s.whatsapp.net') || target.endsWith('@g.us')) {
    return target
  }
  const normalized = normalizePhone(target)
  return `${normalized}@s.whatsapp.net`
}

/**
 * Mengekstrak nomor telepon murni dari string JID (menghilangkan suffix device seperti :1@s.whatsapp.net).
 * Contoh: 628123456789:2@s.whatsapp.net -> 628123456789
 */
export function extractPhoneFromJid(jid: string): string {
  if (!jid) return ''
  const base = jid.split('@')[0] || ''
  const phoneOnly = base.split(':')[0] || ''
  return normalizePhone(phoneOnly)
}

/**
 * Memvalidasi apakah nomor telepon yang diharapkan cocok dengan nomor JID yang memindai QR code.
 */
export function isPhoneMatch(expectedPhone: string, scannedJidOrPhone: string): boolean {
  const normExpected = normalizePhone(expectedPhone)
  const normScanned = extractPhoneFromJid(scannedJidOrPhone)
  return Boolean(normExpected && normScanned && normExpected === normScanned)
}
