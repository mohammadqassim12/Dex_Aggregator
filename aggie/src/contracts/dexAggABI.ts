export const dexAggABI = {
    "abi": [
        {
            "inputs": [
              {
                "internalType": "uint256",
                "name": "amountIn",
                "type": "uint256"
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
              }
            ],
            "stateMutability": "nonpayable",
            "type": "function"
          },
    ]
} as const;