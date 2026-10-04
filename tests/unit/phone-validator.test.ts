import { describe, it, expect } from 'vitest'
import { 
  normalizePhone, 
  toJid, 
  extractPhoneFromJid, 
  isPhoneMatch 
} from '../../src/utils/phone.js'

describe('Phone Number Utilities & Strict Verification', () => {
  describe('normalizePhone', () => {
    it('harus mengubah awalan 08 menjadi format internasional Indonesia 628', () => {
      expect(normalizePhone('08123456789')).toBe('628123456789')
      expect(normalizePhone('089912345678')).toBe('6289912345678')
    })

    it('harus membersihkan karakter spasi, tanda tambah, strip, dan titik', () => {
      expect(normalizePhone('+62 812-3456-7890')).toBe('6281234567890')
      expect(normalizePhone('+62.813.9999.0000')).toBe('6281399990000')
      expect(normalizePhone('(0812) 3456 789')).toBe('628123456789')
    })

    it('harus mempertahankan nomor yang sudah diawali 62', () => {
      expect(normalizePhone('628123456789')).toBe('628123456789')
    })

    it('harus mendukung nomor internasional non-Indonesia', () => {
      expect(normalizePhone('+1 (555) 234-5678')).toBe('15552345678')
      expect(normalizePhone('+44 7911 123456')).toBe('447911123456')
    })
  })

  describe('toJid', () => {
    it('harus menghasilkan JID WhatsApp personal yang valid', () => {
      expect(toJid('08123456789')).toBe('628123456789@s.whatsapp.net')
      expect(toJid('628123456789')).toBe('628123456789@s.whatsapp.net')
    })

    it('harus mempertahankan string yang sudah berupa JID personal atau grup', () => {
      expect(toJid('628123456789@s.whatsapp.net')).toBe('628123456789@s.whatsapp.net')
      expect(toJid('12036302525@g.us')).toBe('12036302525@g.us')
    })
  })

  describe('extractPhoneFromJid', () => {
    it('harus mengekstrak nomor telepon murni dari JID Baileys dengan device suffix', () => {
      expect(extractPhoneFromJid('628123456789:12@s.whatsapp.net')).toBe('628123456789')
      expect(extractPhoneFromJid('628123456789:1@s.whatsapp.net')).toBe('628123456789')
    })

    it('harus mengekstrak nomor telepon murni dari JID biasa tanpa suffix', () => {
      expect(extractPhoneFromJid('628123456789@s.whatsapp.net')).toBe('628123456789')
    })
  })

  describe('isPhoneMatch (Strict Verification)', () => {
    it('harus mengembalikan true jika nomor yang diinput cocok dengan hasil scan QR', () => {
      const expected = '08123456789'
      const scannedJid = '628123456789:2@s.whatsapp.net'
      expect(isPhoneMatch(expected, scannedJid)).toBe(true)
    })

    it('harus mengembalikan true jika format input berbeda namun nomor identik', () => {
      const expected = '+62 812-3456-7890'
      const scannedJid = '6281234567890@s.whatsapp.net'
      expect(isPhoneMatch(expected, scannedJid)).toBe(true)
    })

    it('harus mengembalikan false jika nomor yang scan berbeda dengan yang didaftarkan', () => {
      const expected = '628123456789'
      const scannedJid = '628999999999:1@s.whatsapp.net'
      expect(isPhoneMatch(expected, scannedJid)).toBe(false)
    })
  })
})
