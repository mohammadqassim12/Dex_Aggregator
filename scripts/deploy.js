require("dotenv").config();
const hre = require("hardhat");
const { ethers } = hre;
const fs = require("fs");
const path = require("path");


const MAINNET_UNISWAP_QUOTER = "0x61fFE014bA17989E743c5F6cB21bF9697530B21e";
const sushiswapFactoryAddress = "0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac";
const wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const usdcAddress = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

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
    };

    // Validate addresses
    for (const [label, address] of Object.entries(addresses)) {
        if (!ethers.isAddress(address)) {
            throw new Error(`Invalid address for ${label}: ${address}`);
        }
    }

    console.log("Deploying UniSwap DEX contract...");
    const DEX = await ethers.getContractFactory("DEX");
    const dex = await DEX.deploy(addresses.MAINNET_UNISWAP_QUOTER);

    console.log("Deploying SushiswapDataFetcher contract...");
    const DataFetcher = await ethers.getContractFactory("SushiswapDataFetcher");    
    const dataFetcher = await DataFetcher.deploy(
        addresses.sushiswapFactoryAddress,
        addresses.wethAddress,
        addresses.usdcAddress
    );
    console.log("Deployment transaction sent. Waiting for confirmation... (may take a while)");
    await Promise.all([
        dex.waitForDeployment(),
        dataFetcher.waitForDeployment(),
    ]);
    const deployedAddresses = {
        dex: await dex.getAddress(),
        dataFetcher: await dataFetcher.getAddress()
    };
    console.log("DEX deployed to:", deployedAddresses.dex);
    console.log("SushiswapDataFetcher deployed to:", deployedAddresses.dataFetcher);

    // Save to JSON
    const outputPath = path.join(__dirname, "deployed-addresses.json");
    fs.writeFileSync(outputPath, JSON.stringify(deployedAddresses, null, 2));
    console.log("Addresses saved to deployed-addresses.json");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Deployment failed:", error.message);
        process.exit(1);
    });
