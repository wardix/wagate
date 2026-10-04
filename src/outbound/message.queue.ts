import PQueue from 'p-queue'

export class SafeMessageQueue {
  private queue: PQueue
  private cancelledTasks = new Set<string>()

  constructor(
    private readonly minDelayMs: number = 1500,
    private readonly maxDelayMs: number = 3000
  ) {
    this.queue = new PQueue({ concurrency: 1 })

    // Jitter delay setelah setiap pesan terkirim
    this.queue.on('completed', async () => {
      if (this.maxDelayMs > 0) {
        const delay = Math.floor(Math.random() * (this.maxDelayMs - this.minDelayMs + 1)) + this.minDelayMs
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    })
  }

  /**
   * Menambahkan tugas pengiriman pesan ke dalam antrean
   */
  async enqueue<T>(taskId: string, task: () => Promise<T>): Promise<T | null> {
    return this.queue.add(async () => {
      // Jika tugas telah dibatalkan saat masih menunggu di antrean, lewati
      if (this.cancelledTasks.has(taskId)) {
        this.cancelledTasks.delete(taskId)
        return null
      }
      return await task()
    }) as Promise<T | null>
  }

  /**
   * Menandai taskId tertentu agar dilewati saat gilirannya tiba
   */
  cancel(taskId: string): boolean {
    this.cancelledTasks.add(taskId)
    return true
  }

  /**
   * Menjeda sementara antrean (misal saat socket terputus)
   */
  pause(): void {
    this.queue.pause()
  }

  /**
   * Melanjutkan kembali antrean (misal setelah auto-reconnect)
   */
  resume(): void {
    this.queue.start()
  }

  get size(): number {
    return this.queue.size
  }

  get pending(): number {
    return this.queue.pending
  }
}
