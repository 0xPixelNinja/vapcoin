# MVP Project Report: VIT-AP Campus Coin

## 1. Executive Summary

This document defines the scope and execution plan for the "Vertical Slice" MVP of the VIT-AP Campus Coin project. The primary objective is to demonstrate a functional, production-grade blockchain loop to faculty stakeholders. This MVP will prove the team's capability to integrate Hyperledger Fabric with a modern web stack, handling real-time transactions between Students and Merchants.

## 2. MVP Objectives

1.  **Proof of Technology:** Demonstrate a working Hyperledger Fabric ledger recording immutable transactions.
2.  **Core Loop:** Successfully execute a "Mint -> Transfer -> Verify" cycle.
3.  **User Experience:** Provide a polished, mobile-responsive UI (Next.js) for Students and Merchants.
4.  **Transparency:** Visualize the blockchain "under the hood" via a custom Block Explorer for faculty review.

## 3. Scope of Work

### 3.1 In-Scope (The "Happy Path")
*   **Blockchain:** Single-node Hyperledger Fabric network (Peer + Orderer + CA).
*   **Auth:** Simple Database Authentication (Username/Password stored in Postgres).
*   **Roles:**
    *   **Admin:** Can Mint coins and view the Ledger.
    *   **Student:** Can View Balance, Scan QR, Send Coins, View History.
    *   **Merchant:** Can Generate QR, Receive Coins, View Sales History.
*   **QR System:** Camera-based scanning with a manual "Enter ID" fallback.
*   **Persistence:** PostgreSQL for user profiles and off-chain transaction caching.
*   **Hosting:** VPS with Docker Compose and SSL (required for Camera access).

### 3.2 Out-of-Scope (Post-MVP)
*   Multi-Organization Network (Multiple Peers/Orgs).
*   Complex Consensus (Raft clustering across machines).
*   University SSO / LDAP Integration.
*   Gamification, Badges, and Automated Rewards (Attendance/Library).
*   Settlement/Banking Integration.
*   Native Mobile Apps (Flutter) - Web PWA will be used instead.

## 4. Technical Architecture

### 4.1 Infrastructure (VPS)
*   **OS:** Linux (Ubuntu)
*   **Containerization:** Docker & Docker Compose
*   **Reverse Proxy:** Nginx (handling SSL termination for HTTPS)

### 4.2 Stack
*   **Blockchain:** Hyperledger Fabric (Test Network configuration adapted for persistence).
*   **Smart Contract (Chaincode):** Go 1.2X.
*   **Backend API:** Go (Gin Framework) + Fabric Gateway SDK.
*   **Database:** PostgreSQL.
*   **Frontend:** Next.js (App Router) + shadcn/ui + Tailwind CSS.

## 5. Functional Requirements (MVP)

### 5.1 Smart Contract (Chaincode)
*   `Mint(amount)`: Adds coins to the reserve.
*   `Transfer(from, to, amount)`: Moves coins between wallets.
*   `GetBalance(id)`: Returns current world state for a user.
*   `GetHistory(id)`: Returns history of a specific key.
*   `GetAllTransactions()`: (Admin only) Dumps the ledger for the explorer.

### 5.2 User Flows
1.  **Login:** User enters credentials -> System validates against Postgres -> Returns JWT.
2.  **Student Payment:**
    *   Student clicks "Pay".
    *   Scans Merchant QR (or types Merchant ID).
    *   Enters Amount.
    *   Confirms Transaction.
    *   **Result:** Blockchain updates, Student balance decreases, Merchant balance increases.
3.  **Faculty Audit:**
    *   Faculty logs in as Admin.
    *   Views "Block Explorer".
    *   Sees the Transaction Hash, Block Number, and Timestamp of the payment just made.

## 6. Implementation Roadmap

### Phase 1: Infrastructure & Blockchain
*   Setup VPS with Docker/Go.
*   Configure Fabric Network (crypto-config, genesis block).
*   Develop and Deploy `vapcoin` Chaincode (Go).
*   Test Chaincode via CLI.

### Phase 2: Backend & API
*   Setup Go Gin Server.
*   Implement Postgres User Store & Auth Middleware.
*   Integrate Fabric SDK to invoke Chaincode.
*   Create endpoints: `/login`, `/balance`, `/transfer`, `/history`.

### Phase 3: Frontend Development
*   Initialize Next.js with shadcn/ui.
*   **Student View:** Wallet Card, QR Scanner (using `react-qr-reader` or similar).
*   **Merchant View:** Dynamic QR Generator.
*   **Admin View:** Dashboard & Transaction Table.

### Phase 4: Integration & Deployment
*   Deploy to VPS.
*   Configure Nginx & SSL (Let's Encrypt).
*   End-to-End Testing (Mobile Phone -> VPS).
*   Seed Demo Data (Create 5 dummy students, 2 merchants).

## 7. Risk Management

| Risk | Mitigation |
| :--- | :--- |
| **QR Scanner fails on mobile** | Implement "Enter Merchant ID" text input as a guaranteed fallback. |
| **Fabric Network crashes** | Create a `reset-network.sh` script to wipe and restart the demo in < 2 mins. |
| **VPS Latency** | Use optimistic UI updates in Frontend (show "Success" immediately, sync later). |
| **Browser Security** | Ensure SSL is correctly configured; Camera API **will not work** on HTTP. |

## 8. Success Criteria for Demo
*   Faculty can log in as a Student on their own phone.
*   Faculty can scan a QR code projected on the screen.
*   The transaction appears on the "Admin Dashboard" screen within 5 seconds.
