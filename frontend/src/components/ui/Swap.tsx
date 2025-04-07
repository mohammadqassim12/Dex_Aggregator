import { useState, useEffect } from "react";
import { ArrowDown, RefreshCw, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import eth from "../../public/eth.png";
import usdc from "../../public/usdc.png";
import { useAccount, useBalance, useWriteContract, useSimulateContract, useBlockNumber } from "wagmi";
import { dexAggABI } from "@/contracts/dexAggABI";

// Define token interface
interface Token {
  id: string;
  name: string;
  symbol: string;
  balance?: bigint;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  logo: any;
  address: `0x${string}`;
  decimals: number;
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
  const [fromAmountInput, setFromAmountInput] = useState<string>("");
  const [toAmount, setToAmount] = useState<bigint>(0n);

  const [loading, setLoading] = useState<boolean>(false);

  // Token selection
  const [showTokenSelectFrom, setShowTokenSelectFrom] = useState<boolean>(false);
  const [showTokenSelectTo, setShowTokenSelectTo] = useState<boolean>(false);

  // Settings
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [slippage, setSlippage] = useState<number>(0.5);
  const [slippageInput, setSlippageInput] = useState<string>("0.5");
  const [deadline, setDeadline] = useState<number>(2); // Default 2 minutes

  const { address: userAddress } = useAccount();
  const { data: hash, writeContract, isPending, isSuccess, isError, reset } = useWriteContract();
  const { writeContract: writeContractApp} = useWriteContract();


  // Get from token balance
  const { data: fromBal } = useBalance({
    address: userAddress,
    token: fromToken.address,
    query: {
      refetchInterval: 10000,
    },
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

  // Update from token balance
  useEffect(() => {
    reset();
    if (fromBal) {
      setTokens((prevTokens) => {
        return prevTokens.map((token) => {
          if (token.id === fromToken.id) {
            return { ...token, balance: fromBal.value };
          }
          return token;
        });
      });
    }
  }, [fromBal, fromToken.id]);

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
    address: dexAggABI.address as `0x${string}`,
    abi: dexAggABI.abi,
    functionName: "getBestQuoteWithSplit",
    args: [fromAmount, fromToken.address, toToken.address, BigInt(slippage * 100)],
    query: {
      enabled: fromAmount > 0n,
    },
  });

  useEffect(() => {
    if (exchangedToken.isSuccess && exchangedToken.data) {
      reset();
      const exchange = exchangedToken.data.result[0].toString();
      setToAmount(BigInt(exchange));
    }
  }, [exchangedToken.isSuccess, exchangedToken.data, reset]);

  const handleSwapTokens = (): void => {
    reset();
    const tempToken = fromToken;
    setFromToken(toToken);
    setFromAmount(toAmount);
    setToToken(tempToken);
    setFromAmountInput(formatBalance(toAmount, toToken.decimals));
    setToAmount(0n);
  };

  const { data: blockNumber } = useBlockNumber({ watch: true })
  const handleSwap = async () => {
    setLoading(true);
    try {
      if (!exchangedToken.data || !exchangedToken.data.result || blockNumber === undefined || fromAmount === 0n) {
        return;
      }
      const amountIn = fromAmount;
      writeContract({
        address: fromToken.address as `0x${string}`,
        abi: [
          {
            name: "approve",
            type: "function",
            inputs: [
              { name: "spender", type: "address" },
              { name: "amount", type: "uint256" },
            ],
          },
        ],
        functionName: "approve",
        args: [dexAggABI.address, amountIn],
      });
      writeContract({
        address: dexAggABI.address as `0x${string}`,
        abi: dexAggABI.abi,
        functionName: "executeSwap",
        args: [
          amountIn,
          fromToken.address,
          toToken.address,
          exchangedToken.data?.result[4],
          exchangedToken.data?.result[3],
          // exchangedToken.data?.result[2],
          0n,
          BigInt(Math.floor(Date.now() / 1000) + deadline * 60 * 1000),
        ],
      });
      setFromAmount(0n);
      setToAmount(0n);
      setFromAmountInput("");
    } catch (error) {
      console.error("Swap error:", error);
      alert("Swap failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleFromAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFromAmountInput(value);

    if (value === "") {
      setFromAmount(0n);
      setToAmount(0n);
      return;
    }

    try {
      const [whole, frac = ""] = value.split(".");
      const wholeBigInt = whole === "" ? 0n : BigInt(whole);
      const decimal = wholeBigInt * BigInt(10) ** BigInt(fromToken.decimals);

      if (frac) {
        const paddedFrac = frac.padEnd(fromToken.decimals, "0").slice(0, fromToken.decimals);
        const fracBigInt = BigInt(paddedFrac);
        setFromAmount(decimal + fracBigInt);
      } else {
        setFromAmount(decimal);
      }
    } catch (error) {
      console.error("Invalid input:", error);
    }
  };

  const handleSlippageSliderChange = (value: number[]) => {
    setSlippage(value[0]);
    setSlippageInput(value[0].toString());
  };

  const handleSlippageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSlippageInput(value);

    if (value === "") {
      setSlippage(0);
      return;
    }

    const parsedValue = parseFloat(value);
    if (!isNaN(parsedValue) && parsedValue >= 0 && parsedValue <= 100) {
      setSlippage(parsedValue);
    }
  };

  const handleDeadlineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value === "") {
      setDeadline(1);
      return;
    }

    const value = parseInt(e.target.value);
    if (value > 0) {
      setDeadline(value);
    }
  };

  interface TokenSelectProps {
    token: Token;
    onSelect: (token: Token) => void;
    side: "from" | "to";
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }

  const TokenSelect = ({ token, onSelect, side, open, onOpenChange }: TokenSelectProps) => {
    const currentTokenId = side === "from" ? fromToken.id : toToken.id;

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
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
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer 
                ${t.id === currentTokenId ? "text-neutral-600" : "hover:bg-neutral-100 dark:hover:bg-neutral-800"}`}
                onClick={() => {
                  if (t.id === currentTokenId) return;
                  onSelect(t);
                  onOpenChange(false);
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
            <Dialog open={showSettings} onOpenChange={setShowSettings}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 p-0 m-0">
                  <Settings color="#FFDE21" size={32} className="h-8 w-8" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Transaction Settings</DialogTitle>
                </DialogHeader>
                <div className="py-2">
                  <div className="pb-2">
                    <Label className="text-md">Slippage Tolerance</Label>
                    <div className="flex items-between gap-2">
                      <Slider
                        value={[slippage]}
                        min={0.1}
                        max={5}
                        step={0.1}
                        onValueChange={handleSlippageSliderChange}
                        className="flex-1"
                      />
                      <div className="flex items-center gap-1">
                        <Input
                          type="text"
                          value={slippageInput}
                          onChange={handleSlippageInputChange}
                          className="w-16"
                        />
                        <div>%</div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label className="text-md pb-2">Transaction Deadline</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        type="number"
                        value={deadline}
                        onChange={handleDeadlineChange}
                        className="w-20"
                        min={1}
                      />
                      <div>minutes</div>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => setShowSettings(false)}>Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
                value={fromAmountInput}
                onChange={handleFromAmountChange}
                className="border-none !text-3xl bg-transparent dark:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-auto [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <TokenSelect
                token={fromToken}
                onSelect={handleSwapTokens}
                side="from"
                open={showTokenSelectFrom}
                onOpenChange={setShowTokenSelectFrom}
              />
            </div>
            <CardDescription>
              bal: {fromToken.balance ? formatBalance(fromToken.balance, fromToken.decimals, 6) : "0"}{" "}
              {fromToken.symbol}
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
          <div className="bg-y-100 dark:bg-neutral-800/50 rounded-xl p-4 mb-2 pb-10">
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
              <TokenSelect
                token={toToken}
                onSelect={handleSwapTokens}
                side="to"
                open={showTokenSelectTo}
                onOpenChange={setShowTokenSelectTo}
              />
            </div>
          </div>

          {/* Transaction Result */}
          {isPending && (
            <div className="text-sm text-neutral-500 px-2 mb-2">
              Swapping...
            </div>
          )}
          {isError && (
            <div className="text-sm text-red-500 px-2 mb-2">
              Error swapping
            </div>
          )}
          {isSuccess && (
            <div className="text-sm text-green-500 px-2 mb-2">
              Swap successful! Hash: {hash}
            </div>
          )}

          {/* Rate display */}
          {fromAmount > 0n && toAmount > 0n && (
            <>
              <div className="text-sm text-neutral-500 px-2">
                1 {fromToken.symbol} ≈ {" "}
                {formatBalance((toAmount * BigInt(10 ** fromToken.decimals)) / fromAmount, toToken.decimals, 6)}
                {" "} {toToken.symbol}
              </div>
              <div className="text-sm text-neutral-500 px-2 mb-2">
                Uniswap: {exchangedToken.data?.result[3]}{"% | "}
                Sushiswap: {BigInt(100) - (exchangedToken.data?.result[3] ?? 0n)}%
              </div>
            </>
          )}

          {/* Swap button */}
          <Button
            className="w-full bg-yellow-500 py-6 h-10 rounded-xl"
            size="lg"
            disabled={!fromAmount || !toAmount || loading || fromAmount > (fromToken.balance ?? 0n)}
            onClick={handleSwap}
          >
            {isPending ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Swapping ...</span>
              </div>
            ) : exchangedToken.isLoading ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Getting quote...</span>
              </div>
            ) : !fromAmount ? (
              "Enter an amount"
            ) : fromAmount > (fromToken.balance ?? 0n) ? (
              "Insufficient balance"
            ) : (
              "Approve + Swap"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Swap;
