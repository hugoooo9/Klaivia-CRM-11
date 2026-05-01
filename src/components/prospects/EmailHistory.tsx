// Section "Historique des mails" sur la fiche prospect — list + expand + reuse draft
"use client";

import { useState, useTransition } from "react";
import { Mail, MailOpen, ChevronDown, ChevronUp, Trash2, FileEdit } from "lucide-react";
import { toast } from "sonner";
import { ApproachEmailModal } from "./ApproachEmailModal";
import { deleteProspectEmail } from "@/actions/email-generation";
import { fmtRelative } from "@/lib/format";

type EmailItem = {
  id: string;
  subject: string;
  body: string;
  status: string; // "draft" | "sent"
  sentAt: Date | null;
  createdAt: Date;
};

export function EmailHistory({
  prospectId,
  prospectEmail,
  emails,
}: {
  prospectId: string;
  prospectEmail: string | null;
  emails: EmailItem[];
}) {
  const [, startTransition] = useTransition();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editingDraft, setEditingDraft] = useState<EmailItem | null>(null);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onDelete = (id: string, label: string) => {
    if (!confirm(`Supprimer "${label}" ?`)) return;
    startTransition(async () => {
      try {
        await deleteProspectEmail(id, prospectId);
        toast.success("Mail supprimé");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur");
      }
    });
  };

  return (
    <>
      <div className="klaivia-card mt-6 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">
            Historique des mails · {emails.length}
          </h3>
        </div>

        {emails.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun mail envoyé pour l&apos;instant.</p>
        ) : (
          <ul className="space-y-2">
            {emails.map((m) => {
              const isDraft = m.status === "draft";
              const isOpen = expanded.has(m.id);
              return (
                <li
                  key={m.id}
                  className="rounded-lg border border-border bg-card transition-colors hover:border-[color:var(--color-klaivia-violet)]/30"
                >
                  <div className="flex items-center gap-3 px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggle(m.id)}
                      className="flex flex-1 items-center gap-3 text-left"
                    >
                      <span
                        className={`klaivia-badge shrink-0 ${
                          isDraft
                            ? "border-slate-200 bg-slate-50 text-slate-700"
                            : "border-emerald-200 bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {isDraft ? <FileEdit className="size-3" /> : <MailOpen className="size-3" />}
                        {isDraft ? "Brouillon" : "Envoyé"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-foreground">
                          {m.subject}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {fmtRelative(m.sentAt ?? m.createdAt)}
                        </div>
                      </div>
                      {isOpen ? (
                        <ChevronUp className="size-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                      )}
                    </button>
                    {isDraft && (
                      <button
                        type="button"
                        onClick={() => setEditingDraft(m)}
                        className="shrink-0 rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-[color:var(--color-klaivia-violet)]"
                        title="Reprendre ce brouillon"
                      >
                        <Mail className="size-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onDelete(m.id, m.subject)}
                      className="shrink-0 rounded p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      title="Supprimer"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                  {isOpen && (
                    <div className="border-t border-border bg-muted/20 px-4 py-3">
                      <pre className="whitespace-pre-wrap font-sans text-sm text-foreground">
                        {m.body}
                      </pre>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {editingDraft && (
        <ApproachEmailModal
          open={!!editingDraft}
          onOpenChange={(v) => !v && setEditingDraft(null)}
          prospectId={prospectId}
          prospectEmail={prospectEmail}
          initialDraft={{ subject: editingDraft.subject, body: editingDraft.body }}
        />
      )}
    </>
  );
}
