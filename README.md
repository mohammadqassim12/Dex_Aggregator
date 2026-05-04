# DEX Aggregator

> An on-chain DEX aggregator that finds the best WETH ↔ USDC route across Uniswap V3 and Sushiswap, with split routing and slippage tolerance. Built for UTSC's CSCD71 blockchain capstone.

---

## Overview

A decentralized exchange aggregator that quotes WETH ↔ USDC swaps against multiple liquidity pools, computes the optimal route under a user-set slippage tolerance, and executes the swap atomically through a Solidity aggregator contract.

Inspired by 1inch and Paraswap, but minimal: two pools, two tokens, single user. The point was to do every part — quoting, routing, contract, frontend — end to end and understand each surface from first principles.

---

## Why split routing matters

A naïve aggregator picks whichever pool quotes a better headline rate and sends the entire trade there. That's wrong for any non-trivial trade size: large orders move the price more in shallower pools than in deeper ones. The optimal total fill often comes from splitting the trade across both pools at proportions calculated from each pool's depth.

This implementation:

- Pulls live state from both Uniswap V3 and Sushiswap pools
- Computes per-pool effective rates accounting for the order's price impact
- Returns a split that minimizes total slippage given the user's tolerance
- Verifies that any split route strictly improves over the best single-pool route before recommending it

---

## Architecture

```
┌─────────────────┐
│  React frontend │  ← user inputs amount + slippage
└────────┬────────┘
         │
┌────────▼─────────────────┐
│  Quoter (TypeScript)     │  ← reads pool state
│   • Uniswap V3 SDK       │
│   • Sushiswap router     │
└────────┬─────────────────┘
         │
┌────────▼─────────────────┐
│  Aggregator contract     │  ← atomic swap + approvals
│   (Solidity, Hardhat)    │
└────────┬─────────────────┘
         │
   Buildbear testnet
```

---

## Stack

**Smart contract**
- Solidity (`contracts/`) — the aggregator that executes the swap
- Hardhat — compile, deploy, test
- ethers.js — script interface to the deployed contract

**Quoting & routing logic**
- TypeScript (`scripts/`) — `quote.js`, `executeSwap.js`, `deploy.js`
- Uniswap V3 SDK — read pool state and compute swap output
- Sushiswap router — fallback pool

**Frontend**
- React + Vite (`frontend/`) — single-page app wired to the deployed contract
- pnpm workspace

**Network**
- Buildbear (mainnet fork) — realistic liquidity without spending real ETH

---

## Key engineering decisions

1. **Atomic execution.** ETH → WETH wrapping and the contract approvals happen inside the same transaction as the swap. The frontend UX is single-click and there's no risk of approval drift between quote and execute.

2. **Quoter and executor are separate paths.** The frontend can preview a route without committing gas. Quote is read-only; execute mutates state.

3. **Slippage as a hard floor, not advisory.** The contract reverts if the actual output falls below the quoted output minus the user's slippage tolerance. The frontend can't be tricked into accepting a worse trade.

4. **Buildbear over a vanilla Hardhat fork.** Gives realistic mainnet pool state without burning real ETH; closer behavior to production than a local node.

---

## Setup

### Prerequisites
- Node.js 18+
- pnpm
- A Buildbear network URL (mainnet fork)
- A funded testnet private key

### Configure
Create a `.env` at the repo root:

```env
PRIVATE_KEY=0xYOUR_KEY
NETWORK_URL=https://YOUR_BUILDBEAR_NETWORK
```

### Install
```bash
npm install        # contract + scripts deps
cd frontend
pnpm install       # frontend deps
```

### Deploy
```bash
npx hardhat run scripts/deploy.js --network buildbear
```
Note the printed contract address.

### Quote
```bash
npx hardhat run scripts/quote.js --network buildbear
```
Prints the best quote for both swap directions.

### Execute a swap
```bash
npx hardhat run scripts/executeSwap.js --network buildbear
```
Wraps ETH → WETH, approves the aggregator, and runs WETH → USDC followed by USDC → WETH.

### Run frontend
```bash
cd frontend
pnpm run dev
```

Update `frontend/src/config.ts` with the deployed contract address before connecting.

---

## Project structure

```
Dex_Aggregator/
├── contracts/           # Solidity aggregator contract
├── scripts/             # TypeScript quote / deploy / execute scripts
├── frontend/            # React + Vite single-page app
├── hardhat.config.js    # Network + plugin configuration
└── package.json
```

---

## Course context

Built for **CSCD71 — Blockchain Technology and Smart Contracts** at the University of Toronto Scarborough (Spring 2025).

---

## Contributors

| Name | Student # |
|------|-----------|
| Mohammad Al-Qasem | 1007976674 |
| Danny Yang | 1009106030 |
| Ankhjargal Ankhbayar | 1008494498 |

---

## Resources

- [What is a DEX Aggregator? — Coinbase](https://www.coinbase.com/learn/crypto-glossary/what-is-a-dex-aggregator)
- [Decentralized Exchange Development — Codewave](https://codewave.com/insights/decentralized-exchange-development/)
- [What Are DEX Aggregators? — CoinMarketCap Academy](https://coinmarketcap.com/academy/article/what-are-dex-aggregators-a-deep-dive-by-1inch)

---

## License

Course-project artifact; posted for portfolio purposes.
