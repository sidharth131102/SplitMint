"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/useAppStore";
import { formatCurrency, CATEGORY_COLORS } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Wallet,
  Plus,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { IGroup, IExpense, Category } from "@/types";
import { useSession } from "next-auth/react";
import { formatDate, CATEGORY_ICONS } from "@/lib/utils";

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = value;
    if (end === 0) { setDisplay(0); return; }
    const duration = 1000;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setDisplay(end); clearInterval(timer); }
      else setDisplay(start);
    }, 16);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{formatCurrency(display)}</span>;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const { groups, setGroups, expenses, setExpenses } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [iOwe, setIOwe] = useState(0);
  const [owedToMe, setOwedToMe] = useState(0);

  useEffect(() => {
    Promise.all([
      fetch("/api/groups").then((r) => r.json()),
      fetch("/api/expenses").then((r) => r.json()),
    ]).then(async ([g, e]) => {
      setGroups(g);
      setExpenses(e);
      // Compute net You Owe / Owed to You from balance API (accounts for settlements)
      const balances = await Promise.all(
        g.map((grp: IGroup) => fetch(`/api/balances/${grp._id}`).then((r) => r.json()))
      );
      let totalOwe = 0, totalOwed = 0;
      balances.forEach((b) => {
        if (!b?.netBalances) return;
        const me = b.netBalances.find((n: { participantId: string; balance: number }) => n.participantId === "owner");
        if (!me) return;
        if (me.balance < -0.005) totalOwe += Math.abs(me.balance);
        else if (me.balance > 0.005) totalOwed += me.balance;
      });
      setIOwe(totalOwe);
      setOwedToMe(totalOwed);
      setLoading(false);
    });
  }, [setGroups, setExpenses]);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthExpenses = expenses.filter((e) => new Date(e.date) >= monthStart);
  const monthTotal = monthExpenses.reduce((s, e) => s + e.amount, 0);

  const categoryData = Object.entries(
    monthExpenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  const recentExpenses = [...expenses].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  ).slice(0, 10);

  const cards = [
    {
      title: "Spent This Month",
      value: monthTotal,
      icon: Wallet,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      title: "You Owe",
      value: iOwe,
      icon: TrendingDown,
      color: "text-destructive",
      bg: "bg-destructive/10",
    },
    {
      title: "Owed to You",
      value: owedToMe,
      icon: TrendingUp,
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      title: "Active Groups",
      value: groups.length,
      icon: Users,
      color: "text-accent",
      bg: "bg-accent/10",
      isCount: true,
    },
  ];

  if (loading) {
    return (
      <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-card animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-sora)" }}>
            Good {new Date().getHours() < 12 ? "morning" : "evening"},{" "}
            {session?.user?.name?.split(" ")[0]} 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Here&apos;s your financial snapshot</p>
        </div>
        <Link href="/groups">
          <Button className="bg-primary text-primary-foreground gap-2">
            <Plus className="w-4 h-4" /> New Group
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <Card className="bg-card border-border rounded-2xl">
              <CardContent className="p-4">
                <div className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center mb-3`}>
                  <card.icon className={`w-4 h-4 ${card.color}`} />
                </div>
                <p className="text-muted-foreground text-xs mb-1">{card.title}</p>
                <p className={`text-xl font-bold font-mono ${card.color}`}>
                  {card.isCount ? (
                    <span>{card.value}</span>
                  ) : (
                    <AnimatedNumber value={card.value} />
                  )}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Groups */}
        <Card className="bg-card border-border rounded-2xl">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Your Groups</CardTitle>
            <Link href="/groups" className="text-primary text-xs flex items-center gap-1 hover:underline">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {groups.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">No groups yet.</p>
            ) : (
              groups.slice(0, 5).map((group, i) => (
                <motion.div
                  key={group._id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link href={`/groups/${group._id}`}>
                    <div className="flex items-center justify-between p-3 rounded-xl hover:bg-secondary transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center font-semibold text-primary text-sm">
                          {group.name[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{group.name}</p>
                          <p className="text-muted-foreground text-xs">
                            {group.participants.length + 1} members · {group.expenseCount} expenses
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-mono font-semibold text-primary block">
                          {formatCurrency((group as IGroup & { totalExpenses?: number }).totalExpenses ?? 0)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">all time</span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Category Chart */}
        <Card className="bg-card border-border rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Spending by Category</CardTitle>
            <p className="text-muted-foreground text-xs">This month</p>
          </CardHeader>
          <CardContent>
            {categoryData.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">No expenses this month.</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                    {categoryData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={CATEGORY_COLORS[entry.name as Category] ?? "#a3a3a3"}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => formatCurrency(Number(v))}
                    contentStyle={{ background: "#1c1c1c", border: "1px solid #2a2a2a", borderRadius: "8px" }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(v) => <span className="text-xs text-muted-foreground">{v}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="bg-card border-border rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recentExpenses.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">No expenses yet. Add one from a group!</p>
          ) : (
            recentExpenses.map((expense, i) => (
              <motion.div
                key={expense._id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-secondary transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{CATEGORY_ICONS[expense.category as Category]}</span>
                  <div>
                    <p className="font-medium text-sm">{expense.description}</p>
                    <p className="text-muted-foreground text-xs">{formatDate(expense.date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    style={{
                      backgroundColor: `${CATEGORY_COLORS[expense.category as Category]}20`,
                      color: CATEGORY_COLORS[expense.category as Category],
                    }}
                    className="text-xs"
                  >
                    {expense.category}
                  </Badge>
                  <span className="font-mono font-semibold text-sm text-primary">
                    {formatCurrency(expense.amount)}
                  </span>
                </div>
              </motion.div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
