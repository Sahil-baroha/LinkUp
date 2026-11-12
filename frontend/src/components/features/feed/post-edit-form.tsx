"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/shared/spinner";

interface PostEditFormProps {
  initialBody: string;
  onSave: (body: string) => void;
  onCancel: () => void;
  isPending: boolean;
}

export function PostEditForm({
  initialBody,
  onSave,
  onCancel,
  isPending,
}: PostEditFormProps) {
  const [editBody, setEditBody] = useState(initialBody);

  return (
    <div className="space-y-2">
      <Textarea
        value={editBody}
        onChange={(e) => setEditBody(e.target.value)}
        className="min-h-[100px] resize-none text-sm"
        maxLength={3000}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">{editBody.length} / 3000</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(editBody)}
            disabled={isPending || !editBody.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-[#0f172a] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 transition-all hover:bg-slate-700 active:scale-[0.98]"
          >
            {isPending && <Spinner size="sm" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
