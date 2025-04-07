import { useState, useEffect, use } from "react";
import { ArrowDown, RefreshCw, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import eth from "../../public/eth.png";
import usdc from "../../public/usdc.png";
import { useAccount, useBalance, useWriteContract, useSimulateContract, type UseSimulateContractReturnType } from "wagmi";
import { dexAggABI } from "@/contracts/dexAggABI";

// Define token interface
interface Token {
  id: string;
  name: string;
  symbol: string;
  balance?: bigint;
  logo: any;
  address: `0x${string}`;
  decimals: number;
}

// Define exchange rates interface
interface ExchangeRates {
  [key: string]: {
    [key: string]: bigint;
  };
}

const tokensData: Token[] = [
  {
    id: "weth",
    name: "Wrapped Ethereum",
    symbol: "WETH",
    logo: eth,
    address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    decimals: 18,
  },
  {
    id: "usdc",
    name: "USD Coin",
    symbol: "USDC",
    logo: usdc,
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    decimals: 6,
  },
];

export const Swap = () => {
  const [tokens, setTokens] = useState<Token[]>(tokensData);
  const [fromToken, setFromToken] = useState<Token>(tokens[0]);
  const [toToken, setToToken] = useState<Token>(tokens[1]);
  const [fromAmount, setFromAmount] = useState<bigint>(0n);
  const [toAmount, setToAmount] = useState<bigint>(0n);
  const [rate, setRate] = useState<bigint>(0n);
  const [loading, setLoading] = useState<boolean>(false);
  const [showTokenSelectFrom, setShowTokenSelectFrom] = useState<boolean>(false);
  const [showTokenSelectTo, setShowTokenSelectTo] = useState<boolean>(false);

  const { address: userAddress } = useAccount();
  const { data: hash, writeContract } = useWriteContract();

  // Get WETH balance
  const { data: wethBalanceData } = useBalance({
    address: userAddress,
    token: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  });

  // Get from token balance
  const { data: fromBalanceData } = useBalance({
    address: userAddress,
    token: fromToken.id === "eth" ? "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" : fromToken.address,
  });

  // Get to token balance
  const { data: toBalanceData } = useBalance({
    address: userAddress,
    token: toToken.id === "eth" ? "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" : toToken.address,
  });

  const formatBalance = (value: bigint, decimals: number, maxDecimals: number = 6): string => {
    if (!value) return "0";

    const divisor = BigInt(10) ** BigInt(decimals);
    const whole = value / divisor;
    const frac = value % divisor;

    let fracStr = frac.toString();
    fracStr = fracStr.padStart(decimals, "0");

    // Limit to maxDecimals and remove trailing zeros
    fracStr = fracStr.substring(0, maxDecimals).replace(/0+$/, "");

    if (fracStr === "") {
      return whole.toString();
    }

    return `${whole}.${fracStr}`;
  };

  // Update ETH token with WETH balance
  useEffect(() => {
    if (wethBalanceData) {
      setTokens((prevTokens) => {
        return prevTokens.map((token) => {
          if (token.id === "eth") {
            return { ...token, balance: wethBalanceData.value };
          }
          return token;
        });
      });
    }
  }, [wethBalanceData]);

  // Update from token balance
  useEffect(() => {
    if (fromBalanceData) {
      setTokens((prevTokens) => {
        return prevTokens.map((token) => {
          if (token.id === fromToken.id) {
            return { ...token, balance: fromBalanceData.value };
          }
          return token;
        });
      });
    }
  }, [fromBalanceData, fromToken.id]);

  // Update to token balance
  useEffect(() => {
    if (toBalanceData) {
      setTokens((prevTokens) => {
        return prevTokens.map((token) => {
          if (token.id === toToken.id) {
            return { ...token, balance: toBalanceData.value };
          }
          return token;
        });
      });
    }
  }, [toBalanceData, toToken.id]);

  // Update fromToken and toToken when tokens state changes
  useEffect(() => {
    const updatedFromToken = tokens.find((t) => t.id === fromToken.id);
    const updatedToToken = tokens.find((t) => t.id === toToken.id);

    if (updatedFromToken) {
      setFromToken(updatedFromToken);
    }

    if (updatedToToken) {
      setToToken(updatedToToken);
    }
  }, [tokens]);

  const exchangedToken = useSimulateContract({
    ...dexAggABI,
    functionName: "getBestQuoteWithSplit",
    args: [
      fromAmount,
      50n,
    ],
    query: {
      enabled: fromAmount > 0n,
    }
  });
  useEffect(() => {
    if (exchangedToken.isSuccess && exchangedToken.data) {
      const exchange = exchangedToken.data.result[0].toString();
      setToAmount(BigInt(exchange));
    }
  }, [exchangedToken.isSuccess, exchangedToken.data]);

  const handleSwapTokens = (): void => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  };

  const handleSwap = async () => {
    setLoading(true);
    try {
      alert(`Swapped ${formatBalance(fromAmount, fromToken.decimals)} ${fromToken.symbol} for ${formatBalance(toAmount, toToken.decimals)} ${toToken.symbol}`);
      setFromAmount(0n);
      setToAmount(0n);
    } catch (error) {
      console.error("Swap failed:", error);
      alert("Swap failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleFromAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "") {
      setFromAmount(0n);
      setToAmount(0n);
    } else {
      try {
        const [whole, frac = ""] = value.split(".");
        const decimal = BigInt(whole) * BigInt(10) ** BigInt(fromToken.decimals);

        if (frac) {
          const formatFrac = frac.padEnd(fromToken.decimals, "0").slice(0, fromToken.decimals);
          const valFrac = BigInt(formatFrac);
          setFromAmount(decimal + valFrac);
        } else {
          setFromAmount(decimal);
        }
      } catch (error) {
        console.error("Invalid input:", error);
      }
    }
  };

  interface TokenSelectProps {
    token: Token;
    onSelect: (token: Token) => void;
    side: "from" | "to";
  }

  const TokenSelect = ({ token, onSelect, side }: TokenSelectProps) => {
    const isOpen = side === "from" ? showTokenSelectFrom : showTokenSelectTo;
    const setIsOpen = side === "from" ? setShowTokenSelectFrom : setShowTokenSelectTo;

    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2 px-3">
            <img src={token.logo} alt={token.name} className="w-6 h-6" />
            <span>{token.symbol}</span>
            <span>▼</span>
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select a token</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-4">
            {tokens.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between p-3 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg cursor-pointer"
                onClick={() => {
                  onSelect(t);
                  setIsOpen(false);
                }}
              >
                <div className="flex items-center gap-3">
                  <img src={t.logo} alt={t.name} className="w-6 h-6" />
                  <div>
                    <div>{t.name}</div>
                    <div className="text-sm text-neutral-500">{t.symbol}</div>
                  </div>
                </div>
                <div>{t.balance ? formatBalance(t.balance, t.decimals, 6) : "0"}</div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="flex justify-center items-center p-4">
      <Card className="w-1/3 h-1/2 border-none bg-transparent">
        <CardContent className="pt-6">
          <div className="flex justify-between items-center mb-6">
            <CardTitle className="text-xl border-0 px-6 py-2 rounded-3xl dark:bg-neutral-800/50">
              Swap
            </CardTitle>
            <Button variant="ghost" size="icon" className="h-10 w-10 p-0 m-0">
              <Settings color="#FFDE21" size={32} className="h-8 w-8" />
            </Button>
          </div>

          {/* From token */}
          <div className="bg-y-100 dark:bg-neutral-800/50 rounded-xl p-4 mb-2 pb-8">
            <CardHeader className="text-neutral-400 w-1/2 px-0">
              You pay
            </CardHeader>
            <div className="flex justify-between pb-2">
              <Input
                type="text"
                placeholder="0"
                value={fromAmount === 0n ? "" : formatBalance(fromAmount, fromToken.decimals)}
                onChange={handleFromAmountChange}
                className="border-none !text-3xl bg-transparent dark:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-auto [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <TokenSelect
                token={fromToken}
                onSelect={setFromToken}
                side="from"
              />
            </div>
            <CardDescription>
              bal: {fromToken.balance ? formatBalance(fromToken.balance, fromToken.decimals, 6) : "0"} {fromToken.symbol}
            </CardDescription>
          </div>

          {/* Swap button */}
          <div className="flex justify-center -my-3 z-10 relative">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full bg-neutral-100 dark:bg-neutral-800 h-10 w-10 border-4 border-neutral-50 dark:border-neutral-900 hover:opacity-100 dark:hover:opacity-100"
              onClick={handleSwapTokens}
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
          </div>

          {/* To token */}
          <div className="bg-y-100 dark:bg-neutral-800/50 rounded-xl p-4 mb-4 pb-10">
            <CardHeader className="text-neutral-400 w-1/2 px-0">
              You receive
            </CardHeader>
            <div className="flex justify-between">
              <Input
                type="text"
                placeholder="0"
                value={toAmount === 0n ? "" : formatBalance(toAmount, toToken.decimals, 6)}
                readOnly
                className="border-none !text-3xl bg-transparent dark:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-auto [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <TokenSelect token={toToken} onSelect={setToToken} side="to" />
            </div>
          </div>

          {/* Swap button */}
          <Button
            className="w-full bg-yellow-500 py-6 h-10 rounded-xl"
            size="lg"
            disabled={!fromAmount || !toAmount || loading}
            onClick={handleSwap}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>{fromAmount ? "Swapping..." : "Getting quote..."}</span>
              </div>
            ) : !fromAmount ? (
              "Enter an amount"
            ) : (
              "Swap"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
