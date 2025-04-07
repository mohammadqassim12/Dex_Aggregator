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

    const wethAddress = deployedAddresses.weth;
    const usdcAddress = deployedAddresses.usdc;

    const weth = new ethers.Contract(wethAddress, IERC20_ABI, deployer);
    const usdc = new ethers.Contract(usdcAddress, IERC20_ABI, deployer);

    // ====== WETH → USDC ======
    const wethAmountIn = ethers.parseUnits("1", 18);
    let wethBalance = await weth.balanceOf(deployerAddress);
    if (wethBalance < wethAmountIn) {
        console.log("Wrapping ETH to WETH...");
        await (await weth.deposit({ value: wethAmountIn })).wait();
    }

    console.log("\n--- Swapping WETH → USDC ---");
    console.log("Pre-swap WETH:", ethers.formatUnits(await weth.balanceOf(deployerAddress), 18));
    console.log("Pre-swap USDC:", ethers.formatUnits(await usdc.balanceOf(deployerAddress), 6));

    await (await weth.approve(deployedAddresses.dexAggregator, wethAmountIn)).wait();

    const deadline = Math.floor(Date.now() / 1000) + 300;
    const tx1 = await aggregator.executeSwap(
        wethAmountIn,
        wethAddress,
        usdcAddress,
        500,
        90,
        0,
        deadline,
        { gasLimit: 500000 }
    );
    await tx1.wait();
    console.log("Swap WETH → USDC successful!");

    console.log("Post-swap WETH:", ethers.formatUnits(await weth.balanceOf(deployerAddress), 18));
    console.log("Post-swap USDC:", ethers.formatUnits(await usdc.balanceOf(deployerAddress), 6));

    // ====== USDC → WETH ======
    const usdcAmountIn = ethers.parseUnits("1000", 6);
    console.log("\n--- Swapping USDC → WETH ---");

    console.log("Pre-swap USDC:", ethers.formatUnits(await usdc.balanceOf(deployerAddress), 6));
    console.log("Pre-swap WETH:", ethers.formatUnits(await weth.balanceOf(deployerAddress), 18));

    await (await usdc.approve(deployedAddresses.dexAggregator, usdcAmountIn)).wait();

    const tx2 = await aggregator.executeSwap(
        usdcAmountIn,
        usdcAddress,
        wethAddress,
        500,
        90,
        0,
        deadline,
        { gasLimit: 500000 }
    );
    await tx2.wait();
    console.log("Swap USDC → WETH successful!");

    console.log("Post-swap USDC:", ethers.formatUnits(await usdc.balanceOf(deployerAddress), 6));
    console.log("Post-swap WETH:", ethers.formatUnits(await weth.balanceOf(deployerAddress), 18));
}

main().catch(console.error);
