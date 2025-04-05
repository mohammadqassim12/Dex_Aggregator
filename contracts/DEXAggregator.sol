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

    // @notice Helper function to convert uint to string
    /// @param _i The uint to convert
    /// @return str The string representation of the uint
    function uint2str(uint _i) internal pure returns (string memory str) {
        if (_i == 0) {
            return "0";
        }
        uint j = _i;
        uint len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint k = len;
        while (_i != 0) {
            k = k - 1;
            uint8 temp = uint8(48 + _i % 10);
            bstr[k] = bytes1(temp);
            _i /= 10;
        }
        str = string(bstr);
    }


    /// @notice Finds the best output by splitting a trade between Uniswap and Sushiswap
    /// @param amountIn The input amount of WETH
    /// @param slippageBps Slippage in basis points (e.g., 50 = 0.5%)
    /// @return bestAmountOut The highest combined USDC output
    /// @return dex A human-readable route description
    /// @return minAmountOut Minimum output accounting for slippage
    /// @return splitPercentToUni Percentage of trade to route through Uniswap
    function getBestQuoteWithSplit(uint256 amountIn, uint256 slippageBps)
        external
        returns (
            uint256 bestAmountOut,
            string memory dex,
            uint256 minAmountOut,
            uint256 splitPercentToUni
        )
    {
        // STEP 1: Find best Uniswap V3 fee tier
        uint24[3] memory fees = [uint24(500), 3000, 10000];
        uint256 bestUniOut = 0;
        uint24 bestUniFee = 3000;

        for (uint256 i = 0; i < fees.length; i++) {
            uint256 quote = getQuoteUniswapV3(amountIn, weth, usdc, fees[i]);
            if (quote > bestUniOut) {
                bestUniOut = quote;
                bestUniFee = fees[i];
            }
        }

        // STEP 2: Run split routing loop with best Uni fee vs Sushiswap
        uint256 step = 10;
        uint256 maxOut = 0;
        uint256 bestSplit = 0;

        for (uint256 i = step; i < 100; i += step) {
            uint256 uniAmount = (amountIn * i) / 100;
            uint256 sushiAmount = amountIn - uniAmount;

            uint256 uniOut = getQuoteUniswapV3(uniAmount, weth, usdc, bestUniFee);
            uint256 sushiOut = getQuoteSushiswap(sushiAmount);

            uint256 totalOut = uniOut + sushiOut;

            if (totalOut > maxOut) {
                maxOut = totalOut;
                bestSplit = i;
            }
        }

        // STEP 3: Calculate slippage and return result
        minAmountOut = (maxOut * (10_000 - slippageBps)) / 10_000;

        string memory dexRoute = string(
            abi.encodePacked(
                "Split: ",
                uint2str(bestSplit),
                "% Uniswap V3 (",
                uint2str(bestUniFee),
                ") / ",
                uint2str(100 - bestSplit),
                "% Sushiswap"
            )
        );

        return (maxOut, dexRoute, minAmountOut, bestSplit);
    }

}
