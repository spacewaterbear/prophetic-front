"use client";

import { useState, useEffect, lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { LogOut } from "lucide-react";
import Image from "next/image";
import { useTheme } from "next-themes";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MessageItem } from "@/components/chat/MessageItem";

// Lazy load Markdown component
const Markdown = lazy(() =>
  import("@/components/Markdown").then((mod) => ({ default: mod.Markdown })),
);

const CORRECT_PASSWORD = "wholehigh75";

interface Message {
  id: number;
  sender: "user" | "assistant";
  content: string;
}

const LOREM_MESSAGES: Message[] = [
  {
    id: 1,
    sender: "user",
    content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua?"
  },
  {
    id: 2,
    sender: "assistant",
    content: "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.\n\n| Asset | Price | Change (24h) | Market Cap |\n|-------|-------|--------------|------------|\n| Lorem Ipsum | $45,230 | +5.2% | $850B |\n| Dolor Sit | $3,120 | -2.1% | $420B |\n| Consectetur | $890 | +12.4% | $125B |\n| Adipiscing | $0.85 | -0.3% | $45B |"
  },
  {
    id: 3,
    sender: "user",
    content: "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum?"
  },
  {
    id: 4,
    sender: "assistant",
    content: "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.\n\n### Investment Portfolio Analysis\n\n| Category | Allocation | Annual Return | Risk Level |\n|----------|------------|---------------|------------|\n| Stocks | 45% | 12.5% | High |\n| Bonds | 30% | 4.2% | Low |\n| Real Estate | 15% | 8.7% | Medium |\n| Commodities | 10% | 6.3% | High |\n\nNeque porro quisquam est, qui dolorem ipsum quia dolor sit amet."
  },
  {
    id: 5,
    sender: "user",
    content: "Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit?"
  },
  {
    id: 6,
    sender: "assistant",
    content: "Sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Here's a comparison table:\n\n| Feature | Basic Plan | Premium Plan | Enterprise |\n|---------|-----------|--------------|------------|\n| Lorem Ipsum | ✓ | ✓ | ✓ |\n| Dolor Sit Amet | ✗ | ✓ | ✓ |\n| Consectetur | ✗ | ✗ | ✓ |\n| Price/month | $29 | $99 | $299 |\n\nNeque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit."
  },
  {
    id: 7,
    sender: "user",
    content: "Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam?"
  },
  {
    id: 8,
    sender: "assistant",
    content: "Nisi ut aliquid ex ea commodi consequatur? Here's the detailed breakdown:\n\n| Quarter | Revenue | Growth | Profit Margin |\n|---------|---------|--------|---------------|\n| Q1 2024 | $2.4M | +15% | 22% |\n| Q2 2024 | $2.8M | +16.7% | 24% |\n| Q3 2024 | $3.1M | +10.7% | 26% |\n| Q4 2024 | $3.5M | +12.9% | 28% |\n\nQuis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur."
  }
];

export default function TestVisiPage() {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const isDark = theme === "dark" || resolvedTheme === "dark";
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [remainingTime, setRemainingTime] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (lockoutUntil) {
      const interval = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((lockoutUntil - now) / 1000));
        setRemainingTime(remaining);

        if (remaining === 0) {
          setLockoutUntil(null);
          setError("");
        }
      }, 100);

      return () => clearInterval(interval);
    }
  }, [lockoutUntil]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (lockoutUntil && Date.now() < lockoutUntil) {
      return;
    }

    if (password === CORRECT_PASSWORD) {
      setIsAuthenticated(true);
      setError("");
      setFailedAttempts(0);
    } else {
      const newFailedAttempts = failedAttempts + 1;
      setFailedAttempts(newFailedAttempts);

      const lockoutSeconds = Math.pow(2, newFailedAttempts);
      const lockoutTime = Date.now() + (lockoutSeconds * 1000);
      setLockoutUntil(lockoutTime);
      setRemainingTime(lockoutSeconds);

      setError(`Incorrect password. Please wait ${lockoutSeconds} seconds before trying again.`);
      setPassword("");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPassword("");
    setFailedAttempts(0);
    setLockoutUntil(null);
    setError("");
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[rgb(247,240,232)] dark:bg-[rgb(1,1,0)] p-4">
        <Card className="w-full max-w-md p-8 bg-[rgb(230,220,210)] dark:bg-[#1e1f20]">
          <h1 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-white">Test Visi Access</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={lockoutUntil !== null && Date.now() < lockoutUntil}
                className="w-full"
              />
            </div>
            {error && (
              <div className="text-sm text-red-500">
                {error}
                {remainingTime > 0 && (
                  <div className="mt-1 font-mono">
                    Time remaining: {remainingTime}s
                  </div>
                )}
              </div>
            )}
            <Button
              type="submit"
              className="w-full bg-gray-800 hover:bg-gray-700 text-white"
              disabled={lockoutUntil !== null && Date.now() < lockoutUntil}
            >
              {lockoutUntil && Date.now() < lockoutUntil ? `Wait ${remainingTime}s` : "Access"}
            </Button>
            {failedAttempts > 0 && (
              <div className="text-xs text-gray-600 dark:text-gray-400 text-center">
                Failed attempts: {failedAttempts}
              </div>
            )}
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[rgb(247,240,232)] dark:bg-[rgb(1,1,0)]">
      {/* Header matching main chat design */}
      <header className="bg-[rgba(247,240,232,0.8)] dark:bg-black backdrop-blur-md border-b border-gray-300 dark:border-gray-800 px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image
            src={
              mounted && isDark
                ? "https://siomjdoyjuuwlpimzaju.supabase.co/storage/v1/object/public/front/logo/logo_text_blanc.svg"
                : "https://siomjdoyjuuwlpimzaju.supabase.co/storage/v1/object/public/front/logo/logo_text.svg"
            }
            alt="Prophetic Orchestra"
            width={180}
            height={45}
            className="h-7 sm:h-10 w-auto"
          />
          <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            (Test Mode)
          </span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="flex items-center gap-2 text-gray-700 dark:text-gray-300"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </header>

      {/* Messages matching main chat design */}
      <div className="py-4 sm:py-8 px-3 sm:px-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {LOREM_MESSAGES.map((message) => (
            <MessageItem key={message.id} message={message} userName="U">
              {message.sender === "assistant" ? (
                <Suspense fallback={<div className="text-base text-gray-400 px-[10px]">Loading...</div>}>
                  <Markdown content={message.content} className="text-base" />
                </Suspense>
              ) : (
                <p className="text-base leading-relaxed whitespace-pre-wrap px-[10px]">
                  {message.content}
                </p>
              )}
            </MessageItem>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 text-xs text-gray-600 dark:text-gray-400 bg-[rgb(230,220,210)] dark:bg-[#1e1f20] px-4 py-2 rounded-full">
        Test endpoint with lorem ipsum content
      </div>
    </div>
  );
}
