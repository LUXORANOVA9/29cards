# 🏗 System Architecture & Game Logic

## 1. High-Level Architecture

The system follows a **Microservices** architecture orchestrated via Docker/Kubernetes.

```mermaid
graph TD
    Client[Web Client / Mobile] --> Gateway[API Gateway]
    Gateway --> Auth[Auth Service]
    Gateway --> Wallet[Wallet Service]
    Gateway --> GameHTTP[Game Service (HTTP)]
    Client -- WebSocket --> GameWS[Game Service (Socket.IO)]
    
    GameWS -- Pub/Sub --> Redis[(Redis Cluster)]
    GameWS -- State --> Redis
    
    Auth --> DB[(PostgreSQL)]
    Wallet --> DB
    GameWS --> DB
```

---

## 2. Game Engine Algorithms

### A. Card Deck
The deck consists of **29 Cards**:
*   **Ranks**: 2, 3, 4, 5, 6, 7, 8 (in all 4 suits) + **9♥** (The Highest Card).
*   **Total**: (7 ranks * 4 suits) + 1 (9♥) = 29.

### B. Hand Evaluation Priority
1.  **TRAIL (Three of a Kind)**: Highest Priority.
    *   Example: `8♠ 8♥ 8♦` beats `7♠ 7♥ 7♦`.
2.  **NINE (Sum = 9)**: Second Priority.
    *   **Strict Rule**: Sum must be exactly 9 (e.g., `2+3+4=9`).
    *   **Tie-Breaker**: Highest visible card wins.
3.  **HIGH CARD**: Fallback.
    *   Highest single card wins.

### C. Festival Engine (State Machine)
Triggered when a **TRAIL** occurs. The game enters a 4-Phase Festival Mode:

1.  **Phase 1 (4-Card)**: Deal 4 cards, player keeps best 3.
2.  **Phase 2 (Imaginary)**: Deal 2 cards. If `Sum + X = 9` (where X is a valid rank 2-9), the hand is a "Nine".
3.  **Phase 3 (Lowest)**: Lowest hand value wins.
4.  **Phase 4 (Joker)**: The rank of the Trail card becomes the Joker.

---

## 3. Financial Integrity (Zero-Inflation)

The system ensures that no money is ever created during gameplay. The equation is always:

```
Total Pot = Winner Amount + Panel Commission + Broker Commission
```

### Settlement Flow
1.  **Betting**: Player bets are **LOCKED** (`WalletLock` table), not deducted immediately.
2.  **End Round**:
    *   Locked amounts are deducted (`balance -= amount`).
    *   **Pot** is realized.
    *   **Null Amount** (Commission) is calculated: `Pot * Null%`.
    *   **Winner Amount**: `Pot - Null Amount`.
3.  **Distribution**:
    *   Winner Wallet: `+Winner Amount`
    *   Panel Wallet: `+Null Amount - Broker Share`
    *   Broker Wallet: `+Broker Share`

This guarantees auditability and prevents "infinite money" bugs.

---

## 4. Security & Anti-Fraud

### A. Cryptographic Shuffling
*   **Algorithm**: HMAC-SHA256 based Fisher-Yates shuffle.
*   **Proof**:
    *   `Seed`: Random 32-byte hex.
    *   `ProofHash`: `SHA256(Seed + ShuffleOrder + RoundID)`.
    *   The `ProofHash` is broadcast *before* the round. The `Seed` is revealed *after* the round for verification.

### B. Multi-Tenancy
*   **Panels**: Isolated environments with unique branding and commission settings.
*   **Data Isolation**: `PanelID` is enforced on all User and Table queries.

### C. Fraud Detection
*   **FraudAlert Model**: Tracks suspicious patterns (e.g., Collusion, Chip Dumping).
*   **Severity Levels**: Low, Medium, High, Critical.
