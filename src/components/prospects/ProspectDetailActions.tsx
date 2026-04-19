// Barre d'actions en haut de la fiche prospect : modifier, interaction, avancer, convertir
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, MessageSquarePlus, ChevronRight, Trophy, Trash2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ProspectForm } from "./ProspectForm";
import { InteractionModal } from "./InteractionModal";
import { ConvertClientModal } from "./ConvertClientModal";
import { SendEmailDialog } from "./SendEmailDialog";
import {
  advanceProspectStatut, markProspectPerdu, deleteProspect,
} from "@/actions/prospects";
import type { Pack } from "@/lib/constants";

type Props = {
  id: string;
  prenom: string;
  nom: string;
  email: string | null;
  statut: string;
  hasClient: boolean;
  packInteret: string | null;
  // Valeurs pour pré-remplir le form d'édition
  editDefaults: Record<string, unknown>;
};

export function ProspectDetailActions({ id, prenom, nom, email, statut, hasClient, packInteret, editDefaults }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [interactOpen, setInteractOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [perduOpen, setPerduOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [perduReason, setPerduReason] = useState("");

  const fullName = `${prenom} ${nom}`;
  const canAdvance = statut !== "Signé" && statut !== "Perdu";
  const canConvert = !hasClient && statut !== "Perdu";

  const onAdvance = () => {
    startTransition(async () => {
      try {
        const updated = await advanceProspectStatut(id);
        toast.success(`${fullName} → ${updated.statut}`);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Erreur");
      }
    });
  };

  const onPerdu = () => {
    if (!perduReason.trim()) {
      toast.error("Précise la raison de la perte");
      return;
    }
    startTransition(async () => {
      try {
        await markProspectPerdu(id, perduReason);
        toast.success(`${fullName} marqué comme Perdu`);
        setPerduOpen(false);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Erreur");
      }
    });
  };

  const onDelete = () => {
    startTransition(async () => {
      try {
        await deleteProspect(id);
        toast.success(`${fullName} supprimé`);
        router.push("/prospects");
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Erreur");
      }
    });
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          <Pencil className="size-3.5" /> Modifier
        </Button>
        <Button
          variant="outline" size="sm"
          onClick={() => setInteractOpen(true)}
        >
          <MessageSquarePlus className="size-3.5" /> Ajouter interaction
        </Button>
        <Button
          variant="outline" size="sm"
          onClick={() => setEmailOpen(true)}
          disabled={!email}
          title={email ? "Envoyer un email d'approche" : "Ajoute une adresse email au prospect"}
        >
          <Send className="size-3.5" /> Envoyer email
        </Button>
        {canAdvance && (
          <Button
            size="sm" onClick={onAdvance}
            className="bg-[color:var(--color-klaivia-orange)] text-white hover:bg-[color:var(--color-klaivia-orange-light)]"
          >
            <ChevronRight className="size-3.5" /> Avancer statut
          </Button>
        )}
        {canConvert && (
          <Button
            size="sm" onClick={() => setConvertOpen(true)}
            className="bg-[color:var(--color-klaivia-green)] text-white hover:brightness-110"
          >
            <Trophy className="size-3.5" /> Convertir en client
          </Button>
        )}
        {canAdvance && (
          <Button variant="outline" size="sm" onClick={() => setPerduOpen(true)}>
            Marquer Perdu
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)}
          className="ml-auto text-[color:var(--color-klaivia-red)] hover:bg-destructive/10">
          <Trash2 className="size-3.5" /> Supprimer
        </Button>
      </div>

      <ProspectForm open={editOpen} onOpenChange={setEditOpen} initial={{ ...editDefaults, id }} />
      <InteractionModal open={interactOpen} onOpenChange={setInteractOpen} prospectId={id} />
      <SendEmailDialog
        open={emailOpen} onOpenChange={setEmailOpen}
        prospectId={id} prospectName={fullName} prospectEmail={email}
      />
      <ConvertClientModal
        open={convertOpen} onOpenChange={setConvertOpen}
        prospectId={id} prospectName={fullName}
        defaultPack={(packInteret as Pack) || undefined}
      />

      {/* Dialog "marquer perdu" */}
      <Dialog open={perduOpen} onOpenChange={setPerduOpen}>
        <DialogContent className="max-w-md bg-card">
          <DialogHeader>
            <DialogTitle>Marquer {fullName} comme perdu</DialogTitle>
            <DialogDescription className="text-xs">
              Précise la raison — utile pour identifier les causes récurrentes.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={4} value={perduReason}
            onChange={(e) => setPerduReason(e.target.value)}
            placeholder="Ex : budget insuffisant, concurrent retenu, timing mauvais…"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPerduOpen(false)}>Annuler</Button>
            <Button variant="destructive" onClick={onPerdu}>Confirmer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog "supprimer" */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm bg-card">
          <DialogHeader>
            <DialogTitle>Supprimer {fullName} ?</DialogTitle>
            <DialogDescription className="text-xs">
              Cette action est définitive et supprime aussi toutes les interactions associées.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Annuler</Button>
            <Button variant="destructive" onClick={onDelete}>Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
