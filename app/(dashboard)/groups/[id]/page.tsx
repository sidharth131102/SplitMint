"use client";

import { useEffect, useState, use } from "react";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/useAppStore";
import { formatCurrency, formatDate, getInitials, CATEGORY_COLORS, CATEGORY_ICONS } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Sparkles, ArrowLeft, ExternalLink, UserPlus, Check, X, RotateCcw, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { IGroup, IExpense, BalanceData, Category } from "@/types";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useSession } from "next-auth/react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const [group, setGroup] = useState<IGroup | null>(null);
  const [expenses, setExpenses] = useState<IExpense[]>([]);
  const [balances, setBalances] = useState<BalanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [summaryModal, setSummaryModal] = useState(false);
  const [summary, setSummary] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [settleAdvice, setSettleAdvice] = useState("");
  const [adviceLoading, setAdviceLoading] = useState(false);
  const [showAdvice, setShowAdvice] = useState(false);
  const [search, setSearch] = useState("");
  const [filterParticipant, setFilterParticipant] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterAmountMin, setFilterAmountMin] = useState("");
  const [filterAmountMax, setFilterAmountMax] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [newParticipantName, setNewParticipantName] = useState("");
  const [addingParticipant, setAddingParticipant] = useState(false);
  const [editingParticipantId, setEditingParticipantId] = useState<string | null>(null);
  const [editingParticipantName, setEditingParticipantName] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`/api/groups/${id}`).then((r) => r.json()),
      fetch(`/api/expenses?groupId=${id}`).then((r) => r.json()),
      fetch(`/api/balances/${id}`).then((r) => r.json()),
    ]).then(([g, e, b]) => {
      setGroup(g);
      setExpenses(e);
      setBalances(b);
      setLoading(false);
    });
  }, [id]);

  async function handleDeleteExpense(expenseId: string) {
    if (!confirm("Delete this expense?")) return;
    const res = await fetch(`/api/expenses/${expenseId}`, { method: "DELETE" });
    if (res.ok) {
      setExpenses((prev) => prev.filter((e) => e._id !== expenseId));
      const b = await fetch(`/api/balances/${id}`).then((r) => r.json());
      setBalances(b);
      toast.success("Expense deleted");
    } else {
      toast.error("Failed to delete");
    }
  }

  async function handleSettle(fromId: string, toId: string, amount: number) {
    const res = await fetch("/api/settlements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId: id, fromId, toId, amount }),
    });
    if (res.ok) {
      const b = await fetch(`/api/balances/${id}`).then((r) => r.json());
      setBalances(b);
      toast.success("Settlement recorded!");
    }
  }

  async function handleAddParticipant() {
    if (!newParticipantName.trim()) return;
    setAddingParticipant(true);
    const res = await fetch(`/api/groups/${id}/participants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newParticipantName.trim() }),
    });
    if (res.ok) {
      const updated = await res.json();
      setGroup(updated);
      setNewParticipantName("");
      toast.success("Participant added!");
    } else {
      const json = await res.json();
      toast.error(json.error || "Failed to add participant");
    }
    setAddingParticipant(false);
  }

  async function handleEditParticipant(participantId: string) {
    if (!editingParticipantName.trim()) return;
    const res = await fetch(`/api/groups/${id}/participants`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantId, name: editingParticipantName.trim() }),
    });
    if (res.ok) {
      const updated = await res.json();
      setGroup(updated);
      setEditingParticipantId(null);
      toast.success("Name updated!");
    } else {
      toast.error("Failed to update");
    }
  }

  async function handleRemoveParticipant(participantId: string, force = false) {
    const res = await fetch(`/api/groups/${id}/participants`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantId, force }),
    });
    if (res.ok) {
      const updated = await res.json();
      setGroup(updated);
      const [e, b] = await Promise.all([
        fetch(`/api/expenses?groupId=${id}`).then((r) => r.json()),
        fetch(`/api/balances/${id}`).then((r) => r.json()),
      ]);
      setExpenses(e);
      setBalances(b);
      toast.success("Participant removed");
    } else {
      const json = await res.json();
      if (json.code === "PARTICIPANT_IN_USE") {
        const ok = confirm(
          `This participant is linked to ${json.count} expense(s):\n${json.expenses.map((e: {description: string}) => `• ${e.description}`).join("\n")}\n\nForce remove will delete those expenses too. Continue?`
        );
        if (ok) handleRemoveParticipant(participantId, true);
      } else {
        toast.error(json.error || "Failed to remove");
      }
    }
  }

  async function loadSummary() {
    setSummaryLoading(true);
    setSummaryModal(true);
    const res = await fetch(`/api/ai/summary/${id}`);
    const data = await res.json();
    setSummary(data.summary);
    setSummaryLoading(false);
  }

  async function loadAdvice() {
    setAdviceLoading(true);
    setShowAdvice(true);
    const res = await fetch(`/api/ai/settle/${id}`);
    const data = await res.json();
    setSettleAdvice(data.advice);
    setAdviceLoading(false);
  }

  const allIds = group
    ? ["owner", ...group.participants.map((p) => p._id)]
    : [];
  const nameMap: Record<string, string> = { owner: session?.user?.name ?? "Me" };
  group?.participants.forEach((p) => (nameMap[p._id] = p.name));

  const contributionData = allIds.map((pid) => {
    const paid = expenses.filter((e) => e.payerId === pid).reduce((s, e) => s + e.amount, 0);
    const share = expenses.reduce((s, e) => {
      const split = e.splits.find((sp) => sp.participantId === pid);
      return s + (split?.amount ?? 0);
    }, 0);
    return { name: nameMap[pid] ?? pid, paid, share };
  });

  const filteredExpenses = expenses.filter((e) => {
    if (search && !e.description.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterParticipant !== "all") {
      const involved = e.payerId === filterParticipant || e.splits.some((s) => s.participantId === filterParticipant);
      if (!involved) return false;
    }
    if (filterDateFrom && new Date(e.date) < new Date(filterDateFrom)) return false;
    if (filterDateTo && new Date(e.date) > new Date(filterDateTo)) return false;
    if (filterAmountMin && e.amount < parseFloat(filterAmountMin)) return false;
    if (filterAmountMax && e.amount > parseFloat(filterAmountMax)) return false;
    return true;
  });

  const activeFilterCount = [
    filterParticipant !== "all",
    filterDateFrom,
    filterDateTo,
    filterAmountMin,
    filterAmountMax,
  ].filter(Boolean).length;

  if (loading) {
    return <div className="p-6 text-center text-muted-foreground">Loading...</div>;
  }
  if (!group) {
    return <div className="p-6 text-center text-muted-foreground">Group not found.</div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-sora)" }}>
            {group.name}
          </h1>
          <div className="flex items-center gap-1.5 mt-1">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
              Me
            </div>
            {group.participants.map((p) => (
              <div
                key={p._id}
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{ backgroundColor: `${p.color}30`, color: p.color }}
                title={p.name}
              >
                {getInitials(p.name)}
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground hover:text-destructive text-xs"
            onClick={async () => {
              if (!confirm("Reset all settlements for this group?")) return;
              const res = await fetch("/api/settlements", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ groupId: id }),
              });
              if (res.ok) {
                const b = await fetch(`/api/balances/${id}`).then((r) => r.json());
                setBalances(b);
                toast.success("Settlements reset");
              }
            }}
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </Button>
          <Button onClick={loadSummary} variant="secondary" size="sm" className="gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary" /> AI Summary
          </Button>
          <Link href={`/groups/${id}/expenses/new`}>
            <Button size="sm" className="bg-primary text-primary-foreground gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add Expense
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Balance Table */}
        <Card className="bg-card border-border rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Balance Matrix</CardTitle>
            <p className="text-muted-foreground text-xs">Who owes whom</p>
          </CardHeader>
          <CardContent>
            {balances && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      <th className="text-muted-foreground text-left pb-2 font-medium">From ↓ To →</th>
                      {allIds.map((id) => (
                        <th key={id} className="text-center pb-2 font-medium" style={{ color: id === "owner" ? "#10b981" : group.participants.find((p) => p._id === id)?.color }}>
                          {nameMap[id]?.split(" ")[0]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allIds.map((fromId) => (
                      <tr key={fromId}>
                        <td className="py-1.5 font-medium" style={{ color: fromId === "owner" ? "#10b981" : group.participants.find((p) => p._id === fromId)?.color }}>
                          {nameMap[fromId]?.split(" ")[0]}
                        </td>
                        {allIds.map((toId) => {
                          const amount = balances.debtMatrix[fromId]?.[toId] ?? 0;
                          return (
                            <td key={toId} className="text-center py-1.5">
                              {fromId === toId ? (
                                <span className="text-muted-foreground/40">—</span>
                              ) : amount > 0.005 ? (
                                <span className="font-mono text-destructive font-medium">{formatCurrency(amount)}</span>
                              ) : (
                                <span className="text-muted-foreground/40">·</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Settlements */}
        <Card className="bg-card border-border rounded-2xl">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Settlements</CardTitle>
              <p className="text-muted-foreground text-xs">Minimal payment plan</p>
            </div>
            <Button onClick={loadAdvice} variant="ghost" size="sm" className="text-primary gap-1 text-xs">
              <Sparkles className="w-3 h-3" /> AI Explain
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {balances?.settlements.length === 0 ? (
              <p className="text-success text-sm text-center py-4 font-medium">All settled up! 🎉</p>
            ) : (
              balances?.settlements.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-secondary">
                  <div className="text-sm">
                    <span className="font-medium text-destructive">{s.fromName}</span>
                    <span className="text-muted-foreground mx-2">pays</span>
                    <span className="font-medium text-success">{s.toName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-sm">{formatCurrency(s.amount)}</span>
                    <Button
                      size="sm"
                      onClick={() => handleSettle(s.fromId, s.toId, s.amount)}
                      className="h-7 text-xs bg-success/20 text-success hover:bg-success/30 border-0"
                    >
                      Done
                    </Button>
                  </div>
                </div>
              ))
            )}
            {showAdvice && (
              <div className="mt-3 p-3 rounded-xl bg-primary/10 border border-primary/20">
                {adviceLoading ? (
                  <p className="text-xs text-muted-foreground animate-pulse">MintSense is analyzing...</p>
                ) : (
                  <p className="text-xs text-foreground leading-relaxed">{settleAdvice}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Contribution Chart */}
      <Card className="bg-card border-border rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Contribution Overview</CardTitle>
          <p className="text-muted-foreground text-xs">Paid vs. share per person</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={contributionData} barGap={4}>
              <XAxis dataKey="name" tick={{ fill: "#a3a3a3", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#a3a3a3", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} />
              <Tooltip
                formatter={(v) => formatCurrency(Number(v))}
                contentStyle={{ background: "#1c1c1c", border: "1px solid #2a2a2a", borderRadius: "8px", fontSize: "12px" }}
              />
              <Bar dataKey="paid" name="Paid" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="share" name="Share" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Participants Management */}
      <Card className="bg-card border-border rounded-2xl">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Participants</CardTitle>
            <p className="text-muted-foreground text-xs">{1 + group.participants.length} members including you</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {/* Owner (non-editable) */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-secondary">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                {getInitials(session?.user?.name ?? "Me")}
              </div>
              <span className="text-sm font-medium">{session?.user?.name ?? "Me"}</span>
            </div>
            <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-primary/10 text-primary">Owner</span>
          </div>

          {/* Participants */}
          {group.participants.map((p) => (
            <div key={p._id} className="flex items-center justify-between p-2.5 rounded-xl bg-secondary group">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                  style={{ backgroundColor: `${p.color}30`, color: p.color }}>
                  {getInitials(p.name)}
                </div>
                {editingParticipantId === p._id ? (
                  <Input
                    value={editingParticipantName}
                    onChange={(e) => setEditingParticipantName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleEditParticipant(p._id)}
                    className="h-7 text-sm bg-background border-border px-2"
                    autoFocus
                  />
                ) : (
                  <span className="text-sm font-medium truncate">{p.name}</span>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {editingParticipantId === p._id ? (
                  <>
                    <button onClick={() => handleEditParticipant(p._id)} className="p-1 rounded text-success hover:bg-success/10 transition-colors">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setEditingParticipantId(null)} className="p-1 rounded text-muted-foreground hover:bg-secondary transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => { setEditingParticipantId(p._id); setEditingParticipantName(p.name); }}
                      className="p-1 rounded text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleRemoveParticipant(p._id)}
                      className="p-1 rounded text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}

          {/* Add participant */}
          <div className="flex gap-2 pt-1">
            <Input
              value={newParticipantName}
              onChange={(e) => setNewParticipantName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddParticipant()}
              placeholder="New participant name..."
              className="bg-input border-border text-sm h-9"
            />
            <Button onClick={handleAddParticipant} disabled={addingParticipant || !newParticipantName.trim()} size="sm" className="bg-primary text-primary-foreground gap-1.5 h-9 shrink-0">
              <UserPlus className="w-3.5 h-3.5" /> Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Expense List */}
      <Card className="bg-card border-border rounded-2xl">
        <CardHeader className="pb-3 space-y-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">
              Expenses ({filteredExpenses.length}{filteredExpenses.length !== expenses.length ? ` of ${expenses.length}` : ""})
            </CardTitle>
            <div className="flex items-center gap-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="text-xs bg-input border border-border rounded-lg px-3 py-1.5 w-32 focus:outline-none focus:border-primary transition-colors"
              />
              <button
                onClick={() => setShowFilters((v) => !v)}
                className="relative flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-border hover:border-primary transition-colors text-muted-foreground hover:text-foreground"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              {activeFilterCount > 0 && (
                <button
                  onClick={() => { setFilterParticipant("all"); setFilterDateFrom(""); setFilterDateTo(""); setFilterAmountMin(""); setFilterAmountMax(""); }}
                  className="text-xs text-destructive hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          {showFilters && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1 border-t border-border">
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">Participant</p>
                <select
                  value={filterParticipant}
                  onChange={(e) => setFilterParticipant(e.target.value)}
                  className="w-full text-xs bg-input border border-border rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary"
                >
                  <option value="all">All</option>
                  <option value="owner">{session?.user?.name ?? "Me"}</option>
                  {group.participants.map((p) => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">From date</p>
                <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="w-full text-xs bg-input border border-border rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">To date</p>
                <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)}
                  className="w-full text-xs bg-input border border-border rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">Amount range (₹)</p>
                <div className="flex gap-1">
                  <input type="number" placeholder="Min" value={filterAmountMin} onChange={(e) => setFilterAmountMin(e.target.value)}
                    className="w-full text-xs bg-input border border-border rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary" />
                  <input type="number" placeholder="Max" value={filterAmountMax} onChange={(e) => setFilterAmountMax(e.target.value)}
                    className="w-full text-xs bg-input border border-border rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary" />
                </div>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {filteredExpenses.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              {search ? "No matching expenses." : "No expenses yet. Add one!"}
            </p>
          ) : (
            filteredExpenses.map((expense, i) => (
              <motion.div
                key={expense._id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-secondary transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xl shrink-0">{CATEGORY_ICONS[expense.category as Category]}</span>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{expense.description}</p>
                    <p className="text-muted-foreground text-xs">
                      {nameMap[expense.payerId] ?? expense.payerId} paid · {formatDate(expense.date)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant="secondary"
                    style={{
                      backgroundColor: `${CATEGORY_COLORS[expense.category as Category]}20`,
                      color: CATEGORY_COLORS[expense.category as Category],
                    }}
                    className="text-xs hidden sm:inline-flex"
                  >
                    {expense.category}
                  </Badge>
                  <span className="font-mono font-bold text-sm">{formatCurrency(expense.amount)}</span>
                  <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                    <Link href={`/expenses/${expense._id}/edit`}>
                      <button className="p-1 rounded text-muted-foreground hover:text-primary transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </Link>
                    <button
                      onClick={() => handleDeleteExpense(expense._id)}
                      className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </CardContent>
      </Card>

      {/* AI Summary Modal */}
      <Dialog open={summaryModal} onOpenChange={setSummaryModal}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> AI Group Summary
            </DialogTitle>
          </DialogHeader>
          {summaryLoading ? (
            <p className="text-muted-foreground text-sm animate-pulse py-4 text-center">MintSense is analyzing your group...</p>
          ) : (
            <p className="text-sm leading-relaxed">{summary}</p>
          )}
        </DialogContent>
      </Dialog>

      {/* FAB */}
      <Link href={`/groups/${id}/expenses/new`}>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="fixed bottom-24 right-6 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center z-40"
        >
          <Plus className="w-6 h-6" />
        </motion.button>
      </Link>
    </div>
  );
}
