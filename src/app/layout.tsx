import type { Metadata } from "next";
import { DM_Sans, DM_Serif_Display } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/layout/Sidebar";
import { SearchProvider } from "@/components/layout/SearchProvider";
import { getGlobalStats } from "@/lib/stats";
import { db } from "@/lib/db";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const dmSerif = DM_Serif_Display({
  variable: "--font-dm-serif",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Klaivia CRM — Pilotage agence IA",
  description:
    "CRM interne Klaivia — pipeline agents IA, suivi clients et métriques d'automatisation pour une agence IA suisse-francophone.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Stats pour la sidebar (MRR, taux de conversion) — lues en Server Component
  const [stats, prospectsForSearch, clientsForSearch] = await Promise.all([
    getGlobalStats(),
    db.prospect.findMany({
      select: { id: true, prenom: true, nom: true, entreprise: true, email: true, statut: true },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    db.client.findMany({
      where: { statut: "Actif" },
      select: {
        id: true,
        prospectId: true,
        pack: true,
        prospect: { select: { prenom: true, nom: true, entreprise: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
  ]);

  const clientsMapped = clientsForSearch.map((c) => ({
    id: c.id,
    prospectId: c.prospectId,
    prenom: c.prospect.prenom,
    nom: c.prospect.nom,
    entreprise: c.prospect.entreprise,
    pack: c.pack,
  }));

  return (
    <html
      lang="fr"
      className={`${dmSans.variable} ${dmSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <TooltipProvider delay={150}>
          <Sidebar mrr={stats.mrr} tauxConversion={stats.tauxConversion} />
          <main className="ml-[220px] min-h-screen">{children}</main>
          <SearchProvider prospects={prospectsForSearch} clients={clientsMapped} />
          <Toaster
            theme="light"
            position="bottom-right"
            richColors
            closeButton
          />
        </TooltipProvider>
      </body>
    </html>
  );
}
