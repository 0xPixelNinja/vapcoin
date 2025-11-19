# VapCoin

VapCoin is a permissioned blockchain-based campus payment system designed for university campus. It leverages Hyperledger Fabric to provide a secure, transparent, and immutable ledger for transactions between students, merchants, and university administration.

## Project Overview

This project serves as a "Vertical Slice" MVP to demonstrate the viability of blockchain technology for campus micro-transactions. It replaces traditional database-only ledgers with a distributed ledger technology (DLT) approach, ensuring that every transaction is cryptographically signed and permanently recorded.

## Features

### Core Blockchain
- **Hyperledger Fabric v2.5**: Enterprise-grade permissioned blockchain network.
- **Smart Contracts (Chaincode)**: Written in Go, handling Mint, Transfer, and Query logic.
- **Immutable Ledger**: All transactions are permanent and traceable.

### User Roles
- **Students**:
  - View real-time wallet balance.
  - Send payments via QR code scanning or manual ID entry.
  - View personal transaction history.
- **Merchants**:
  - Generate dynamic QR codes for payments.
  - View sales history and daily settlements.
- **Administrators**:
  - Mint new coins into the reserve.
  - Distribute coins to users.
  - Monitor the entire ledger via a Block Explorer.
  - Perform system backups and restoration.

### Transparency
- **Public Verification**: Anyone can verify a transaction's validity using its unique Transaction ID (TxID) without logging in.

## Technology Stack

- **Blockchain**: Hyperledger Fabric, Docker, Go (Chaincode)
- **Backend**: Go (Gin Framework), PostgreSQL (User Data & Auth)
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Shadcn UI
- **Infrastructure**: Docker Compose

## Getting Started

### Prerequisites
- Docker & Docker Compose
- Go 1.20+
- Node.js 18+
- PostgreSQL

### Installation

1. **Start the Blockchain Network**
   Navigate to the network directory and start the Fabric network.
   ```bash
   cd network
   ./start.sh
   ```

2. **Deploy Chaincode**
   Deploy the smart contract to the channel.
   ```bash
   ./deploy_chaincode.sh
   ```

3. **Setup Backend**
   Navigate to the backend directory, install dependencies, and start the server.
   ```bash
   cd ../backend
   go mod download
   go run main.go
   ```

4. **Setup Frontend**
   Navigate to the frontend directory, install dependencies, and start the development server.
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```

5. **Access the Application**
   Open your browser and navigate to `http://localhost:3000`.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
