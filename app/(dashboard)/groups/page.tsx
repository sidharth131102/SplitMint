"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/useAppStore";
import { formatCurrency, getInitials } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, Trash2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import type { IGroup } from "@/types";
import GroupForm from "@/components/groups/GroupForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function GroupsPage() {
  const { groups, setGroups, addGroup, deleteGroup } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/groups")
      .then((r) => r.json())
      .then((g) => { setGroups(g); setLoading(false); });
  }, [setGroups]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this group and all its expenses?")) return;
    setDeleting(id);
    const res = await fetch(`/api/groups/${id}`, { method: "DELETE" });
    if (res.ok) {
      deleteGroup(id);
      toast.success("Group deleted");
    } else {
      toast.error("Failed to delete group");
    }
    setDeleting(null);
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-sora)" }}>
            Groups
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{groups.length} active groups</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-primary text-primary-foreground gap-2">
          <Plus className="w-4 h-4" /> New Group
        </Button>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-36 rounded-2xl bg-card animate-pulse" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">No groups yet. Create one to start splitting!</p>
          <Button onClick={() => setShowForm(true)} className="mt-4 bg-primary text-primary-foreground">
            Create First Group
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {groups.map((group, i) => (
            <motion.div
              key={group._id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
            >
              <Card className="bg-card border-border rounded-2xl hover:border-primary/30 transition-all group/card">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-base">{group.name}</h3>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        {group.participants.length + 1} members · {(group as IGroup & { expenseCount?: number }).expenseCount ?? 0} expenses
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(group._id)}
                      disabled={deleting === group._id}
                      className="opacity-0 group-hover/card:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Participant avatars */}
                  <div className="flex items-center gap-1.5 mb-4">
                    <div
                      className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary border-2 border-background"
                    >
                      Me
                    </div>
                    {group.participants.map((p) => (
                      <div
                        key={p._id}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 border-background"
                        style={{ backgroundColor: `${p.color}30`, color: p.color }}
                        title={p.name}
                      >
                        {getInitials(p.name)}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-xs">Total spent</p>
                      <p className="font-mono font-bold text-primary">
                        {formatCurrency((group as IGroup & { totalExpenses?: number }).totalExpenses ?? 0)}
                      </p>
                    </div>
                    <Link href={`/groups/${group._id}`}>
                      <Button size="sm" variant="secondary" className="gap-1.5 rounded-xl">
                        View <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Group</DialogTitle>
          </DialogHeader>
          <GroupForm
            onSuccess={(group) => {
              addGroup(group);
              setShowForm(false);
              toast.success("Group created!");
            }}
            onCancel={() => setShowForm(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
