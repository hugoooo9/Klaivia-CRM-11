// Dialog d'envoi d'email d'approche — l'utilisateur relit et édite avant envoi.
// Flow : Ouvrir → brouillon pré-rempli → édition libre → Prévisualiser → Envoyer.
"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Eye, Pencil, Send, AlertTriangle } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { sendApproachEmail, getDefaultApproachEmail } from "@/actions/email";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospectId: string;
  prospectName: string;
  prospectEmail: string | null;
};

export function SendEmailDialog({
  open, onOpenChange, prospectId, prospectName, prospectEmail,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [cc, setCc] = useState("");
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Au premier open : récupère le brouillon par défaut
  useEffect(() => {
    if (!open || subject || body) return;
    setLoading(true);
    getDefaultApproachEmail(prospectId)
      .then((draft) => {
        if (draft) {
          setSubject(draft.subject);
          setBody(draft.body);
        }
      })
      .finally(() => setLoading(false));
  }, [open, prospectId, subject, body]);

  // Reset quand on ferme
  useEffect(() => {
    if (!open) {
      setMode("edit");
      setConfirmOpen(false);
    }
  }, [open]);

  const canSend = !!prospectEmail && subject.trim().length > 0 && body.trim().length > 0;

  const onSend = () => {
    if (!canSend) return;
    startTransition(async () => {
      try {
        await sendApproachEmail({
          prospectId,
          subject: subject.trim(),
          body: body.trim(),
          cc: cc.trim() || undefined,
        });
        toast.success(`Email envoyé à ${prospectName}`);
        setConfirmOpen(false);
        onOpenChange(false);
        // Reset pour la prochaine ouverture
        setSubject("");
        setBody("");
        setCc("");
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Erreur d'envoi");
      }
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="size-4 text-[color:var(--color-klaivia-orange)]" />
              Email d&apos;approche · {prospectName}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Relis attentivement le contenu — l&apos;email sera envoyé depuis{" "}
              <span className="font-medium text-foreground">
                {process.env.NEXT_PUBLIC_SMTP_FROM || "contact@klaivia.ch"}
              </span>
              .
            </DialogDescription>
          </DialogHeader>

          {!prospectEmail ? (
            <div className="flex items-start gap-3 rounded-md border border-[color:var(--color-klaivia-red)]/30 bg-destructive/10 p-3 text-sm">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[color:var(--color-klaivia-red)]" />
              <div>
                <div className="font-medium text-foreground">Aucune adresse email</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  Ce prospect n&apos;a pas d&apos;email renseigné. Modifie sa fiche pour en ajouter une.
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Toggle mode */}
              <div className="flex items-center gap-1 rounded-md border border-border bg-muted p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setMode("edit")}
                  className={`flex items-center gap-1.5 rounded px-2.5 py-1 transition-colors ${
                    mode === "edit"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Pencil className="size-3" /> Édition
                </button>
                <button
                  type="button"
                  onClick={() => setMode("preview")}
                  className={`flex items-center gap-1.5 rounded px-2.5 py-1 transition-colors ${
                    mode === "preview"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Eye className="size-3" /> Aperçu
                </button>
              </div>

              {/* Destinataire */}
              <div className="grid grid-cols-[80px_1fr] items-center gap-2 text-sm">
                <span className="text-xs font-medium text-muted-foreground">À</span>
                <div className="rounded-md border border-border bg-muted px-3 py-1.5 text-sm">
                  {prospectEmail}
                </div>
              </div>

              {mode === "edit" ? (
                <>
                  <div className="grid grid-cols-[80px_1fr] items-center gap-2 text-sm">
                    <Label htmlFor="cc" className="text-xs font-medium text-muted-foreground">
                      CC
                    </Label>
                    <Input
                      id="cc"
                      value={cc}
                      onChange={(e) => setCc(e.target.value)}
                      placeholder="Optionnel — ex. contact@klaivia.ch"
                      className="h-9"
                    />
                  </div>

                  <div className="grid grid-cols-[80px_1fr] items-center gap-2 text-sm">
                    <Label htmlFor="subject" className="text-xs font-medium text-muted-foreground">
                      Objet
                    </Label>
                    <Input
                      id="subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder={loading ? "Chargement du brouillon…" : "Objet de l'email"}
                      className="h-9"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <Label htmlFor="body" className="text-xs font-medium text-muted-foreground">
                      Message
                    </Label>
                    <Textarea
                      id="body"
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      rows={10}
                      placeholder={loading ? "Chargement du brouillon…" : "Contenu de l'email"}
                      className="mt-1 font-mono text-sm"
                      disabled={loading}
                    />
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      {body.length} caractère{body.length > 1 ? "s" : ""}
                    </div>
                  </div>
                </>
              ) : (
                // Preview mode — rendu lisible
                <div className="rounded-md border border-border bg-background p-4">
                  <div className="mb-3 space-y-1 border-b border-border pb-3 text-xs">
                    <div>
                      <span className="text-muted-foreground">De : </span>
                      <span className="font-medium">
                        {process.env.NEXT_PUBLIC_SMTP_FROM || "contact@klaivia.ch"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">À : </span>
                      <span className="font-medium">{prospectEmail}</span>
                    </div>
                    {cc && (
                      <div>
                        <span className="text-muted-foreground">CC : </span>
                        <span className="font-medium">{cc}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">Objet : </span>
                      <span className="font-medium">{subject || <em>(vide)</em>}</span>
                    </div>
                  </div>
                  <div className="whitespace-pre-wrap text-sm text-foreground">
                    {body || <em className="text-muted-foreground">(corps vide)</em>}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button
              disabled={!canSend || isPending}
              onClick={() => setConfirmOpen(true)}
              className="bg-[color:var(--color-klaivia-orange)] text-white hover:bg-[color:var(--color-klaivia-orange-light)]"
            >
              <Send className="size-3.5" /> Envoyer…
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Double-confirmation avant envoi réel */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md bg-card">
          <DialogHeader>
            <DialogTitle>Confirmer l&apos;envoi</DialogTitle>
            <DialogDescription className="text-xs">
              L&apos;email va être envoyé à{" "}
              <span className="font-medium text-foreground">{prospectEmail}</span>. Cette action
              est définitive.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border border-border bg-muted/40 p-3 text-xs">
            <div className="font-medium text-foreground">Objet</div>
            <div className="mt-0.5 text-muted-foreground">{subject}</div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Retour
            </Button>
            <Button
              disabled={isPending}
              onClick={onSend}
              className="bg-[color:var(--color-klaivia-orange)] text-white hover:bg-[color:var(--color-klaivia-orange-light)]"
            >
              <Send className="size-3.5" /> {isPending ? "Envoi…" : "Confirmer l'envoi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
