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
        uint256 splitPercentToUni
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

    // Original functions unchanged
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

    // Original function with security improvements
    function getBestQuoteWithSplit(uint256 amountIn, uint256 slippageBps)
        external
        returns (
            uint256 bestAmountOut,
            string memory dex,
            uint256 minAmountOut,
            uint256 splitPercentToUni
        )
    {
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

        uint256 maxOut = 0;
        uint256 bestSplit = 0;

        // Optimized split finding with binary search
        uint256 low = 0;
        uint256 high = 100;
        while (low <= high) {
            uint256 mid = (low + high) / 2;
            (uint256 out1, uint256 split1) = _checkSplit(amountIn, bestUniFee, mid);
            (uint256 out2, ) = _checkSplit(amountIn, bestUniFee, mid + 1);
            
            if (out1 > maxOut) {
                maxOut = out1;
                bestSplit = split1;
            }
            if (out2 > maxOut) {
                maxOut = out2;
                bestSplit = mid + 1;
            }
            
            if (out2 > out1) low = mid + 1;
            else high = mid - 1;
        }

        minAmountOut = (maxOut * (10000 - slippageBps)) / 10000;
        dex = string(
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

        return (maxOut, dex, minAmountOut, bestSplit);
    }

    // Secure version of executeSwap with original interface
    function executeSwap(
        uint256 amountIn,
        uint24 uniFee,
        uint256 splitPercentToUni,
        uint256 minTotalAmountOut,
        uint256 deadline
    ) external returns (uint256 totalUSDC) {
        require(block.timestamp <= deadline, "Deadline expired");
        require(splitPercentToUni <= 100, "Invalid split percentage");

        // Safe token transfer
        IERC20(weth).safeTransferFrom(msg.sender, address(this), amountIn);

        uint256 uniAmount = (amountIn * splitPercentToUni) / 100;
        uint256 sushiAmount = amountIn - uniAmount;

        uint256 uniUSDC = 0;
        if (uniAmount > 0) {
            IERC20(weth).approve(address(uniswapRouter), uniAmount);
            uniUSDC = _swapUniswap(uniAmount, uniFee, deadline);
        }

        uint256 sushiUSDC = 0;
        if (sushiAmount > 0) {
            IERC20(weth).approve(address(sushiswapRouter), sushiAmount);
            sushiUSDC = _swapSushiswap(sushiAmount, deadline);
        }

        totalUSDC = uniUSDC + sushiUSDC;
        require(totalUSDC >= minTotalAmountOut, "Slippage exceeded");

        IERC20(usdc).safeTransfer(msg.sender, totalUSDC);
        emit SwapExecuted(msg.sender, amountIn, totalUSDC, uniAmount, sushiAmount, uniFee, splitPercentToUni);
    }

    // Internal helpers for swap execution
    function _swapUniswap(uint256 amountIn, uint24 fee, uint256 deadline) internal returns (uint256) {
        try uniswapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: weth,
                tokenOut: usdc,
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

    function _swapSushiswap(uint256 amountIn, uint256 deadline) internal returns (uint256) {
        address[] memory path = new address[](2);
        path[0] = weth;
        path[1] = usdc;

        try sushiswapRouter.swapExactTokensForTokens(
            amountIn,
            0,
            path,
            address(this),
            deadline
        ) returns (uint[] memory amounts) {
            return amounts[1];
        } catch {
            return 0;
        }
    }

    // Internal helper for split optimization
    function _checkSplit(uint256 amountIn, uint24 fee, uint256 split) internal returns (uint256 out, uint256 actualSplit) {
        actualSplit = split > 100 ? 100 : split;
        uint256 uniAmount = amountIn * actualSplit / 100;
        uint256 sushiAmount = amountIn - uniAmount;
        
        uint256 uniOut = getQuoteUniswapV3(uniAmount, weth, usdc, fee);
        uint256 sushiOut = getQuoteSushiswap(sushiAmount);
        
        return (uniOut + sushiOut, actualSplit);
    }
}