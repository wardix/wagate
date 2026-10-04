# WAGate 🚀

> Multi-Session WhatsApp Gateway & Management Dashboard built on [Baileys](https://github.com/WhiskeySockets/Baileys), [Hono](https://hono.dev), and [React](https://react.dev) + [Vite](https://vitejs.dev).

---

## 📌 Overview

**WAGate** is a lightweight, high-performance, and resource-efficient WhatsApp Gateway designed to manage multiple WhatsApp accounts concurrently without the memory overhead of headless browsers.

### ✨ Key Features
- **Multi-Session Management**: Run multiple WhatsApp numbers concurrently with isolated sockets and storage.
- **Strict Phone Verification**: Enforce pre-input of expected phone numbers before QR generation; mismatched scans are automatically rejected.
- **Pluggable Storage**: Choose between local file storage (`useMultiFileAuthState`) for quick development or MongoDB for cloud/Docker deployment.
- **Persistent Safe Queue**: Anti-ban rate-limiting queue with jitter delays, real-time inspection, and cancellation controls.
- **Message & Media Storage**: Persist chat history and automatically download inbound media with local streaming endpoints.
- **Modular Code-Based Handlers**: Clean `MessageContext` pipeline for creating auto-replies, command handlers, and webhook forwarders.
- **Modern Web Dashboard**: Real-time React + Vite dashboard powered by Server-Sent Events (SSE).
- **Test-Driven Development (TDD)**: Built with automated test suites using [Vitest](https://vitest.dev).

---

## 📖 Product Requirement Document

For detailed architecture, functional specifications, REST API contracts, and roadmap, see [PRD.md](./PRD.md).

---

## 🛠️ Tech Stack
- **Engine**: `@whiskeysockets/baileys`
- **Backend**: Hono (`@hono/node-server`)
- **Database**: MongoDB (official driver)
- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Testing**: Vitest
- **Queue**: P-Queue

---

## 📄 License
ISC
