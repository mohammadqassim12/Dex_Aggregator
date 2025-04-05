const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("Fetching quotes...");

    const addresses = JSON.parse(fs.readFileSync(path.join(__dirname, "deployed-addresses.json")));
    const aggregator = await ethers.getContractAt("DEXAggregator", addresses.dexAggregator);
    //the abi of the contract is 

    const amountIn = ethers.parseUnits("1", 18);
    const fee = 3000;
    const ethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
    const usdcAddress = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";


    // Uniswap V3 Quote
    const amountOutUni = await aggregator.getFunction("getQuoteUniswapV3").staticCall(amountIn, ethAddress, usdcAddress, fee);
    console.log("Uniswap V3 Quote for 1 WETH:", ethers.formatUnits(amountOutUni, 6), "USDC");

    // Sushiswap Quote
    const sushiQuote = await aggregator.getQuoteSushiswap(amountIn);
    console.log("Sushiswap Quote for 1 WETH:", ethers.formatUnits(sushiQuote, 6), "USDC");

    // Pool Reserves
    const [reserveWETH, reserveUSDC] = await aggregator.getSushiswapReserves();
    console.log("Sushiswap Reserves:");
    console.log("  WETH:", ethers.formatUnits(reserveWETH, 18));
    console.log("  USDC:", ethers.formatUnits(reserveUSDC, 6));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Quote script failed:", error.message);
    process.exit(1);
  });
