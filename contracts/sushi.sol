// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title IUniswapV2Factory
 * @dev Interface for the Uniswap V2 (or Sushiswap) Factory contract.
 */
interface IUniswapV2Factory {
    /**
     * @notice Returns the address of the pair for tokenA and tokenB.
     * @param tokenA The address of the first token.
     * @param tokenB The address of the second token.
     * @return pair The address of the liquidity pair contract.
     */
    function getPair(address tokenA, address tokenB) external view returns (address pair);
}

/**
 * @title IUniswapV2Pair
 * @dev Interface for the Uniswap V2 (or Sushiswap) Pair contract.
 */
interface IUniswapV2Pair {
    /**
     * @notice Returns the reserves of the two tokens in the pair along with the last block timestamp.
     * @return reserve0 The reserve amount for token0.
     * @return reserve1 The reserve amount for token1.
     * @return blockTimestampLast The timestamp of the last block when the reserves were updated.
     */
    function getReserves() external view returns (
        uint112 reserve0, 
        uint112 reserve1, 
        uint32 blockTimestampLast
    );

    /**
     * @notice Returns the address of token0 in the pair.
     * @return The address of token0.
     */
    function token0() external view returns (address);

    /**
     * @notice Returns the address of token1 in the pair.
     * @return The address of token1.
     */
    function token1() external view returns (address);
}

/**
 * @title SushiswapDataFetcher
 * @dev This contract fetches data from a Sushiswap liquidity pool (which follows the Uniswap V2 model)
 *      and calculates the output amount of USDC for a given input amount of WETH.
 */
contract SushiswapDataFetcher {
    /// @notice Address of the Sushiswap factory contract.
    address public factory;
    /// @notice Address of the WETH token.
    address public weth;
    /// @notice Address of the USDC token.
    address public usdc;

    /**
     * @notice Initializes the contract with the Sushiswap factory, WETH, and USDC addresses.
     * @param _factory The address of the Sushiswap factory contract.
     * @param _weth The address of the WETH token.
     * @param _usdc The address of the USDC token.
     */
    constructor(
        address _factory,
        address _weth,
        address _usdc
    ) {
        factory = _factory;
        weth = _weth;
        usdc = _usdc;
    }

    /**
     * @notice Calculates the estimated USDC output for a given amount of WETH input.
     * @dev This function uses the constant product formula with a fee adjustment (997/1000)
     *      to compute the output amount.
     * @param amountIn The input amount of WETH (in wei).
     * @return amountOut The estimated amount of USDC (in its smallest unit) that would be received.
     */
    function getWethToUsdcAmountOut(uint amountIn) external view returns (uint amountOut) {
        address pairAddress = IUniswapV2Factory(factory).getPair(weth, usdc);
        require(pairAddress != address(0), "Pair not found");

        (uint112 reserve0, uint112 reserve1, ) = IUniswapV2Pair(pairAddress).getReserves();
        address token0 = IUniswapV2Pair(pairAddress).token0();
        address token1 = IUniswapV2Pair(pairAddress).token1();

        uint reserveIn;
        uint reserveOut;
        if (token0 == weth) {
            reserveIn = reserve0;
            reserveOut = reserve1;
        } else if (token1 == weth) {
            reserveIn = reserve1;
            reserveOut = reserve0;
        } else {
            revert("WETH not found in pair");
        }

        uint amountInWithFee = amountIn * 997;
        amountOut = (amountInWithFee * reserveOut) / (reserveIn * 1000 + amountInWithFee);
    }

    /**
     * @notice Retrieves the current reserves of the WETH/USDC liquidity pool.
     * @dev Returns reserves in the order: WETH reserve first, USDC reserve second.
     * @return reserveWETH The current reserve of WETH in the pool.
     * @return reserveUSDC The current reserve of USDC in the pool.
     */
    function getPoolReserves() external view returns (uint112 reserveWETH, uint112 reserveUSDC) {
        address pairAddress = IUniswapV2Factory(factory).getPair(weth, usdc);
        require(pairAddress != address(0), "Pair not found");
        
        (uint112 reserve0, uint112 reserve1, ) = IUniswapV2Pair(pairAddress).getReserves();
        address token0 = IUniswapV2Pair(pairAddress).token0();

        if (token0 == weth) {
            reserveWETH = reserve0;
            reserveUSDC = reserve1;
        } else {
            reserveWETH = reserve1;
            reserveUSDC = reserve0;
        }
    }
}