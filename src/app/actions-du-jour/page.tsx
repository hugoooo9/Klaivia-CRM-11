// Actions du jour — 3 sections : à contacter aujourd'hui / en retard / démos cette semaine
import { Topbar } from "@/components/layout/Topbar";
import { db } from "@/lib/db";
import { ActionItem } from "@/components/actions/ActionItem";
import { Flame, AlarmClock, CalendarDays } from "lucide-react";

export default async function ActionsDuJourPage() {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  const endOfWeek = new Date(now);
  endOfWeek.setDate(endOfWeek.getDate() + 7);
  endOfWeek.setHours(23, 59, 59, 999);

  const [aujourdhui, enRetard, demos] = await Promise.all([
    // À contacter aujourd'hui (prochainStep dans la journée)
    db.prospect.findMany({
      where: {
        prochainStep: { gte: startOfToday, lte: endOfToday },
        statut: { notIn: ["Signé", "Perdu"] },
      },
      orderBy: [{ urgence: "asc" }, { prochainStep: "asc" }],
    }),
    // En retard (prochainStep strictement avant aujourd'hui)
    db.prospect.findMany({
      where: {
        prochainStep: { lt: startOfToday },
        statut: { notIn: ["Signé", "Perdu"] },
      },
      orderBy: [{ prochainStep: "asc" }],
    }),
    // Démos planifiées cette semaine
    db.prospect.findMany({
      where: {
        statut: "Démo planifiée",
        prochainStep: { gte: startOfToday, lte: endOfWeek },
      },
      orderBy: [{ prochainStep: "asc" }],
    }),
  ]);

  const total = aujourdhui.length + enRetard.length + demos.length;

  return (
    <>
      <Topbar
        title="Actions du jour"
        subtitle={
          total === 0
            ? "Rien à traiter pour l'instant — ton pipeline est à jour"
            : `${total} action${total > 1 ? "s" : ""} à traiter aujourd'hui`
        }
      />
      <div className="p-8 space-y-6">
        <Section
          title="À contacter aujourd'hui"
          icon={Flame}
          accent="text-[color:var(--color-klaivia-gold)]"
          count={aujourdhui.length}
          emptyMsg="Rien de prévu aujourd'hui — profite-en pour prospecter !"
          items={aujourdhui}
        />

        <Section
          title="En retard"
          icon={AlarmClock}
          accent="text-[color:var(--color-klaivia-red)]"
          count={enRetard.length}
          emptyMsg="Aucune relance en retard — bravo, tu suis le rythme."
          items={enRetard}
        />

        <Section
          title="Démos cette semaine"
          icon={CalendarDays}
          accent="text-[color:var(--color-klaivia-orange)]"
          count={demos.length}
          emptyMsg="Aucune démo planifiée dans les 7 prochains jours."
          items={demos}
        />
      </div>
    </>
  );
}

type SectionProps = {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  count: number;
  emptyMsg: string;
  items: Array<{
    id: string;
    prenom: string;
    nom: string;
    entreprise: string | null;
    email: string | null;
    phone: string | null;
    statut: string;
    urgence: string;
    canal: string;
    prochainStep: Date | null;
    packInteret: string | null;
  }>;
};

function Section({ title, icon: Icon, accent, count, emptyMsg, items }: SectionProps) {
  return (
    <div className="klaivia-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`size-5 ${accent}`} />
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {count}
          </span>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">{emptyMsg}</p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((p) => (
            <ActionItem key={p.id} prospect={p} />
          ))}
        </ul>
      )}
    </div>
  );
}
