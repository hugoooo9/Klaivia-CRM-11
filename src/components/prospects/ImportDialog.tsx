// Dialog d'import de prospects depuis Excel / CSV / Word / PDF
"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Upload, FileSpreadsheet, FileText, File } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const ACCEPT = ".csv,.xlsx,.xls,.docx,.pdf";

export function ImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function upload() {
    if (!file) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/prospects/import", { method: "POST", body: fd });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Import échoué");
      toast.success(
        `${data.imported} importé${data.imported > 1 ? "s" : ""} · ${data.skipped} skipped${data.errors?.length ? ` · ${data.errors.length} erreurs` : ""}`,
      );
      if (data.errors?.length) {
        console.warn("[import] erreurs:", data.errors);
      }
      onOpenChange(false);
      setFile(null);
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const Icon = file?.name.endsWith(".pdf")
    ? File
    : file?.name.endsWith(".docx")
    ? FileText
    : FileSpreadsheet;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Importer des prospects</DialogTitle>
          <DialogDescription className="text-xs">
            Formats supportés : Excel (.xlsx/.xls), CSV, Word (.docx), PDF.<br />
            Les colonnes reconnues : Prénom, Nom, Entreprise, Email, Téléphone, Ville, Secteur, Canal, Statut, Score, Notes.
          </DialogDescription>
        </DialogHeader>

        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files[0];
            if (f) setFile(f);
          }}
          className="cursor-pointer rounded-lg border-2 border-dashed border-border bg-background p-8 text-center transition-colors hover:border-[color:var(--color-klaivia-violet)]"
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <div className="flex flex-col items-center gap-1">
              <Icon className="size-8 text-[color:var(--color-klaivia-violet)]" />
              <div className="text-sm font-medium">{file.name}</div>
              <div className="text-xs text-muted-foreground">
                {(file.size / 1024).toFixed(1)} Ko · clique pour changer
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Upload className="size-8" />
              <div className="text-sm">Glisse un fichier ici ou clique pour choisir</div>
              <div className="text-[11px]">.xlsx .csv .docx .pdf</div>
            </div>
          )}
        </div>

        <div className="rounded-md bg-muted/40 p-3 text-[11px] text-muted-foreground">
          <strong className="text-foreground">Astuce</strong> — pour Excel/CSV, utilise une ligne d&apos;en-tête avec des noms de colonnes reconnus.
          Pour PDF/Word, l&apos;import extrait automatiquement les emails + téléphones + noms proches.
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Annuler
          </Button>
          <Button
            onClick={upload}
            disabled={!file || loading}
            className="bg-[color:var(--color-klaivia-violet)] text-white hover:bg-[color:var(--color-klaivia-violet-light)]"
          >
            {loading ? "Import…" : "Importer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
