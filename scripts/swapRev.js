const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

const IERC20_ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function balanceOf(address account) external view returns (uint256)"
];

async function main() {
    // 1. Get deployer and log account & ETH balance
    const [deployer] = await ethers.getSigners();
    const deployerAddress = await deployer.getAddress();
    console.log("Account:", deployerAddress);
    console.log("ETH Balance:", ethers.formatEther(await deployer.provider.getBalance(deployerAddress)));

    // 2. Read deployed aggregator address
    const deployedAddresses = JSON.parse(fs.readFileSync(path.join(__dirname, "deployed-addresses.json"), "utf8"));
    const aggregator = await ethers.getContractAt("DEXAggregator", deployedAddresses.dexAggregator);
    console.log("Deployed aggregator address:", deployedAddresses.dexAggregator);
    
    // 3. Set USDC and WETH addresses (mainnet addresses on fork)
    const usdcAddress = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
    const wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
    
    // 4. Create USDC and WETH contract instances
    const usdc = new ethers.Contract(usdcAddress, IERC20_ABI, deployer);
    const weth = new ethers.Contract(wethAddress, IERC20_ABI, deployer);

    // 5. Check pre-swap balances
    let usdcBalance = await usdc.balanceOf(deployerAddress);
    let wethBalance = await weth.balanceOf(deployerAddress);
    console.log("Pre-swap USDC balance:", ethers.formatUnits(usdcBalance, 6));
    console.log("Pre-swap WETH balance:", ethers.formatUnits(wethBalance, 18));

    // 6. Define the amount of USDC to swap (e.g., 1000 USDC)
    const amountIn = ethers.parseUnits("1000", 6);

    // 7. Approve aggregator to spend USDC
    console.log("Approving aggregator to spend 1000 USDC...");
    const approvalTx = await usdc.approve(deployedAddresses.dexAggregator, amountIn);
    await approvalTx.wait();
    console.log("Approval confirmed");

    // 8. Execute the swap: USDC -> WETH
    const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes from now
    const tx = await aggregator.executeSwap(
        amountIn,
        usdcAddress,   // tokenIn is USDC
        wethAddress,   // tokenOut is WETH
        500,           // Fee tier 500 (adjust if needed)
        90,            // For example, 90% routing through Uniswap V3 (and 10% through Sushiswap)
        0,             // For testing, set minTotalAmountOut to 0 (adjust for slippage in production)
        deadline,
        { gasLimit: 500000 }
    );
    
    const receipt = await tx.wait();
    console.log("Swap successful! TX hash:", receipt.hash);

    // 9. Check post-swap balances
    usdcBalance = await usdc.balanceOf(deployerAddress);
    wethBalance = await weth.balanceOf(deployerAddress);
    console.log("Post-swap USDC balance:", ethers.formatUnits(usdcBalance, 6));
    console.log("Post-swap WETH balance:", ethers.formatUnits(wethBalance, 18));
}

main().catch(console.error);
