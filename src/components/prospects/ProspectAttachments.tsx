// Section "Pièces jointes" sur la fiche prospect — upload + liste + download/delete
"use client";

import { useRef, useState, useTransition } from "react";
import {
  Paperclip, Upload, FileText, FileImage, File as FileIcon, Trash2, Download, Eye, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { uploadAttachment, deleteAttachment } from "@/actions/attachments";
import { fmtRelative } from "@/lib/format";

type Attachment = {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: Date;
};

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function iconForMime(mime: string): typeof FileIcon {
  if (mime === "application/pdf") return FileText;
  if (mime.startsWith("image/")) return FileImage;
  return FileIcon;
}

export function ProspectAttachments({
  prospectId,
  attachments,
}: {
  prospectId: string;
  attachments: Attachment[];
}) {
  const [, startTransition] = useTransition();
  const [isUploading, startUploadTransition] = useTransition();
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    startUploadTransition(async () => {
      try {
        const res = await uploadAttachment(prospectId, fd);
        if (res.ok) toast.success(`${file.name} ajouté`);
        else toast.error(res.error);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur upload");
      }
    });
  };

  const onPick = () => inputRef.current?.click();

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload(file);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) upload(file);
  };

  const onDelete = (id: string, name: string) => {
    if (!confirm(`Supprimer "${name}" ?`)) return;
    startTransition(async () => {
      const res = await deleteAttachment(id, prospectId);
      if (res.ok) toast.success("Supprimé");
      else toast.error(res.error);
    });
  };

  return (
    <div className="klaivia-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Paperclip className="size-4 text-muted-foreground" />
          Pièces jointes · {attachments.length}
        </h3>
        <Button onClick={onPick} disabled={isUploading} size="sm" className="klaivia-btn-primary font-semibold">
          {isUploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
          Ajouter
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.webp"
          onChange={onChange}
          className="hidden"
        />
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={onPick}
        className={`mb-3 cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          dragOver
            ? "border-[color:var(--color-klaivia-violet)] bg-[color:var(--color-klaivia-violet-pale)]"
            : "border-border bg-background hover:border-[color:var(--color-klaivia-violet)]/40"
        }`}
      >
        <Upload className="mx-auto mb-2 size-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Glisse un PDF / devis / image, ou clique pour choisir
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          PDF · DOCX · PNG · JPEG · max 10 MB
        </p>
      </div>

      {attachments.length > 0 && (
        <ul className="space-y-2">
          {attachments.map((a) => {
            const Icon = iconForMime(a.mimeType);
            return (
              <li
                key={a.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 transition-colors hover:border-[color:var(--color-klaivia-violet)]/30"
              >
                <Icon className="size-5 shrink-0 text-[color:var(--color-klaivia-violet)]" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-foreground">{a.filename}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {fmtBytes(a.size)} · {fmtRelative(a.createdAt)}
                  </div>
                </div>
                <a
                  href={`/api/attachments/${a.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-[color:var(--color-klaivia-violet)]"
                  title="Aperçu"
                >
                  <Eye className="size-4" />
                </a>
                <a
                  href={`/api/attachments/${a.id}?download=1`}
                  className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  title="Télécharger"
                >
                  <Download className="size-4" />
                </a>
                <button
                  type="button"
                  onClick={() => onDelete(a.id, a.filename)}
                  className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  title="Supprimer"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
