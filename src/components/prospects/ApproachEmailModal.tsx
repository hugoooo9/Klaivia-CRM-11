// Modal "Mail d'approche" — pré-remplit via template optimisé selon secteur prospect, édite, envoie ou sauvegarde brouillon
"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, RefreshCw, Send, Save, X, Globe, Cog, Bot, Clock, Settings } from "lucide-react";

type Service = "web" | "automation" | "agent";

const SERVICE_TABS: { id: Service; label: string; icon: typeof Globe; desc: string }[] = [
  { id: "web", label: "Site web", icon: Globe, desc: "Proposer un site web" },
  { id: "automation", label: "Automatisation IA", icon: Cog, desc: "Automatiser tâches" },
  { id: "agent", label: "Agent IA", icon: Bot, desc: "Agent vocal / chat 24/7" },
];
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
  scheduleApproachEmail,
  getApproachTemplate,
  saveApproachTemplate,
  resetApproachTemplate,
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
  const [service, setService] = useState<Service>("agent");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleAt, setScheduleAt] = useState<string>("");
  const [templateEditOpen, setTemplateEditOpen] = useState(false);
  const [templateSubject, setTemplateSubject] = useState("");
  const [templateBody, setTemplateBody] = useState("");
  const [templateIsCustom, setTemplateIsCustom] = useState(false);
  const [isGenerating, startGenTransition] = useTransition();
  const [isSending, startSendTransition] = useTransition();
  const [isSaving, startSaveTransition] = useTransition();
  const [isScheduling, startScheduleTransition] = useTransition();

  const busy = isGenerating || isSending || isSaving || isScheduling;

  // À l'ouverture : si initialDraft → l'utiliser, sinon générer auto
  useEffect(() => {
    if (!open) return;
    if (initialDraft) {
      setSubject(initialDraft.subject);
      setBody(initialDraft.body);
      return;
    }
    if (subject || body) return; // déjà chargé
    runGenerate(service);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Reset état quand on ferme
  useEffect(() => {
    if (!open) {
      setSubject("");
      setBody("");
      setErrorMsg(null);
      setService("agent");
    }
  }, [open]);

  const runGenerate = (svc: Service = service) => {
    setErrorMsg(null);
    setService(svc);
    startGenTransition(async () => {
      try {
        const res = await generateApproachEmail(prospectId, svc);
        if (res.ok) {
          setSubject(res.subject);
          setBody(res.body);
        } else {
          setErrorMsg(res.error);
          toast.error(res.error);
        }
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
        const res = await saveDraftEmail({ prospectId, subject, body });
        if (res.ok) {
          toast.success("Brouillon enregistré");
          onOpenChange(false);
        } else {
          toast.error(res.error);
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur");
      }
    });
  };

  const openTemplateEdit = async () => {
    try {
      const tpl = await getApproachTemplate(service);
      setTemplateSubject(tpl.subjectTemplate);
      setTemplateBody(tpl.bodyTemplate);
      setTemplateIsCustom(tpl.isCustom);
      setTemplateEditOpen(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Impossible de charger le template");
    }
  };

  const onSaveTemplate = () => {
    if (!templateSubject.trim() || !templateBody.trim()) {
      toast.error("Objet et corps requis");
      return;
    }
    startSaveTransition(async () => {
      try {
        const res = await saveApproachTemplate({
          service,
          subjectTemplate: templateSubject,
          bodyTemplate: templateBody,
        });
        if (res.ok) {
          toast.success("Template enregistré");
          setTemplateEditOpen(false);
          setTemplateIsCustom(true);
          // Re-genère mail avec nouveau template
          runGenerate(service);
        } else {
          toast.error(res.error);
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur sauvegarde");
      }
    });
  };

  const onResetTemplate = () => {
    if (!confirm("Restaurer le template par défaut ? Tes modifications seront perdues.")) return;
    startSaveTransition(async () => {
      try {
        const res = await resetApproachTemplate(service);
        if (res.ok) {
          toast.success("Template par défaut restauré");
          setTemplateEditOpen(false);
          setTemplateIsCustom(false);
          runGenerate(service);
        } else {
          toast.error(res.error);
        }
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

  const askSchedule = () => {
    if (!subject.trim() || !body.trim()) {
      toast.error("Objet et corps requis");
      return;
    }
    if (!prospectEmail) {
      toast.error("Ce prospect n'a pas d'adresse email");
      return;
    }
    // Pré-remplit avec demain 9h00 par défaut
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    const localIso = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setScheduleAt(localIso);
    setScheduleOpen(true);
  };

  const onConfirmSchedule = () => {
    if (!scheduleAt) {
      toast.error("Choisis une date");
      return;
    }
    startScheduleTransition(async () => {
      try {
        const res = await scheduleApproachEmail({
          prospectId,
          subject,
          body,
          scheduledAt: new Date(scheduleAt).toISOString(),
        });
        if (res.ok) {
          toast.success(`Mail programmé pour ${new Date(scheduleAt).toLocaleString("fr-CH")}`);
          setScheduleOpen(false);
          onOpenChange(false);
        } else {
          toast.error(res.error);
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur programmation");
      }
    });
  };

  const onConfirmSend = () => {
    startSendTransition(async () => {
      try {
        const res = await sendApproachEmailV2({ prospectId, subject, body });
        if (res.ok) {
          toast.success(`Email envoyé à ${prospectEmail}`);
          setConfirmOpen(false);
          onOpenChange(false);
        } else {
          toast.error(res.error);
          setConfirmOpen(false);
        }
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
          <DialogTitle>Mail d&apos;approche</DialogTitle>
          <DialogDescription className="text-xs">
            {prospectEmail ? (
              <>Destinataire : <span className="font-mono">{prospectEmail}</span></>
            ) : (
              <span className="text-destructive">⚠ Pas d&apos;adresse email — l&apos;envoi sera bloqué</span>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Sélecteur service Klaivia à proposer */}
        {!initialDraft && (
          <div className="grid grid-cols-3 gap-2">
            {SERVICE_TABS.map((tab) => {
              const active = service === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => runGenerate(tab.id)}
                  disabled={busy}
                  className={`group flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all ${
                    active
                      ? "border-[color:var(--color-klaivia-violet)] bg-[color:var(--color-klaivia-violet-pale)] shadow-sm"
                      : "border-border bg-card hover:border-[color:var(--color-klaivia-violet)]/40 hover:bg-muted/40"
                  } ${busy ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <div className="flex items-center gap-2">
                    <Icon
                      className={`size-4 ${
                        active ? "text-[color:var(--color-klaivia-violet)]" : "text-muted-foreground"
                      }`}
                    />
                    <span
                      className={`text-sm font-semibold ${
                        active ? "text-[color:var(--color-klaivia-violet)]" : "text-foreground"
                      }`}
                    >
                      {tab.label}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">{tab.desc}</span>
                </button>
              );
            })}
          </div>
        )}

        {isGenerating && !subject && !body ? (
          <div className="flex flex-col items-center gap-3 py-12">
            <Loader2 className="size-8 animate-spin text-[color:var(--color-klaivia-violet)]" />
            <p className="text-sm font-medium text-foreground">Préparation du mail…</p>
            <p className="text-xs text-muted-foreground">Personnalisation avec les infos du prospect</p>
          </div>
        ) : errorMsg && !subject && !body ? (
          <div className="space-y-3 rounded-md border border-destructive/30 bg-destructive/10 p-4">
            <div>
              <p className="text-sm font-semibold text-destructive">Erreur génération du mail</p>
              <p className="mt-1 whitespace-pre-wrap text-xs text-foreground">{errorMsg}</p>
            </div>
            <Button onClick={() => runGenerate()} size="sm" variant="outline">
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
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => runGenerate()}
              disabled={busy}
              title="Régénérer le template"
            >
              {isGenerating ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <RefreshCw className="size-3.5" />
              )}
              Régénérer
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={openTemplateEdit}
              disabled={busy}
              title="Modifier et enregistrer le template"
            >
              <Settings className="size-3.5" />
              Modifier template
            </Button>
          </div>
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
              variant="outline"
              size="sm"
              onClick={askSchedule}
              disabled={busy || !subject.trim() || !body.trim() || !prospectEmail}
              title="Programmer l'envoi à une date/heure"
            >
              <Clock className="size-3.5" />
              Programmer
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

    {/* Dialog édition template */}
    <Dialog open={templateEditOpen} onOpenChange={(v) => !isSaving && setTemplateEditOpen(v)}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto bg-card">
        <DialogHeader>
          <DialogTitle>
            Modifier le template — {SERVICE_TABS.find((t) => t.id === service)?.label}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {templateIsCustom ? (
              <span className="font-semibold text-[color:var(--color-klaivia-violet)]">
                Template personnalisé actif
              </span>
            ) : (
              <span>Template par défaut</span>
            )}
            {" — "}
            Variables : <code className="rounded bg-muted px-1 py-0.5">{`{entreprise}`}</code>{" "}
            <code className="rounded bg-muted px-1 py-0.5">{`{prenom}`}</code>{" "}
            <code className="rounded bg-muted px-1 py-0.5">{`{nom}`}</code>{" "}
            <code className="rounded bg-muted px-1 py-0.5">{`{ville}`}</code>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="tpl-subject">Objet</Label>
            <Input
              id="tpl-subject"
              value={templateSubject}
              onChange={(e) => setTemplateSubject(e.target.value)}
              disabled={isSaving}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="tpl-body">Corps</Label>
            <Textarea
              id="tpl-body"
              rows={16}
              value={templateBody}
              onChange={(e) => setTemplateBody(e.target.value)}
              disabled={isSaving}
              className="mt-1 font-mono text-sm leading-relaxed"
            />
          </div>
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          {templateIsCustom && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onResetTemplate}
              disabled={isSaving}
              className="text-destructive hover:bg-destructive/10"
            >
              Restaurer défaut
            </Button>
          )}
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={() => setTemplateEditOpen(false)} disabled={isSaving}>
              Annuler
            </Button>
            <Button
              onClick={onSaveTemplate}
              disabled={isSaving || !templateSubject.trim() || !templateBody.trim()}
              className="klaivia-btn-primary font-semibold"
            >
              {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              Enregistrer template
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Dialog programmation envoi */}
    <Dialog open={scheduleOpen} onOpenChange={(v) => !isScheduling && setScheduleOpen(v)}>
      <DialogContent className="max-w-md bg-card">
        <DialogHeader>
          <DialogTitle>Programmer l&apos;envoi</DialogTitle>
          <DialogDescription className="text-xs">
            Le mail sera envoyé automatiquement à la date/heure choisie.
            Destinataire : <span className="font-mono font-semibold text-foreground">{prospectEmail}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="scheduled-at">Date et heure d&apos;envoi</Label>
            <Input
              id="scheduled-at"
              type="datetime-local"
              value={scheduleAt}
              onChange={(e) => setScheduleAt(e.target.value)}
              min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
                .toISOString()
                .slice(0, 16)}
              className="mt-1"
              disabled={isScheduling}
            />
          </div>
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-900">
            ⓘ L&apos;envoi se déclenche via un cron qui tourne toutes les 5 minutes.
            Précision réelle : ±5 min autour de l&apos;heure choisie.
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setScheduleOpen(false)} disabled={isScheduling}>
            Retour
          </Button>
          <Button
            onClick={onConfirmSchedule}
            disabled={isScheduling || !scheduleAt}
            className="klaivia-btn-primary font-semibold"
          >
            {isScheduling ? <Loader2 className="size-3.5 animate-spin" /> : <Clock className="size-3.5" />}
            Programmer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
