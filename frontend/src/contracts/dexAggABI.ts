import { AppConfig } from "../config";

export const dexAggABI = {
    address: AppConfig.contractAddress,
    "abi": [
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "_quoter",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "_sushiswapFactory",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "_weth",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "_usdc",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "_uniswapRouter",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "_sushiswapRouter",
              "type": "address"
            }
          ],
          "stateMutability": "nonpayable",
          "type": "constructor"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "token",
              "type": "address"
            }
          ],
          "name": "SafeERC20FailedOperation",
          "type": "error"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": false,
              "internalType": "string",
              "name": "dex",
              "type": "string"
            },
            {
              "indexed": false,
              "internalType": "address",
              "name": "tokenIn",
              "type": "address"
            },
            {
              "indexed": false,
              "internalType": "address",
              "name": "tokenOut",
              "type": "address"
            },
            {
              "indexed": false,
              "internalType": "uint256",
              "name": "amountIn",
              "type": "uint256"
            },
            {
              "indexed": false,
              "internalType": "uint256",
              "name": "amountOut",
              "type": "uint256"
            }
          ],
          "name": "Quote",
          "type": "event"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": true,
              "internalType": "address",
              "name": "sender",
              "type": "address"
            },
            {
              "indexed": false,
              "internalType": "uint256",
              "name": "amountIn",
              "type": "uint256"
            },
            {
              "indexed": false,
              "internalType": "uint256",
              "name": "totalAmountOut",
              "type": "uint256"
            },
            {
              "indexed": false,
              "internalType": "uint256",
              "name": "uniAmount",
              "type": "uint256"
            },
            {
              "indexed": false,
              "internalType": "uint256",
              "name": "sushiAmount",
              "type": "uint256"
            },
            {
              "indexed": false,
              "internalType": "uint24",
              "name": "uniFee",
              "type": "uint24"
            },
            {
              "indexed": false,
              "internalType": "uint256",
              "name": "splitPercentToUni",
              "type": "uint256"
            },
            {
              "indexed": false,
              "internalType": "address",
              "name": "tokenIn",
              "type": "address"
            },
            {
              "indexed": false,
              "internalType": "address",
              "name": "tokenOut",
              "type": "address"
            }
          ],
          "name": "SwapExecuted",
          "type": "event"
        },
        {
          "inputs": [
            {
              "internalType": "uint256",
              "name": "amountIn",
              "type": "uint256"
            },
            {
              "internalType": "address",
              "name": "tokenIn",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "tokenOut",
              "type": "address"
            },
            {
              "internalType": "uint24",
              "name": "uniFee",
              "type": "uint24"
            },
            {
              "internalType": "uint256",
              "name": "splitPercentToUni",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "minTotalAmountOut",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "deadline",
              "type": "uint256"
            }
          ],
          "name": "executeSwap",
          "outputs": [
            {
              "internalType": "uint256",
              "name": "totalOut",
              "type": "uint256"
            }
          ],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "uint256",
              "name": "amountIn",
              "type": "uint256"
            },
            {
              "internalType": "address",
              "name": "tokenIn",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "tokenOut",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "slippageBps",
              "type": "uint256"
            }
          ],
          "name": "getBestQuoteWithSplit",
          "outputs": [
            {
              "internalType": "uint256",
              "name": "bestAmountOut",
              "type": "uint256"
            },
            {
              "internalType": "string",
              "name": "dex",
              "type": "string"
            },
            {
              "internalType": "uint256",
              "name": "minAmountOut",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "splitPercentToUni",
              "type": "uint256"
            },
            {
              "internalType": "uint24",
              "name": "uniFeeUsed",
              "type": "uint24"
            }
          ],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "uint256",
              "name": "amountIn",
              "type": "uint256"
            },
            {
              "internalType": "address",
              "name": "tokenIn",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "tokenOut",
              "type": "address"
            }
          ],
          "name": "getQuoteSushiswap",
          "outputs": [
            {
              "internalType": "uint256",
              "name": "amountOut",
              "type": "uint256"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "uint256",
              "name": "amountIn",
              "type": "uint256"
            },
            {
              "internalType": "address",
              "name": "tokenIn",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "tokenOut",
              "type": "address"
            },
            {
              "internalType": "uint24",
              "name": "fee",
              "type": "uint24"
            }
          ],
          "name": "getQuoteUniswapV3",
          "outputs": [
            {
              "internalType": "uint256",
              "name": "",
              "type": "uint256"
            }
          ],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "getSushiswapReserves",
          "outputs": [
            {
              "internalType": "uint112",
              "name": "reserveWETH",
              "type": "uint112"
            },
            {
              "internalType": "uint112",
              "name": "reserveUSDC",
              "type": "uint112"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "quoter",
          "outputs": [
            {
              "internalType": "address",
              "name": "",
              "type": "address"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "sushiswapFactory",
          "outputs": [
            {
              "internalType": "address",
              "name": "",
              "type": "address"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "sushiswapRouter",
          "outputs": [
            {
              "internalType": "contract IUniswapV2Router02",
              "name": "",
              "type": "address"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "uniswapRouter",
          "outputs": [
            {
              "internalType": "contract ISwapRouter",
              "name": "",
              "type": "address"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "usdc",
          "outputs": [
            {
              "internalType": "address",
              "name": "",
              "type": "address"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "weth",
          "outputs": [
            {
              "internalType": "address",
              "name": "",
              "type": "address"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        }
      ],
} as const;