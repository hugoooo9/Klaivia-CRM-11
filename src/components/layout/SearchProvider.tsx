// Provider client qui monte la CommandPalette globalement — Ctrl+K l'ouvre partout
"use client";

import { useState } from "react";
import { CommandPalette } from "./CommandPalette";

type SearchProspect = {
  id: string;
  prenom: string;
  nom: string;
  entreprise: string | null;
  email: string | null;
  statut: string;
};

type SearchClient = {
  id: string;
  prospectId: string;
  prenom: string;
  nom: string;
  entreprise: string | null;
  pack: string;
};

type Props = {
  prospects: SearchProspect[];
  clients: SearchClient[];
};

export function SearchProvider({ prospects, clients }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <CommandPalette
      open={open}
      onOpenChange={setOpen}
      prospects={prospects}
      clients={clients}
    />
  );
}
