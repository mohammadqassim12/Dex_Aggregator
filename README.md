# DEX Aggregator Project

A decentralized exchange (DEX) aggregator that finds the best quote for token swaps between WETH and USDC by routing through Uniswap V3 and Sushiswap. Supports intelligent split routing and swap execution.

## Student Contributors

| Name               |  Student Number     |
|--------------------|---------------------|
|  Mohammad Al-Qasem |     1007976674      |
|    Danny Yang      |     1009106030      |
|Ankhjargal Ankhbayar|     1008494498      |

---

## Features
- Finds the best swap route across Uniswap and Sushiswap
- Supports split routing with slippage tolerance
- Executes actual token swaps via smart contract
- Supports both WETH → USDC and USDC → WETH directions

---

## Requirements
- Node.js
- Hardhat
- A `.env` file configured with:
  ```env
  PRIVATE_KEY=
  NETWORK_URL=YOUR_BUILDBEAR_NETWORK
```

---

## Environment Setup

Install dependencies:
```
npm install
```

---

## Deployment
To deploy the smart contract to Buildbear:

```
npx hardhat run scripts/deploy.js --network buildbear
```

---

## Quoting
To fetch the best quote for both swap directions:

```
npx hardhat run scripts/quote.js --network buildbear
```

---

## Swap Execution
To test an actual swap (e.g., WETH → USDC followed by USDC → WETH):

```
npx hardhat run scripts/executeSwap.js --network buildbear
```
(This script also handles wrapping ETH to WETH and approving the aggregator contract.)
---

## Frontend Instructions (To Be Completed)

_This section will explain how to run the frontend app._

---

## Slides

Presentation slides for the project are included in this repository.

## Useful Resources
- [What is a DEX Aggregator? – Coinbase](https://www.coinbase.com/learn/crypto-glossary/what-is-a-dex-aggregator)
- [Decentralized Exchange Development – Codewave](https://codewave.com/insights/decentralized-exchange-development/)
- [What Are DEX Aggregators? – CoinMarketCap Academy](https://coinmarketcap.com/academy/article/what-are-dex-aggregators-a-deep-dive-by-1inch)

