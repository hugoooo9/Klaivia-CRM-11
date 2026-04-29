// Page de login — server component avec form action
import { Sparkles } from "lucide-react";
import { LoginForm } from "./LoginForm";

type SearchParams = Promise<{ from?: string }>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  return (
    <div
      className="-ml-[220px] flex min-h-screen items-center justify-center p-6"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(91,63,166,0.08), transparent 70%), radial-gradient(ellipse 60% 50% at 100% 100%, rgba(0,189,165,0.06), transparent 70%), var(--background)",
      }}
    >
      <div className="w-full max-w-sm">
        {/* Logo + nom au-dessus de la carte */}
        <div className="mb-6 flex flex-col items-center">
          <div
            className="mb-3 flex size-14 items-center justify-center rounded-2xl shadow-[0_8px_24px_rgba(91,63,166,0.35)]"
            style={{
              background:
                "linear-gradient(135deg, var(--color-klaivia-violet) 0%, var(--color-klaivia-violet-light) 100%)",
            }}
          >
            <Sparkles className="size-7 text-white" />
          </div>
          <div className="text-xl font-semibold tracking-tight text-foreground">Klaivia CRM</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Accès réservé — entre ton mot de passe
          </div>
        </div>
        <div className="klaivia-card-elevated p-7">
          <LoginForm from={sp.from || "/"} />
        </div>
        <div className="mt-5 text-center text-[11px] text-muted-foreground">
          © Klaivia · Agence IA pour TPE/PME suisses
        </div>
      </div>
    </div>
  );
}
