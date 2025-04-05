// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
pragma abicoder v2;

import "@uniswap/v3-periphery/contracts/interfaces/IQuoterV2.sol";

interface IUniswapV2Factory {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
}

interface IUniswapV2Pair {
    function getReserves() external view returns (
        uint112 reserve0,
        uint112 reserve1,
        uint32 blockTimestampLast
    );

    function token0() external view returns (address);
    function token1() external view returns (address);
}

contract DEXAggregator {
    address public usdc;
    address public weth;
    address public quoter;
    address public sushiswapFactory;

    event Quote(
        string dex,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );

    struct QuoteInfo {
        string dex;
        uint256 amountOut;
    }

    constructor(
        address _quoter,
        address _sushiswapFactory,
        address _weth,
        address _usdc
    ) {
        quoter = _quoter;
        sushiswapFactory = _sushiswapFactory;
        weth = _weth;
        usdc = _usdc;
    }

    function getQuoteUniswapV3(
        uint256 amountIn,
        address tokenIn,
        address tokenOut,
        uint24 fee
    ) public returns (uint256) {
        IQuoterV2.QuoteExactInputSingleParams memory params = IQuoterV2
            .QuoteExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                amountIn: amountIn,
                fee: fee,
                sqrtPriceLimitX96: 0
            });

        (uint256 amountOut, , , ) = IQuoterV2(quoter).quoteExactInputSingle(params);
        return amountOut;
    }

    function getQuoteSushiswap(uint256 amountIn) public view returns (uint256 amountOut) {
        address pair = IUniswapV2Factory(sushiswapFactory).getPair(weth, usdc);
        require(pair != address(0), "Pair not found");

        (uint112 reserve0, uint112 reserve1, ) = IUniswapV2Pair(pair).getReserves();
        address token0 = IUniswapV2Pair(pair).token0();

        uint reserveIn;
        uint reserveOut;

        if (token0 == weth) {
            reserveIn = reserve0;
            reserveOut = reserve1;
        } else {
            reserveIn = reserve1;
            reserveOut = reserve0;
        }

        uint amountInWithFee = amountIn * 997;
        amountOut = (amountInWithFee * reserveOut) / (reserveIn * 1000 + amountInWithFee);
    }

    function getSushiswapReserves() public view returns (uint112 reserveWETH, uint112 reserveUSDC) {
        address pair = IUniswapV2Factory(sushiswapFactory).getPair(weth, usdc);
        require(pair != address(0), "Pair not found");

        (uint112 reserve0, uint112 reserve1, ) = IUniswapV2Pair(pair).getReserves();
        address token0 = IUniswapV2Pair(pair).token0();

        if (token0 == weth) {
            reserveWETH = reserve0;
            reserveUSDC = reserve1;
        } else {
            reserveWETH = reserve1;
            reserveUSDC = reserve0;
        }
    }

    /// @notice Returns the best quote available for WETH → USDC with slippage
    /// @param amountIn The amount of WETH to swap
    /// @param slippageBps Slippage in basis points (e.g., 50 = 0.5%)
    /// @return bestAmountOut Raw best quote (before slippage)
    /// @return dex Name of the DEX with best quote
    /// @return minAmountOut Minimum amount acceptable after slippage
function getBestQuote(uint256 amountIn, uint256 slippageBps)
    external
    returns (uint256 bestAmountOut, string memory dex, uint256 minAmountOut) {
    QuoteInfo[] memory quotes = new QuoteInfo[](2);

    // Uniswap V3 quote
    uint256 uniAmountOut = getQuoteUniswapV3(amountIn, weth, usdc, 3000);
    quotes[0] = QuoteInfo("UniswapV3", uniAmountOut);

    // Sushiswap quote
    uint256 sushiAmountOut = getQuoteSushiswap(amountIn);
    quotes[1] = QuoteInfo("Sushiswap", sushiAmountOut);

    // Find best
    QuoteInfo memory best = quotes[0];
    for (uint i = 1; i < quotes.length; i++) {
        if (quotes[i].amountOut > best.amountOut) {
            best = quotes[i];
        }
    }

    // Apply slippage: minOut = bestOut * (1 - slippageBps / 10,000)
    minAmountOut = (best.amountOut * (10_000 - slippageBps)) / 10_000;
    return (best.amountOut, best.dex, minAmountOut);
}

}
