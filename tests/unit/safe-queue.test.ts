import { describe, it, expect, vi } from 'vitest'
import { SafeMessageQueue } from '../../src/outbound/message.queue.js'

describe('SafeMessageQueue (Anti-Ban & Cancellation)', () => {
  it('harus mengeksekusi pesan dalam urutan FIFO', async () => {
    // Gunakan delay 0 untuk pengujian unit agar cepat
    const queue = new SafeMessageQueue(0, 0)
    const executionOrder: string[] = []

    const p1 = queue.enqueue('task-1', async () => {
      executionOrder.push('task-1')
      return 'res-1'
    })
    const p2 = queue.enqueue('task-2', async () => {
      executionOrder.push('task-2')
      return 'res-2'
    })

    await Promise.all([p1, p2])
    expect(executionOrder).toEqual(['task-1', 'task-2'])
  })

  it('harus melewati (skip) eksekusi tugas jika tugas telah dibatalkan sebelum giliran tiba', async () => {
    const queue = new SafeMessageQueue(10, 10)
    const executed: string[] = []

    // Task 1 berjalan
    const p1 = queue.enqueue('task-1', async () => {
      executed.push('task-1')
      await new Promise((r) => setTimeout(r, 20))
    })

    // Task 2 masuk antrean
    const p2 = queue.enqueue('task-2', async () => {
      executed.push('task-2')
    })

    // Batalkan task-2 saat task-1 masih berjalan
    const cancelled = queue.cancel('task-2')
    expect(cancelled).toBe(true)

    await Promise.all([p1, p2])
    expect(executed).toEqual(['task-1'])
    expect(executed).not.toContain('task-2')
  })

  it('harus dapat menjeda (pause) dan melanjutkan (resume) antrean', async () => {
    const queue = new SafeMessageQueue(0, 0)
    const executed: string[] = []

    queue.pause()

    let finished = false
    const p = queue.enqueue('paused-task', async () => {
      executed.push('paused-task')
      finished = true
    })

    // Tunggu sedikit, pastikan belum jalan karena di-pause
    await new Promise((r) => setTimeout(r, 30))
    expect(finished).toBe(false)
    expect(executed).toHaveLength(0)

    // Lanjutkan antrean
    queue.resume()
    await p
    expect(finished).toBe(true)
    expect(executed).toEqual(['paused-task'])
  })
})
