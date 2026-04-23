"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Send } from "lucide-react";
import { getInitials, formatCurrency } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/lib/utils";

const SUGGESTED = [
  "What category do I spend most on?",
  "Which group costs me the most?",
  "Who do I owe money to?",
  "How does this month compare to last month?",
];

export default function ProfilePage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState({ groups: 0, expenses: 0, total: 0 });
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const { chatHistory, addChatMessage, updateLastMessage } = useAppStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  useEffect(() => {
    Promise.all([
      fetch("/api/groups").then((r) => r.json()),
      fetch("/api/expenses").then((r) => r.json()),
    ]).then(([groups, expenses]) => {
      setStats({
        groups: groups.length,
        expenses: expenses.length,
        total: expenses.reduce((s: number, e: { amount: number }) => s + e.amount, 0),
      });
    });
  }, []);

  async function sendMessage(text?: string) {
    const content = (text ?? input).trim();
    if (!content || streaming) return;
    const userMsg = { role: "user" as const, content };
    addChatMessage(userMsg);
    setInput("");
    setStreaming(true);
    addChatMessage({ role: "assistant", content: "" });

    const res = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [...chatHistory, userMsg] }),
    });

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    let accumulated = "";
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        updateLastMessage(accumulated);
      }
    }
    setStreaming(false);
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-sora)" }}>Profile</h1>

      {/* User Card */}
      <Card className="bg-card border-border rounded-2xl">
        <CardContent className="p-6">
          <div className="flex items-center gap-5">
            <Avatar className="w-16 h-16">
              <AvatarImage src={session?.user?.image ?? ""} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
                {getInitials(session?.user?.name ?? "U")}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-semibold">{session?.user?.name}</h2>
              <p className="text-muted-foreground text-sm">{session?.user?.email}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-6">
            {[
              { label: "Groups", value: stats.groups },
              { label: "Expenses", value: stats.expenses },
              { label: "Total Spent", value: formatCurrency(stats.total), mono: true },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className={cn("text-xl font-bold text-primary", stat.mono && "font-mono")}>{stat.value}</p>
                <p className="text-muted-foreground text-xs mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Full chatbot */}
      <Card className="bg-card border-border rounded-2xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-border bg-card/50">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-primary-foreground" />
            </div>
            MintSense — Personal Finance Chatbot
          </CardTitle>
        </CardHeader>

        {/* Suggested prompts */}
        <div className="px-4 py-3 flex gap-2 flex-wrap border-b border-border">
          {SUGGESTED.map((s) => (
            <button
              key={s}
              onClick={() => sendMessage(s)}
              className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>

        {/* Messages */}
        <div className="h-80 overflow-y-auto p-4 space-y-3">
          {chatHistory.length === 0 && (
            <div className="text-center py-12">
              <Sparkles className="w-10 h-10 mx-auto text-primary/40 mb-3" />
              <p className="text-muted-foreground text-sm">Ask MintSense anything about your finances</p>
            </div>
          )}
          {chatHistory.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-secondary text-foreground rounded-bl-sm"
                )}
              >
                {msg.content || (streaming && i === chatHistory.length - 1 ? (
                  <span className="flex gap-1 py-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
                  </span>
                ) : "")}
              </div>
            </motion.div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border flex gap-3">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Ask about your spending, balances, or any financial question..."
            className="bg-input border-border"
            disabled={streaming}
          />
          <Button onClick={() => sendMessage()} disabled={!input.trim() || streaming} className="bg-primary text-primary-foreground">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
