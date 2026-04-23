"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sparkles, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { calculateSplits, formatCurrency, CATEGORY_COLORS, getInitials } from "@/lib/utils";
import type { IGroup, SplitMode, Category } from "@/types";
import { useSession } from "next-auth/react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const categories: Category[] = ["Food", "Travel", "Entertainment", "Utilities", "Shopping", "Health", "Other"];

const schema = z.object({
  description: z.string().min(1, "Description required"),
  amount: z.string().min(1, "Amount required"),
  date: z.string().min(1, "Date required"),
  payerId: z.string().min(1, "Payer required"),
  category: z.string().min(1),
});
type FormData = z.infer<typeof schema>;

export default function NewExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: groupId } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const [group, setGroup] = useState<IGroup | null>(null);
  const [splitMode, setSplitMode] = useState<SplitMode>("equal");
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [customSplits, setCustomSplits] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [nlpText, setNlpText] = useState("");
  const [nlpLoading, setNlpLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      category: "Other",
    },
  });

  const amount = parseFloat(watch("amount") || "0");
  const payerId = watch("payerId");

  useEffect(() => {
    fetch(`/api/groups/${groupId}`)
      .then((r) => r.json())
      .then((g) => {
        setGroup(g);
        const allIds = ["owner", ...g.participants.map((p: { _id: string }) => p._id)];
        setSelectedParticipants(allIds);
      });
  }, [groupId]);

  useEffect(() => {
    if (!group) return;
    const allIds = ["owner", ...group.participants.map((p) => p._id)];
    const initial: Record<string, number> = {};
    allIds.forEach((id) => (initial[id] = 0));
    setCustomSplits(initial);
  }, [group]);

  const previewSplits = calculateSplits(
    amount || 0,
    selectedParticipants,
    splitMode,
    customSplits
  );

  async function handleNLP() {
    if (!nlpText.trim()) return;
    setNlpLoading(true);
    const res = await fetch("/api/ai/parse-expense", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: nlpText, groupId }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.description) setValue("description", data.description);
      if (data.amount) setValue("amount", String(data.amount));
      if (data.date) setValue("date", data.date);
      if (data.payerId) setValue("payerId", data.payerId);
      if (data.category) setValue("category", data.category);
      if (data.splitMode) setSplitMode(data.splitMode);
      if (data.participantIds) {
        const validIds = allParticipants.map((p) => p.id);
        const filtered = (data.participantIds as string[]).filter((id) => validIds.includes(id));
        const mentionsAll = /\ball\b|everyone|everybody/i.test(nlpText);
        setSelectedParticipants(
          filtered.length === 0 || (mentionsAll && filtered.length < validIds.length)
            ? validIds
            : filtered
        );
      }
      toast.success("Expense parsed by MintSense!");
    } else {
      toast.error("Couldn't parse expense. Try again.");
    }
    setNlpLoading(false);
  }

  async function onSubmit(data: FormData) {
    setLoading(true);
    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        groupId,
        description: data.description,
        amount: parseFloat(data.amount),
        date: data.date,
        payerId: data.payerId,
        splitMode,
        participants: selectedParticipants,
        splits:
          splitMode !== "equal"
            ? Object.fromEntries(
                selectedParticipants.map((id) => [id, customSplits[id] ?? 0])
              )
            : undefined,
        category: data.category,
      }),
    });
    setLoading(false);
    if (res.ok) {
      toast.success("Expense added!");
      router.push(`/groups/${groupId}`);
    } else {
      const json = await res.json();
      toast.error(json.error || "Failed to add expense");
    }
  }

  const allParticipants = group
    ? [
        { id: "owner", name: session?.user?.name ?? "Me", color: "#10b981" },
        ...group.participants.map((p) => ({ id: p._id, name: p.name, color: p.color })),
      ]
    : [];

  if (!group) return <div className="p-6 text-muted-foreground text-center">Loading...</div>;

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold" style={{ fontFamily: "var(--font-sora)" }}>
          Add Expense — {group.name}
        </h1>
      </div>

      {/* MintSense NLP */}
      <div className="bg-card border border-primary/30 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-primary">MintSense</span>
          <Badge className="bg-primary/10 text-primary border-0 text-xs">AI</Badge>
        </div>
        <div className="flex gap-2">
          <input
            value={nlpText}
            onChange={(e) => setNlpText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleNLP()}
            placeholder="Try: 'paid 840 for dinner with Rahul yesterday'"
            className="flex-1 bg-input border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
          />
          <Button onClick={handleNLP} disabled={nlpLoading || !nlpText.trim()} className="bg-primary text-primary-foreground gap-2 rounded-xl">
            {nlpLoading ? (
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
              </span>
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Parse
          </Button>
        </div>
        <p className="text-muted-foreground text-xs mt-2">AI will pre-fill the form below</p>
      </div>

      {/* Manual Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Description</Label>
            <Input placeholder="Dinner at restaurant" className="mt-1 bg-input border-border" {...register("description")} />
            {errors.description && <p className="text-destructive text-xs mt-1">{errors.description.message}</p>}
          </div>

          <div>
            <Label>Amount (₹)</Label>
            <Input type="number" placeholder="0.00" step="0.01" className="mt-1 bg-input border-border font-mono" {...register("amount")} />
            {errors.amount && <p className="text-destructive text-xs mt-1">{errors.amount.message}</p>}
          </div>

          <div>
            <Label>Date</Label>
            <Input type="date" className="mt-1 bg-input border-border" {...register("date")} />
          </div>
        </div>

        {/* Payer */}
        <div>
          <Label>Who Paid?</Label>
          <div className="flex gap-2 mt-2 flex-wrap">
            {allParticipants.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setValue("payerId", p.id)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm font-medium transition-all"
                style={{
                  borderColor: payerId === p.id ? p.color : "#2a2a2a",
                  backgroundColor: payerId === p.id ? `${p.color}20` : "transparent",
                  color: payerId === p.id ? p.color : "#a3a3a3",
                }}
              >
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{ backgroundColor: `${p.color}30`, color: p.color }}>
                  {getInitials(p.name)}
                </span>
                {p.name}
              </button>
            ))}
          </div>
          {errors.payerId && <p className="text-destructive text-xs mt-1">{errors.payerId.message}</p>}
        </div>

        {/* Participants */}
        <div>
          <Label>Split Between</Label>
          <div className="flex gap-2 mt-2 flex-wrap">
            {allParticipants.map((p) => {
              const selected = selectedParticipants.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSelectedParticipants((prev) =>
                      prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id]
                    );
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm font-medium transition-all"
                  style={{
                    borderColor: selected ? p.color : "#2a2a2a",
                    backgroundColor: selected ? `${p.color}20` : "transparent",
                    color: selected ? p.color : "#a3a3a3",
                  }}
                >
                  {p.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Split Mode */}
        <div>
          <Label>Split Mode</Label>
          <Tabs value={splitMode} onValueChange={(v) => setSplitMode(v as SplitMode)} className="mt-2">
            <TabsList className="bg-secondary">
              <TabsTrigger value="equal">Equal</TabsTrigger>
              <TabsTrigger value="custom">Custom</TabsTrigger>
              <TabsTrigger value="percentage">%</TabsTrigger>
            </TabsList>
            <TabsContent value="equal" className="mt-3 space-y-2">
              {previewSplits.map((s) => {
                const p = allParticipants.find((x) => x.id === s.participantId);
                return (
                  <div key={s.participantId} className="flex justify-between text-sm">
                    <span style={{ color: p?.color }}>{p?.name}</span>
                    <span className="font-mono text-foreground">{formatCurrency(s.amount)}</span>
                  </div>
                );
              })}
            </TabsContent>
            <TabsContent value="custom" className="mt-3 space-y-2">
              {selectedParticipants.map((pid) => {
                const p = allParticipants.find((x) => x.id === pid);
                return (
                  <div key={pid} className="flex items-center gap-3">
                    <span className="text-sm w-24" style={{ color: p?.color }}>{p?.name}</span>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={customSplits[pid] || ""}
                      onChange={(e) => setCustomSplits((prev) => ({ ...prev, [pid]: parseFloat(e.target.value) || 0 }))}
                      className="bg-input border-border font-mono w-32"
                    />
                    <span className="text-xs text-muted-foreground">₹</span>
                  </div>
                );
              })}
              <p className="text-xs text-muted-foreground">
                Sum: {formatCurrency(Object.values(customSplits).reduce((a, b) => a + b, 0))} / {formatCurrency(amount)}
              </p>
            </TabsContent>
            <TabsContent value="percentage" className="mt-3 space-y-2">
              {selectedParticipants.map((pid) => {
                const p = allParticipants.find((x) => x.id === pid);
                return (
                  <div key={pid} className="flex items-center gap-3">
                    <span className="text-sm w-24" style={{ color: p?.color }}>{p?.name}</span>
                    <Input
                      type="number"
                      step="1"
                      placeholder="0"
                      value={customSplits[pid] || ""}
                      onChange={(e) => setCustomSplits((prev) => ({ ...prev, [pid]: parseFloat(e.target.value) || 0 }))}
                      className="bg-input border-border font-mono w-24"
                    />
                    <span className="text-xs text-muted-foreground">
                      % = {formatCurrency((amount * (customSplits[pid] || 0)) / 100)}
                    </span>
                  </div>
                );
              })}
              <p className="text-xs text-muted-foreground">
                Total %: {Object.values(customSplits).reduce((a, b) => a + b, 0)}%
              </p>
            </TabsContent>
          </Tabs>
        </div>

        {/* Category */}
        <div>
          <Label>Category</Label>
          <div className="flex gap-2 mt-2 flex-wrap">
            {categories.map((cat) => {
              const selected = watch("category") === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setValue("category", cat)}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium border transition-all"
                  style={{
                    borderColor: selected ? CATEGORY_COLORS[cat] : "#2a2a2a",
                    backgroundColor: selected ? `${CATEGORY_COLORS[cat]}20` : "transparent",
                    color: selected ? CATEGORY_COLORS[cat] : "#a3a3a3",
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground h-11 font-semibold">
          {loading ? "Adding..." : "Add Expense"}
        </Button>
      </form>
    </div>
  );
}
