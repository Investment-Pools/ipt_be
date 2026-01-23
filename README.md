# Solana NestJS Backend API

A robust backend API built with NestJS (Node.js) for managing Solana-based deposit & withdrawal operations, featuring automated queue processing, blockchain transaction verification, and comprehensive database management.

## Build Status

This badge displays the current build status of the dev branch powered by AWS CodeBuild.

![](https://codebuild.eu-central-1.amazonaws.com/badges?uuid=eyJlbmNyeXB0ZWREYXRhIjoiN3hiK2NkZkJpU3RnYmdJWDVIUGIraEFzYVdYc3gxcTJ1dUFVdXMyLzFTdWFQTG5vdmRaZmJ1ZzVvNitsQ3owRExyMHFJeXVvZWJVV2ZQcUdKYVU5T05BPSIsIml2UGFyYW1ldGVyU3BlYyI6IlRZM1ZaTDMzOGpqUnRoTXAiLCJtYXRlcmlhbFNldFNlcmlhbCI6MX0%3D&branch=dev)

**Status meanings:**
- **Green (Passing) ✅** — The latest commit on dev built successfully.
- **Red (Failing) ❌** — The build failed. Please review the CodeBuild logs.
- **Running ⏳** — A build is currently in progress.

**How it works:**
- Every push or pull request targeting the dev branch triggers an AWS CodeBuild pipeline.
- The pipeline typically runs dependency installation, tests, and project build steps.
- The badge updates automatically after each run.

**Why this matters:**
- Provides quick visibility into the health of the dev branch
- Helps catch issues early before merging or deployment
- Improves confidence for contributors and reviewers

> **Note:** If the badge is red, please fix the build before opening or merging pull requests.

## 🚀 Features

### 🔗 Solana Blockchain Integration
- Direct integration with Solana blockchain via Anchor framework
- Custom Solana program (Smart Contract) interaction
- Real-time transaction verification and status tracking

### 💸 Withdrawal Management
- Create and manage withdrawal requests
- Automatic queue processing with FIFO (First In, First Out) logic
- Batch withdrawal execution for optimal gas efficiency
- Support for both immediate and queued withdrawals

### ⏰ Automated Cron Jobs
- Scheduled queue processing every 5 minutes
- Automatic synchronization of completed requests
- Background job execution for withdrawal batches

### 📊 Database Management
- MySQL database with TypeORM for type-safe database operations
- Database migrations for schema versioning
- Entity-based data modeling with relationships

### 🔐 Security & Validation
- Input validation using class-validator
- Environment-based configuration management
- Secure transaction verification

### 📚 API Documentation
- Swagger/OpenAPI integration for interactive API documentation
- Auto-generated endpoint documentation
- Request/Response schema definitions

## 🛠 Tech Stack

### Backend Framework
- **NestJS** - Progressive Node.js framework
- **TypeScript** - Type-safe development
- **Express** - HTTP server foundation

### Database
- **MySQL** - Relational database
- **TypeORM** - Object-Relational Mapping

### Blockchain
- **Solana Web3.js** - Solana blockchain interaction
- **Anchor Framework** - Solana program interface
- **SPL Token** - Token operations

### Additional Libraries
- **@nestjs/schedule** - Cron job scheduling
- **@nestjs/config** - Configuration management
- **@nestjs/swagger** - API documentation
- **class-validator** - Input validation
- **bcrypt** - Password hashing

### Package Manager
- **npm** / **yarn**

## 📦 Installation

Clone the repository and install dependencies.

### Using npm
```bash
npm install
```

### Using yarn
```bash
yarn install
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=refi_ipt_db

# Application Configuration
PORT=3000
NODE_ENV=development

# Solana Configuration
SOLANA_RPC=https://api.mainnet-beta.solana.com
REFI_IPT_PRIVATE_KEY=your_private_key_base58
REFI_IPT_PROGRAM_ID=your_program_id
REFI_IPT_USDC_MINT=your_usdc_mint_address

# JWT Configuration (if using authentication)
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=1d
```

## 🗄️ Database Setup

### 1. Create Database

Create the MySQL database:

```sql
CREATE DATABASE refi_ipt_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Run Migrations

Execute database migrations to create tables:

```bash
# Run all pending migrations
npm run migration:run

# Show migration status
npm run migration:show

# Revert last migration (if needed)
npm run migration:revert
```

## 🏃 Running the Application

### Development Mode
```bash
npm run start:dev
```

The application will start on `http://localhost:3000` (or the port specified in `.env`)

### Production Mode
```bash
# Build the application
npm run build

# Start in production mode
npm run start:prod
```

### Watch Mode (Auto-reload on changes)
```bash
npm run start:dev
```

## 📡 API Endpoints

### Base URL
```
http://localhost:3000
```

### Swagger Documentation
Once the application is running, access the interactive API documentation at:
```
http://localhost:3000/api
```

### Available Endpoints

#### 1. Create Withdrawal Request

**Endpoint:** `POST /withdraw-requests`

**Description:** Create a new withdrawal request for a user's wallet address.

**Request Body:**
```json
{
  "volt_amount": 1000000,
  "min_volt": 100000,
  "min_usdc": 0.01,
  "time_estimate": 3.0,
  "wallet_address": "YourSolanaWalletAddress..."
}
```

**Request Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `volt_amount` | number | Yes | Amount of VOLT tokens to withdraw (in smallest unit, e.g., 1000000 = 1 VOLT) |
| `min_volt` | number | Yes | Minimum VOLT amount allowed (validation) |
| `min_usdc` | number | Yes | Minimum USDC amount allowed (validation, minimum 0.01) |
| `time_estimate` | number | Yes | Estimated processing time in days (minimum 0.1) |
| `wallet_address` | string | Yes | Solana wallet address for withdrawal |

**Success Response (200 OK):**
```json
{
  "id": 1,
  "user_id": 1,
  "wallet_address": "YourSolanaWalletAddress...",
  "volt_amount": "1000000",
  "requested_amount": "1.00",
  "exit_fee": "0.00",
  "received_amount": null,
  "estimated_time_days": 3.0,
  "pro_rata_ratio": null,
  "status": 6,
  "tx_signature": null,
  "blockchain_status": null,
  "processed_at": null,
  "_createTime": "2026-01-23T12:00:00.000Z",
  "_createUser": null,
  "_updateTime": "2026-01-23T12:00:00.000Z",
  "_updateUser": null
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Unique withdrawal request ID |
| `user_id` | number | User ID associated with the request |
| `wallet_address` | string | Solana wallet address |
| `volt_amount` | string | VOLT amount in smallest unit |
| `requested_amount` | string | Requested USDC amount |
| `exit_fee` | string | Exit fee amount (default: 0.00) |
| `received_amount` | string \| null | Amount received after processing |
| `estimated_time_days` | number | Estimated processing time in days |
| `pro_rata_ratio` | number \| null | Pro-rata ratio if applicable |
| `status` | number | Request status (6 = PENDING_TO_EXECUTE) |
| `tx_signature` | string \| null | Solana transaction signature |
| `blockchain_status` | string \| null | Blockchain transaction status |
| `processed_at` | Date \| null | Processing completion timestamp |
| `_createTime` | Date | Creation timestamp |
| `_updateTime` | Date | Last update timestamp |

**Status Codes:**
- `200 OK` - Withdrawal request created successfully
- `400 Bad Request` - Invalid input parameters
- `500 Internal Server Error` - Server error during creation

**Error Response:**
```json
{
  "statusCode": 400,
  "message": "Invalid volt amount",
  "error": "Bad Request"
}
```

---

#### 2. Save Withdrawal Request

**Endpoint:** `POST /withdraw-requests/save-withdraw-request`

**Description:** Save/update withdrawal request with transaction signature after blockchain transaction is executed.

**Request Body:**
```json
{
  "withdraw_request_id": 1,
  "tx_signature": "5j7s8K9mN2pQ4rT6vW8xY0zA1bC3dE5fG7hI9jK1lM3nO5pQ7rS9tU1vW3xY5z",
  "volt_amount": 1000000,
  "wallet_address": "YourSolanaWalletAddress..."
}
```

**Request Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `withdraw_request_id` | number | Yes | ID of the withdrawal request to update |
| `tx_signature` | string | Yes | Solana transaction signature from blockchain |
| `volt_amount` | number | Yes | VOLT amount in smallest unit (for verification) |
| `wallet_address` | string | Yes | Solana wallet address (for authorization) |

**Success Response (200 OK):**
```json
{
  "affected": 1,
  "generatedMaps": [],
  "raw": {
    "fieldCount": 0,
    "affectedRows": 1,
    "insertId": 0,
    "serverStatus": 2,
    "warningCount": 0,
    "message": "(Rows matched: 1  Changed: 1  Warnings: 0)",
    "protocol41": true,
    "changedRows": 1
  }
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `affected` | number | Number of records updated (1 if successful) |
| `generatedMaps` | array | Generated maps (usually empty) |
| `raw` | object | Raw database response details |

**Updated Fields in Database:**
- `requested_amount` - Calculated based on transaction
- `exit_fee` - Calculated withdrawal fee (2% default)
- `received_amount` - Amount received after fee deduction
- `status` - Updated based on withdrawal type:
  - `5` (COMPLETED) - For immediate withdrawals
  - `2` (PENDING_LIQUIDITY) - For queued withdrawals
- `blockchain_status` - Updated based on transaction:
  - `completed_immediate` - Immediate withdrawal completed
  - `in_queue` - Withdrawal added to queue
- `processed_at` - Timestamp when processed (for completed withdrawals)

**Status Codes:**
- `200 OK` - Withdrawal request updated successfully
- `400 Bad Request` - Invalid input parameters or unauthorized access
- `404 Not Found` - Withdrawal request not found
- `500 Internal Server Error` - Server error during update

**Error Responses:**

*Unauthorized Access:*
```json
{
  "statusCode": 400,
  "message": "Unauthorized access to withdraw request",
  "error": "Bad Request"
}
```

*Transaction Verification Failed:*
```json
{
  "statusCode": 400,
  "message": "Failed to verify transaction: Transaction failed or not found",
  "error": "Bad Request"
}
```

*Invalid Withdrawal Type:*
```json
{
  "statusCode": 400,
  "message": "Invalid withdrawal type: unknown",
  "error": "Bad Request"
}
```

---

### Status Enums

#### WithdrawRequestStatus
| Value | Status | Description |
|-------|--------|-------------|
| `1` | REQUESTED | Initial request status |
| `2` | PENDING_LIQUIDITY | Waiting for liquidity in queue |
| `3` | READY_TO_EXECUTE | Ready to be executed |
| `4` | EXECUTING | Currently being executed |
| `5` | COMPLETED | Successfully completed |
| `6` | PENDING_TO_EXECUTE | Pending execution |
| `7` | FAILED | Transaction failed |
| `8` | CANCELLED | Request cancelled |

#### WithdrawBlockchainStatus
| Value | Description |
|-------|-------------|
| `failed` | Transaction failed on blockchain |
| `pending_queue` | Pending in queue |
| `in_queue` | Currently in queue |
| `completed_immediate` | Completed immediately |
| `completed_batch` | Completed via batch processing |

## ⏰ Cron Jobs

The application includes automated cron jobs for queue processing:

### Withdraw Queue Worker
- **Schedule**: Every 5 minutes
- **Function**: Processes pending withdrawal requests in the queue
- **Features**:
  - FIFO (First In, First Out) processing
  - Batch withdrawal execution
  - Automatic status synchronization
  - Queue position tracking

### Manual Trigger (for testing)
You can manually trigger the queue processor via API endpoint (if configured):
```bash
POST /cron/test-withdraw-queue
```

## 🧪 Testing

### Unit Tests
```bash
npm run test
```

### E2E Tests
```bash
npm run test:e2e
```

### Test Coverage
```bash
npm run test:cov
```

## 📝 Available Scripts

```bash
# Development
npm run start:dev      # Start in development mode with watch
npm run start:debug    # Start in debug mode

# Production
npm run build          # Build the application
npm run start:prod     # Start in production mode

# Database
npm run migration:run   # Run pending migrations
npm run migration:show  # Show migration status
npm run migration:revert # Revert last migration

# Code Quality
npm run lint           # Run ESLint
npm run format         # Format code with Prettier
```

## 🏗️ Project Structure

```
src/
├── app.module.ts              # Root application module
├── main.ts                    # Application entry point
├── data-source.ts             # TypeORM data source configuration
├── entities/                  # Database entities
│   └── withdraw-request.entity.ts
├── migrations/                # Database migrations
│   └── 0001-create-withdraw-request.ts
├── lib/                       # Library modules
│   └── refi-ipt-blockchain.ts # Solana blockchain integration
├── withdraw/                  # Withdrawal module
│   ├── withdraw.controller.ts
│   ├── withdraw.service.ts
│   ├── withdraw.module.ts
│   └── dto/                   # Data Transfer Objects
├── cron_job/                  # Scheduled jobs
│   └── withdraw-queue.ts      # Queue processing worker
└── res/                       # Resources
    └── refi-ipt/
        └── refi_ipt.json      # Solana program IDL
```

## 🔧 Development

### Code Formatting
```bash
npm run format
```

### Linting
```bash
npm run lint
```

## 📚 Additional Resources

- [NestJS Documentation](https://docs.nestjs.com)
- [TypeORM Documentation](https://typeorm.io)
- [Solana Web3.js Documentation](https://solana-labs.github.io/solana-web3.js/)
- [Anchor Framework Documentation](https://www.anchor-lang.com/)

## 📄 License

This project is licensed under the **Apache License Version 2.0** – January 2004.

For full details, see the [LICENSE](./LICENSE) file in the root directory of this project.

### Apache License 2.0 Summary

**You are free to:**
- Use the software for any purpose
- Copy, modify, and distribute the software
- Include the software in proprietary applications

**Under the following conditions:**
- A copy of the license and copyright notice must be included with the software
- State significant changes made to the code
- Provide a copy of the license with any distribution of the software

For the complete license text, visit: [https://www.apache.org/licenses/LICENSE-2.0](https://www.apache.org/licenses/LICENSE-2.0)

### SPDX License Headers in Source Code

To comply with the Apache License 2.0 and enable automated license scanning tools, add the following SPDX license identifier header at the top of each source code file:

**For TypeScript/JavaScript files:**
```typescript
// SPDX-License-Identifier: Apache-2.0
```

**Example:**
```typescript
// SPDX-License-Identifier: Apache-2.0
import { Module } from '@nestjs/common';
// ... rest of the code
```

**For other file types:**
- **Python:** `# SPDX-License-Identifier: Apache-2.0`
- **Shell scripts:** `# SPDX-License-Identifier: Apache-2.0`
- **Configuration files:** `# SPDX-License-Identifier: Apache-2.0`

**Benefits of SPDX headers:**
- ✅ Automated license scanners can easily identify the license
- ✅ No need to copy the full license text into each file
- ✅ Standard format recognized by legal and compliance tools
- ✅ Helps with license compliance verification

**Note:** The SPDX header should be placed at the very top of the file, before any imports or code.

## 👥 Support

For questions or support, please contact the development team.
