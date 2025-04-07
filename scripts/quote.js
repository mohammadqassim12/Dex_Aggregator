const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

function formatAmount(tokenAddress, amount, addresses) {
    if (tokenAddress.toLowerCase() === addresses.usdc.toLowerCase()) {
        return ethers.formatUnits(amount, 6);
    }
    return ethers.formatUnits(amount, 18);
}

async function quoteAndPrint(tokenIn, tokenOut, amountIn, slippageBps, label, addresses) {
    const aggregator = await ethers.getContractAt("DEXAggregator", addresses.dexAggregator);

    const [bestAmountOut, dexName, minAmountOut, splitPercentToUni] =
        await aggregator.getFunction("getBestQuoteWithSplit").staticCall(amountIn, tokenIn, tokenOut, slippageBps);

    console.log(`\n🔄 ${label}`);
    console.log(`  Route: ${dexName}`);
    console.log("  Raw Amount Out:", formatAmount(tokenOut, bestAmountOut, addresses));
    console.log("  Min Amount Out (after slippage):", formatAmount(tokenOut, minAmountOut, addresses));
    const uniSplit = Number(splitPercentToUni);
    const sushiSplit = 100 - uniSplit;
    console.log(`  Split: ${uniSplit}% to Uniswap / ${sushiSplit}% to Sushiswap`);
}

async function main() {
    console.log("🔎 Fetching quotes...");

    const addresses = JSON.parse(fs.readFileSync(path.join(__dirname, "deployed-addresses.json")));
    const weth = addresses.weth;
    const usdc = addresses.usdc;
    const slippageBps = 50;

    // 1 WETH → USDC
    const amountWETH = ethers.parseUnits("1", 18);
    await quoteAndPrint(weth, usdc, amountWETH, slippageBps, "WETH → USDC", addresses);

    // 1000 USDC → WETH
    const amountUSDC = ethers.parseUnits("1000", 6);
    await quoteAndPrint(usdc, weth, amountUSDC, slippageBps, "USDC → WETH", addresses);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Quote script failed:", error.message);
        process.exit(1);
    });
