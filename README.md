# 🃏 Sindhi Patta (29 Cards) Platform

> **A Multi-Tenant, White-Label SaaS Gaming Platform**

![Status](https://img.shields.io/badge/Status-Production%20Ready-green)
![Stack](https://img.shields.io/badge/Tech-Next.js%20%7C%20Node.js%20%7C%20Redis%20%7C%20PostgreSQL-blue)

A high-performance, server-authoritative real-time game engine implementing the **Sindhi Patta** ruleset. Built for scale, security, and financial integrity.

---

## 🚀 Quick Start

### Prerequisites
*   Node.js 18+
*   Docker & Docker Compose

### 1. Start the Platform
Run the automated startup script to install dependencies, seed the database, and launch all services:

```bash
./start-all.sh
```

### 2. Access Interfaces
*   **Player Lobby**: [http://localhost:3000](http://localhost:3000)
*   **Admin Dashboard**: [http://localhost:3000/dashboard](http://localhost:3000/dashboard)
*   **API Gateway**: [http://localhost:8080/health](http://localhost:8080/health)

### 3. Default Credentials
| Role | Email | Password |
| :--- | :--- | :--- |
| **Super Admin** | `super@admin.com` | `password123` |
| **Panel Admin** | `admin@demo.com` | `password123` |
| **Player** | `player1@demo.com` | `password123` |

---

## 🏗 Technology Stack

*   **Frontend**: Next.js 14 (App Router), Tailwind CSS, Zustand, Framer Motion
*   **Backend**: Node.js Microservices (Express/Fastify)
*   **Real-time**: Socket.IO with Redis Adapter
*   **Database**: PostgreSQL 15 (Prisma ORM)
*   **Cache/PubSub**: Redis Cluster
*   **Infrastructure**: Docker, Kubernetes-ready

---

## 📦 Service Architecture

| Service | Path | Description |
| :--- | :--- | :--- |
| **Auth Service** | `services/auth-service` | RBAC, JWT issuance, KYC, Profile management |
| **Game Service** | `services/game-service` | WebSocket server, Game Loop, Matchmaking |
| **Wallet Service** | `services/wallet-service` | Ledger management, Bet locking, Settlement |
| **API Gateway** | `services/api-gateway` | Unified entry point, Rate limiting, Proxy |
| **Database** | `packages/database` | Shared Prisma schema and migrations |
| **Game Engine** | `packages/game-engine` | Core rules, Deck, Hand Evaluation, Festival logic |

---

## 📚 Documentation

*   [**Architecture & Game Logic**](./ARCHITECTURE.md) - Deep dive into the Game Engine, Festival Modes, and Financial Model.
*   [**Deployment Guide**](./DEPLOYMENT.md) - Docker, Kubernetes strategies, and Observability.

---

## 🛡 Security Features

*   **Deterministic Shuffling**: HMAC-SHA256 based PRNG with verifiable proofs.
*   **Zero-Inflation Economy**: `Pot = Winner + Panel + Broker`. No money is minted during gameplay.
*   **Audit Trails**: Immutable ledger for every financial transaction.
*   **Role-Based Access**: Strict separation between Super Admin, Panel Admin, Brokers, and Players.

---

## 📜 License
Proprietary & Confidential.
