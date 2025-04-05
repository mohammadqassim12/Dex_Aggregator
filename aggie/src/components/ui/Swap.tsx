import { useState, useEffect } from "react";
import { ArrowDown, RefreshCw, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

// Define token interface
interface Token {
  id: string;
  name: string;
  symbol: string;
  balance?: bigint;
  logo: string;
}

// Define exchange rates interface
interface ExchangeRates {
  [key: string]: {
    [key: string]: bigint;
  };
}

// Mock token data
const tokens: Token[] = [
  { id: "eth", name: "Ethereum", symbol: "ETH", logo: eth, balance: 1n },
  { id: "usdc", name: "USD Coin", symbol: "USDC", logo: usdc, balance: 1n }
];

export const Swap = () => {
  const [fromToken, setFromToken] = useState(tokens[0]);
  const [toToken, setToToken] = useState(tokens[1]);
  const [fromAmount, setFromAmount] = useState(0n);
  const [toAmount, setToAmount] = useState(0n);
  const [rate, setRate] = useState(0n);
  const [loading, setLoading] = useState(false);
  const [showTokenSelectFrom, setShowTokenSelectFrom] = useState(false);
  const [showTokenSelectTo, setShowTokenSelectTo] = useState(false);

  const getQuote = async (
    from: Token | null,
    to: Token | null,
    amount: bigint
  ) => {
    if (!from || !to || amount <= 0n) {
      setToAmount(0n);
      setRate(0n);
      return;
    }

    const mockExchangeRates: ExchangeRates = {
      eth: { usdc: 1500n },
      usdc: { eth: 0n },
    };

    const exchangeRate = mockExchangeRates[from.id]?.[to.id] || 0n;
    setRate(exchangeRate);

    if (exchangeRate > 0n) {
      const calculatedToAmount = (amount * exchangeRate) / 1000n;
      setToAmount(calculatedToAmount);
    } else {
      setToAmount(0n);
    }
  };

  useEffect(() => {
    if (fromAmount) {
      getQuote(fromToken, toToken, fromAmount);
    }
  }, [fromToken, toToken, fromAmount]);

  const handleSwapTokens = (): void => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  };

  const handleSwap = async () => {
    setLoading(true);
    alert(`Swapped ${fromAmount} ${fromToken.symbol} for ${toAmount} ${toToken.symbol}`);
    setLoading(false);
    setFromAmount(0n);
    setToAmount(0n);
  };

  interface TokenSelectProps {
    token: Token;
    onSelect: (token: Token) => void;
    side: "from" | "to";
  }

  const TokenSelect = ({ token, onSelect, side }: TokenSelectProps) => {
    return (
      <Dialog
        open={side === "from" ? showTokenSelectFrom : showTokenSelectTo}
        onOpenChange={
          side === "from" ? setShowTokenSelectFrom : setShowTokenSelectTo
        }
      >
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
                  if (side === "from") {
                    setShowTokenSelectFrom(false);
                  } else {
                    setShowTokenSelectTo(false);
                  }
                }}
              >
                <div className="flex items-center gap-3">
                  <img src={t.logo} alt={t.name} className="w-6 h-6" />
                  <div>
                    <div>{t.name}</div>
                    <div className="text-sm text-neutral-500">{t.symbol}</div>
                  </div>
                </div>
                <div>{t.balance}</div>
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
            <CardTitle className="text-xl border-0 px-6 py-2 rounded-3xl dark:bg-neutral-800/50">Swap</CardTitle>
            <Button variant="ghost" size="icon" className="h-10 w-10 p-0 m-0">
              <Settings color="#FFDE21" size={32} className="h-8 w-8"/>
            </Button>
          </div>

          {/* From token */}
          <div className="bg-y-100 dark:bg-neutral-800/50 rounded-xl p-4 mb-2 pb-10">
            <CardHeader className="text-neutral-400 w-1/2 px-0">
              You pay
            </CardHeader>
            <div className="flex justify-between">
              <Input
                type="number"
                placeholder="0"
                value={Number(fromAmount)||""}
                onChange={(e) => setFromAmount(BigInt(e.target.value))}
                className="border-none !text-3xl bg-transparent dark:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-auto [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <TokenSelect
                token={fromToken}
                onSelect={setFromToken}
                side="from"
              />
            </div>
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
                type="number"
                placeholder="0"
                value={Number(toAmount)}
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
}
