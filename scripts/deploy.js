require("dotenv").config();
const hre = require("hardhat");
const { ethers } = hre;
const fs = require("fs");
const path = require("path");

const MAINNET_UNISWAP_QUOTER = "0x61fFE014bA17989E743c5F6cB21bF9697530B21e";
const sushiswapFactoryAddress = "0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac";
const wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const usdcAddress = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";


// New router addresses
const MAINNET_UNISWAP_ROUTER = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
const SUSHISWAP_ROUTER = "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F";

async function main() {
    const [deployer] = await ethers.getSigners();
    const balance = await deployer.provider.getBalance(deployer.address);
    if (balance < ethers.parseEther("0.01")) {
        throw new Error("Insufficient balance for deployment");
    }

    const addresses = {
        sushiswapFactoryAddress,
        wethAddress,
        usdcAddress,
        MAINNET_UNISWAP_QUOTER,
        MAINNET_UNISWAP_ROUTER,
        SUSHISWAP_ROUTER
    };

    // Validate addresses
    for (const [label, address] of Object.entries(addresses)) {
        if (!ethers.isAddress(address)) {
            throw new Error(`Invalid address for ${label}: ${address}`);
        }
    }

    console.log("Deploying DEXAggregator...");
    const Aggregator = await ethers.getContractFactory("DEXAggregator");
    const aggregator = await Aggregator.deploy(
        addresses.MAINNET_UNISWAP_QUOTER,
        addresses.sushiswapFactoryAddress,
        addresses.wethAddress,
        addresses.usdcAddress,
        addresses.MAINNET_UNISWAP_ROUTER,
        addresses.SUSHISWAP_ROUTER
    );

    console.log("Waiting for deployment...");
    await aggregator.waitForDeployment();
    const aggregatorAddress = await aggregator.getAddress();

    console.log("DEXAggregator deployed to:", aggregatorAddress);

    // Save to JSON
    const outputPath = path.join(__dirname, "deployed-addresses.json");
    fs.writeFileSync(outputPath, JSON.stringify({ dexAggregator: aggregatorAddress }, null, 2));
    console.log("Address saved to deployed-addresses.json");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Deployment failed:", error.message);
        process.exit(1);
    });
