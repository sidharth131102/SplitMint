"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import type { IGroup } from "@/types";
import { PARTICIPANT_COLORS } from "@/lib/utils";

const schema = z.object({
  name: z.string().min(1, "Group name is required"),
  participants: z
    .array(z.object({ name: z.string().min(1, "Name required") }))
    .max(3, "Max 3 participants"),
});
type FormData = z.infer<typeof schema>;

interface Props {
  onSuccess: (group: IGroup) => void;
  onCancel: () => void;
  initialData?: IGroup;
}

export default function GroupForm({ onSuccess, onCancel, initialData }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initialData?.name ?? "",
      participants: initialData?.participants.map((p) => ({ name: p.name })) ?? [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "participants" });

  async function onSubmit(data: FormData) {
    setError("");
    setLoading(true);
    const method = initialData ? "PUT" : "POST";
    const url = initialData ? `/api/groups/${initialData._id}` : "/api/groups";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name,
        participants: data.participants.map((p, i) => ({
          name: p.name,
          color: PARTICIPANT_COLORS[i % PARTICIPANT_COLORS.length],
        })),
      }),
    });

    const json = await res.json();
    setLoading(false);
    if (!res.ok) { setError(json.error || "Failed"); return; }
    onSuccess(json);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <Label>Group Name</Label>
        <Input
          placeholder="Trip to Goa, Flat expenses..."
          className="mt-1 bg-input border-border"
          {...register("name")}
        />
        {errors.name && <p className="text-destructive text-xs mt-1">{errors.name.message}</p>}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Participants (max 3)</Label>
          {fields.length < 3 && (
            <button
              type="button"
              onClick={() => append({ name: "" })}
              className="text-primary text-xs flex items-center gap-1 hover:underline"
            >
              <Plus className="w-3 h-3" /> Add
            </button>
          )}
        </div>
        <div className="space-y-2">
          {fields.map((field, i) => (
            <div key={field.id} className="flex gap-2 items-center">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: PARTICIPANT_COLORS[i % PARTICIPANT_COLORS.length] }}
              />
              <Input
                placeholder={`Participant ${i + 1} name`}
                className="bg-input border-border flex-1"
                {...register(`participants.${i}.name`)}
              />
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {fields.length === 0 && (
            <p className="text-muted-foreground text-xs">No participants yet. You are the owner by default.</p>
          )}
        </div>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <div className="flex gap-3 justify-end">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={loading} className="bg-primary text-primary-foreground">
          {loading ? "Saving..." : initialData ? "Save Changes" : "Create Group"}
        </Button>
      </div>
    </form>
  );
}
