// Modal "Mail d'approche IA" — génère via Gemini, édite, envoie ou sauvegarde brouillon
"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, RefreshCw, Send, Save, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  generateApproachEmail,
  saveDraftEmail,
  sendApproachEmailV2,
} from "@/actions/email-generation";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospectId: string;
  prospectEmail: string | null;
  // Brouillon optionnel à pré-remplir (ex: rouvrir un brouillon existant)
  initialDraft?: { subject: string; body: string } | null;
};

export function ApproachEmailModal({
  open,
  onOpenChange,
  prospectId,
  prospectEmail,
  initialDraft,
}: Props) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isGenerating, startGenTransition] = useTransition();
  const [isSending, startSendTransition] = useTransition();
  const [isSaving, startSaveTransition] = useTransition();

  const busy = isGenerating || isSending || isSaving;

  // À l'ouverture : si initialDraft → l'utiliser, sinon générer auto
  useEffect(() => {
    if (!open) return;
    if (initialDraft) {
      setSubject(initialDraft.subject);
      setBody(initialDraft.body);
      return;
    }
    if (subject || body) return; // déjà chargé
    runGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Reset état quand on ferme
  useEffect(() => {
    if (!open) {
      setSubject("");
      setBody("");
      setErrorMsg(null);
    }
  }, [open]);

  const runGenerate = () => {
    setErrorMsg(null);
    startGenTransition(async () => {
      try {
        const res = await generateApproachEmail(prospectId);
        setSubject(res.subject);
        setBody(res.body);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Erreur génération";
        setErrorMsg(msg);
        toast.error(msg);
      }
    });
  };

  const onSaveDraft = () => {
    if (!subject.trim() || !body.trim()) {
      toast.error("Objet et corps requis");
      return;
    }
    startSaveTransition(async () => {
      try {
        await saveDraftEmail({ prospectId, subject, body });
        toast.success("Brouillon enregistré");
        onOpenChange(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur");
      }
    });
  };

  const askConfirmSend = () => {
    if (!subject.trim() || !body.trim()) {
      toast.error("Objet et corps requis");
      return;
    }
    if (!prospectEmail) {
      toast.error("Ce prospect n'a pas d'adresse email");
      return;
    }
    setConfirmOpen(true);
  };

  const onConfirmSend = () => {
    startSendTransition(async () => {
      try {
        await sendApproachEmailV2({ prospectId, subject, body });
        toast.success(`Email envoyé à ${prospectEmail}`);
        setConfirmOpen(false);
        onOpenChange(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur d'envoi");
        setConfirmOpen(false);
      }
    });
  };

  return (
    <>
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto bg-card">
        <DialogHeader>
          <DialogTitle>Mail d&apos;approche IA</DialogTitle>
          <DialogDescription className="text-xs">
            {prospectEmail ? (
              <>Destinataire : <span className="font-mono">{prospectEmail}</span></>
            ) : (
              <span className="text-destructive">⚠ Pas d&apos;adresse email — l&apos;envoi sera bloqué</span>
            )}
          </DialogDescription>
        </DialogHeader>

        {isGenerating && !subject && !body ? (
          <div className="flex flex-col items-center gap-3 py-12">
            <Loader2 className="size-8 animate-spin text-[color:var(--color-klaivia-violet)]" />
            <p className="text-sm font-medium text-foreground">Klaivia rédige le mail…</p>
            <p className="text-xs text-muted-foreground">Gemini analyse le profil prospect</p>
          </div>
        ) : errorMsg && !subject && !body ? (
          <div className="space-y-3 rounded-md border border-destructive/30 bg-destructive/10 p-4">
            <div>
              <p className="text-sm font-semibold text-destructive">Erreur génération Gemini</p>
              <p className="mt-1 whitespace-pre-wrap text-xs text-foreground">{errorMsg}</p>
            </div>
            <Button onClick={runGenerate} size="sm" variant="outline">
              <RefreshCw className="size-3.5" /> Réessayer
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label htmlFor="email-subject">Objet</Label>
              <Input
                id="email-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={busy}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="email-body">Corps du mail</Label>
              <Textarea
                id="email-body"
                rows={14}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                disabled={busy}
                className="mt-1 font-mono text-sm leading-relaxed"
              />
            </div>
          </div>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={runGenerate}
            disabled={busy}
            title="Régénérer avec Gemini"
          >
            {isGenerating ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
            Régénérer
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={busy}>
              <X className="size-3.5" /> Annuler
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onSaveDraft}
              disabled={busy || !subject.trim() || !body.trim()}
            >
              {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              Brouillon
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={askConfirmSend}
              disabled={busy || !subject.trim() || !body.trim() || !prospectEmail}
              className="klaivia-btn-primary font-semibold"
            >
              {isSending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
              Envoyer
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Dialog confirmation envoi */}
    <Dialog open={confirmOpen} onOpenChange={(v) => !isSending && setConfirmOpen(v)}>
      <DialogContent className="max-w-md bg-card">
        <DialogHeader>
          <DialogTitle>Confirmer l&apos;envoi</DialogTitle>
          <DialogDescription className="text-xs">
            Le mail va partir vers <span className="font-mono font-semibold text-foreground">{prospectEmail}</span>.
            Cette action est définitive.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 rounded-md border border-border bg-muted/40 p-3 text-xs">
          <div>
            <span className="text-muted-foreground">Objet :</span>{" "}
            <span className="font-semibold text-foreground">{subject}</span>
          </div>
          <div className="border-t border-border pt-2">
            <p className="line-clamp-4 whitespace-pre-wrap text-muted-foreground">{body}</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={isSending}>
            Retour
          </Button>
          <Button
            onClick={onConfirmSend}
            disabled={isSending}
            className="klaivia-btn-primary font-semibold"
          >
            {isSending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
            Confirmer & envoyer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
