const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

const IERC20_ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function balanceOf(address account) external view returns (uint256)",
    "function deposit() external payable"
];

const USDC_ABI = [
    "function balanceOf(address account) external view returns (uint256)"
];

async function main() {
    const [deployer] = await ethers.getSigners();
    const deployerAddress = await deployer.getAddress();
    console.log("Account:", deployerAddress);
    console.log("ETH Balance:", ethers.formatEther(await deployer.provider.getBalance(deployerAddress)));

    const deployedAddresses = JSON.parse(
        fs.readFileSync(path.join(__dirname, "deployed-addresses.json"), "utf8")
    );
    const aggregator = await ethers.getContractAt("DEXAggregator", deployedAddresses.dexAggregator);
    console.log("Deployed aggregator address:", deployedAddresses.dexAggregator);
    
    const wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
    const usdcAddress = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
    
    const weth = new ethers.Contract(wethAddress, IERC20_ABI, deployer);
    const usdc = new ethers.Contract(usdcAddress, USDC_ABI, deployer);

    // Convert ETH to WETH if needed
    const amountIn = ethers.parseUnits("1", 18);
    let wethBalance = await weth.balanceOf(deployerAddress);
    if (wethBalance < amountIn) {
        console.log("Wrapping ETH to WETH...");
        await (await weth.deposit({ value: amountIn })).wait();
    }

    // Check pre-swap balances
    wethBalance = await weth.balanceOf(deployerAddress);
    let usdcBalance = await usdc.balanceOf(deployerAddress);
    console.log("Pre-swap WETH balance:", ethers.formatUnits(wethBalance, 18));
    console.log("Pre-swap USDC balance:", ethers.formatUnits(usdcBalance, 6));

    // Approve aggregator to spend WETH
    console.log("Approving aggregator...");
    await (await weth.approve(deployedAddresses.dexAggregator, amountIn)).wait();

    // Execute swap
    console.log("Executing swap...");
    const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes from now
    const tx = await aggregator.executeSwap(
        amountIn,
        500,            // Fee tier 500
        90,            // 100% routing through Uniswap V3
        0,              // For testing, set minTotalAmountOut to 0 (adjust for slippage in production)
        deadline,
        { gasLimit: 500000 }
    );
    
    const receipt = await tx.wait();
    console.log("Swap successful! TX hash:", receipt.hash);

    // Check post-swap balances
    wethBalance = await weth.balanceOf(deployerAddress);
    usdcBalance = await usdc.balanceOf(deployerAddress);
    console.log("Post-swap WETH balance:", ethers.formatUnits(wethBalance, 18));
    console.log("Post-swap USDC balance:", ethers.formatUnits(usdcBalance, 6));
}

main().catch(console.error);
