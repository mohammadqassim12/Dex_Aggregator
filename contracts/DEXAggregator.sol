// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
pragma abicoder v2;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@uniswap/v3-periphery/contracts/interfaces/IQuoterV2.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";

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
    using SafeERC20 for IERC20;
    
    address public immutable usdc;
    address public immutable weth;
    address public immutable quoter;
    address public immutable sushiswapFactory;
    ISwapRouter public immutable uniswapRouter;
    IUniswapV2Router02 public immutable sushiswapRouter;

    event Quote(
        string dex,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );
    
    event SwapExecuted(
        address indexed sender,
        uint256 amountIn,
        uint256 totalAmountOut,
        uint256 uniAmount,
        uint256 sushiAmount,
        uint24 uniFee,
        uint256 splitPercentToUni,
        address tokenIn,
        address tokenOut
    );

    struct QuoteInfo {
        string dex;
        uint256 amountOut;
    }

    constructor(
        address _quoter,
        address _sushiswapFactory,
        address _weth,
        address _usdc,
        address _uniswapRouter,
        address _sushiswapRouter
    ) {
        quoter = _quoter;
        sushiswapFactory = _sushiswapFactory;
        weth = _weth;
        usdc = _usdc;
        uniswapRouter = ISwapRouter(_uniswapRouter);
        sushiswapRouter = IUniswapV2Router02(_sushiswapRouter);
    }

    function getQuoteUniswapV3(
        uint256 amountIn,
        address tokenIn,
        address tokenOut,
        uint24 fee
    ) public returns (uint256) {
        IQuoterV2.QuoteExactInputSingleParams memory params = IQuoterV2.QuoteExactInputSingleParams({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            amountIn: amountIn,
            fee: fee,
            sqrtPriceLimitX96: 0
        });

        (uint256 amountOut, , , ) = IQuoterV2(quoter).quoteExactInputSingle(params);
        return amountOut;
    }

    function getQuoteSushiswap(uint256 amountIn, address tokenIn, address tokenOut) public view returns (uint256 amountOut) {
        address pair = IUniswapV2Factory(sushiswapFactory).getPair(tokenIn, tokenOut);
        require(pair != address(0), "Pair not found");

        (uint112 reserve0, uint112 reserve1, ) = IUniswapV2Pair(pair).getReserves();
        address token0 = IUniswapV2Pair(pair).token0();

        uint reserveIn;
        uint reserveOut;
        if (token0 == tokenIn) {
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
        if (_i == 0) return "0";
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
    /// @param tokenIn The input token address
    /// @param tokenOut The output token address 
    /// @return bestAmountOut The highest combined output
    /// @return dex A human-readable route description
    /// @return minAmountOut Minimum output accounting for slippage
    /// @return splitPercentToUni Percentage of trade to route through Uniswap
    function getBestQuoteWithSplit( uint256 amountIn, address tokenIn, address tokenOut, uint256 slippageBps) external 
    returns (uint256 bestAmountOut, string memory dex, uint256 minAmountOut, uint256 splitPercentToUni ) {
        // STEP 1: Find best Uniswap V3 fee tier
        uint24[3] memory fees = [uint24(500), 3000, 10000];
        uint256 bestUniOut = 0;
        uint24 bestUniFee = 3000;

        for (uint256 i = 0; i < fees.length; i++) {
            uint256 quote = getQuoteUniswapV3(amountIn, tokenIn, tokenOut, fees[i]);
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

            uint256 uniOut = getQuoteUniswapV3(uniAmount, tokenIn, tokenOut, bestUniFee);
            uint256 sushiOut = getQuoteSushiswap(sushiAmount, tokenIn, tokenOut);

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

    /// @notice Generic function to execute a swap from tokenIn to tokenOut.
    /// @param amountIn The input amount of tokenIn.
    /// @param tokenIn The input token address.
    /// @param tokenOut The output token address.
    /// @param uniFee The Uniswap V3 fee tier.
    /// @param splitPercentToUni The percentage of tokenIn to route through Uniswap V3 (0-100). The remainder goes to Sushiswap.
    /// @param minTotalAmountOut The minimum acceptable total output.
    /// @param deadline The deadline timestamp for the swap.
    /// @return totalOut The total tokenOut received.
    function executeSwap(
        uint256 amountIn,
        address tokenIn,
        address tokenOut,
        uint24 uniFee,
        uint256 splitPercentToUni,
        uint256 minTotalAmountOut,
        uint256 deadline
    ) external returns (uint256 totalOut) {
        require(block.timestamp <= deadline, "Deadline expired");
        require(splitPercentToUni <= 100, "Invalid split percentage");

        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        uint256 uniAmount = (amountIn * splitPercentToUni) / 100;
        uint256 sushiAmount = amountIn - uniAmount;

        uint256 uniOut = 0;
        if (uniAmount > 0) {
            IERC20(tokenIn).approve(address(uniswapRouter), uniAmount);
            uniOut = _swapUniswapGeneric(uniAmount, tokenIn, tokenOut, uniFee, deadline);
        }

        uint256 sushiOut = 0;
        if (sushiAmount > 0) {
            IERC20(tokenIn).approve(address(sushiswapRouter), sushiAmount);
            sushiOut = _swapSushiswapGeneric(sushiAmount, tokenIn, tokenOut, deadline);
        }

        totalOut = uniOut + sushiOut;
        require(totalOut >= minTotalAmountOut, "Slippage exceeded");

        // Transfer tokenOut back to sender.
        IERC20(tokenOut).safeTransfer(msg.sender, totalOut);
        emit SwapExecuted(msg.sender, amountIn, totalOut, uniAmount, sushiAmount, uniFee, splitPercentToUni, tokenIn, tokenOut);
    }

    // Internal helper for Uniswap V3 swap (generic)
    function _swapUniswapGeneric(
        uint256 amountIn,
        address tokenIn,
        address tokenOut,
        uint24 fee,
        uint256 deadline
    ) internal returns (uint256) {
        try uniswapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: fee,
                recipient: address(this),
                deadline: deadline,
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 amountOut) {
            return amountOut;
        } catch {
            return 0;
        }
    }

    // Internal helper for Sushiswap swap (generic)
    function _swapSushiswapGeneric(
        uint256 amountIn,
        address tokenIn,
        address tokenOut,
        uint256 deadline
    ) internal returns (uint256) {
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        try sushiswapRouter.swapExactTokensForTokens(
            amountIn,
            0,
            path,
            address(this),
            deadline
        ) returns (uint[] memory amounts) {
            return amounts[amounts.length - 1];
        } catch {
            return 0;
        }
    }
}