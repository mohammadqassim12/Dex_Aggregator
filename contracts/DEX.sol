// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
pragma abicoder v2;
import "@uniswap/v3-periphery/contracts/interfaces/IQuoterV2.sol";

contract DEX {
    address public quoter;
    address USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;

    event Quote(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );

    constructor(
        address _quoter
    ) {
        quoter = _quoter;
    }

    function getQuoteWETH(
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
        (uint256 amountOut, , , ) = IQuoterV2(quoter).quoteExactInputSingle(
            params
        );
        emit Quote(tokenIn, tokenOut, amountIn, amountOut);
        return amountOut;
    }
}