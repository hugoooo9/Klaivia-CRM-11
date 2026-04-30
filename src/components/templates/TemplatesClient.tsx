// Client component — CRUD templates
"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, FileText, Edit2, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { createTemplate, updateTemplate, deleteTemplate, type TemplateInput } from "@/actions/templates";

type Template = {
  id: string;
  nom: string;
  type: string;
  sujet: string | null;
  contenu: string;
  updatedAt: Date;
};

const TYPE_COLOR: Record<string, string> = {
  EMAIL: "bg-[color:var(--color-klaivia-violet-pale)] text-[color:var(--color-klaivia-violet)]",
  LINKEDIN: "bg-sky-50 text-sky-700",
  DM: "bg-pink-50 text-pink-700",
  NOTE: "bg-slate-50 text-slate-700",
};

export function TemplatesClient({ templates }: { templates: Template[] }) {
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [nom, setNom] = useState("");
  const [type, setType] = useState<TemplateInput["type"]>("EMAIL");
  const [sujet, setSujet] = useState("");
  const [contenu, setContenu] = useState("");

  const openCreate = () => {
    setEditing(null);
    setNom("");
    setType("EMAIL");
    setSujet("");
    setContenu("");
    setOpen(true);
  };

  const openEdit = (t: Template) => {
    setEditing(t);
    setNom(t.nom);
    setType(t.type as TemplateInput["type"]);
    setSujet(t.sujet ?? "");
    setContenu(t.contenu);
    setOpen(true);
  };

  const onSave = () => {
    if (!nom.trim() || !contenu.trim()) {
      toast.error("Nom et contenu requis");
      return;
    }
    startTransition(async () => {
      try {
        const input: TemplateInput = { nom, type, sujet, contenu };
        if (editing) {
          await updateTemplate(editing.id, input);
          toast.success("Template mis à jour");
        } else {
          await createTemplate(input);
          toast.success("Template créé");
        }
        setOpen(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur");
      }
    });
  };

  const onDelete = (id: string, nom: string) => {
    if (!confirm(`Supprimer "${nom}" ?`)) return;
    startTransition(async () => {
      await deleteTemplate(id);
      toast.success("Template supprimé");
    });
  };

  const onCopy = (t: Template) => {
    const txt = t.sujet ? `${t.sujet}\n\n${t.contenu}` : t.contenu;
    navigator.clipboard.writeText(txt);
    setCopiedId(t.id);
    setTimeout(() => setCopiedId(null), 1500);
    toast.success("Copié");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Variables dispos : <code className="rounded bg-muted px-1 py-0.5">{`{prenom}`}</code>{" "}
          <code className="rounded bg-muted px-1 py-0.5">{`{nom}`}</code>{" "}
          <code className="rounded bg-muted px-1 py-0.5">{`{entreprise}`}</code>{" "}
          <code className="rounded bg-muted px-1 py-0.5">{`{ville}`}</code>
        </p>
        <Button onClick={openCreate} className="klaivia-btn-primary font-semibold">
          <Plus className="size-4" /> Nouveau template
        </Button>
      </div>

      {templates.length === 0 ? (
        <div className="klaivia-card flex flex-col items-center p-12 text-center text-muted-foreground">
          <FileText className="mb-3 size-10" />
          <p className="text-sm">Aucun template. Crée ton premier modèle pour gagner du temps.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <div key={t.id} className="klaivia-card-hover flex flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className={`klaivia-badge ${TYPE_COLOR[t.type] ?? TYPE_COLOR.NOTE}`}>{t.type}</span>
                  <h3 className="mt-2 truncate text-sm font-semibold text-foreground">{t.nom}</h3>
                  {t.sujet && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{t.sujet}</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => onCopy(t)}
                    className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    title="Copier"
                  >
                    {copiedId === t.id ? <Check className="size-4 text-[color:var(--color-klaivia-green)]" /> : <Copy className="size-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(t)}
                    className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    title="Modifier"
                  >
                    <Edit2 className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(t.id, t.nom)}
                    className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    title="Supprimer"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
              <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-xs text-muted-foreground">{t.contenu}</p>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto bg-card">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier le template" : "Nouveau template"}</DialogTitle>
            <DialogDescription className="text-xs">
              Variables auto : {`{prenom}`} {`{nom}`} {`{entreprise}`} {`{ville}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="t-nom">Nom *</Label>
                <Input id="t-nom" value={nom} onChange={(e) => setNom(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as TemplateInput["type"])}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMAIL">Email</SelectItem>
                    <SelectItem value="LINKEDIN">LinkedIn</SelectItem>
                    <SelectItem value="DM">DM Instagram</SelectItem>
                    <SelectItem value="NOTE">Note</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {type === "EMAIL" && (
              <div>
                <Label htmlFor="t-sujet">Objet</Label>
                <Input id="t-sujet" value={sujet} onChange={(e) => setSujet(e.target.value)} className="mt-1" />
              </div>
            )}
            <div>
              <Label htmlFor="t-contenu">Contenu *</Label>
              <Textarea
                id="t-contenu"
                rows={10}
                value={contenu}
                onChange={(e) => setContenu(e.target.value)}
                className="mt-1 font-mono text-sm"
                placeholder="Bonjour {prenom},\n\nJ'ai vu que {entreprise} fait..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={onSave} className="klaivia-btn-primary font-semibold">
              {editing ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
