const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("Fetching quotes...");

    const addresses = JSON.parse(fs.readFileSync(path.join(__dirname, "deployed-addresses.json")));
    const aggregator = await ethers.getContractAt("DEXAggregator", addresses.dexAggregator);

    const amountIn = ethers.parseUnits("1", 18);
    const slippageBps = 50; // 0.5% slippage

    const [bestAmountOut, dexName, minAmountOut, splitPercentToUni] = await aggregator
      .getFunction("getBestQuoteWithSplit")
      .staticCall(amountIn, slippageBps);
    
    console.log("🚀 Best Quote with Split Routing:");
    console.log(`  Route: ${dexName}`);
    console.log("  Raw Amount Out:", ethers.formatUnits(bestAmountOut, 6), "USDC");
    console.log("  Min Amount Out (after slippage):", ethers.formatUnits(minAmountOut, 6), "USDC");
    const uniSplit = Number(splitPercentToUni);
    const sushiSplit = 100 - uniSplit;
    
    console.log(`  Split: ${uniSplit}% to Uniswap / ${sushiSplit}% to Sushiswap`);
        
    
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Quote script failed:", error.message);
    process.exit(1);
  });
