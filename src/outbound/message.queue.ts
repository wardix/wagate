import PQueue from 'p-queue'

export class SafeMessageQueue {
  private queue: PQueue

  constructor(minDelayMs: number = 1000, maxDelayMs: number = 2500) {
    this.queue = new PQueue({
      concurrency: 1, // Kirim satu per satu berurutan
    })

    // Tambahkan delay acak (jitter) setelah setiap tugas selesai untuk mencegah deteksi bot
    this.queue.on('completed', async () => {
      const delay = Math.floor(Math.random() * (maxDelayMs - minDelayMs + 1)) + minDelayMs
      await new Promise((resolve) => setTimeout(resolve, delay))
    })
  }

  /**
   * Menambahkan tugas pengiriman pesan ke dalam antrean
   */
  async add<T>(task: () => Promise<T>): Promise<T> {
    return this.queue.add(task) as Promise<T>
  }

  /**
   * Mendapatkan ukuran antrean saat ini
   */
  get size(): number {
    return this.queue.size
  }

  /**
   * Mendapatkan jumlah antrean yang sedang dieksekusi
   */
  get pending(): number {
    return this.queue.pending
  }
}
