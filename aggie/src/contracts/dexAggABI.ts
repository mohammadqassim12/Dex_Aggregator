export const dexAggABI = {
    address: "0x21d37c3D76f1B24A501fD2B0468Ab88DADB75DB7",
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
    ]
} as const;