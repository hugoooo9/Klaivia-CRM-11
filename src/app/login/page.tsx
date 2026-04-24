// Page de login — server component avec form action
import { LoginForm } from "./LoginForm";

type SearchParams = Promise<{ from?: string }>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  return (
    <div className="-ml-[220px] flex min-h-screen items-center justify-center bg-background p-6">
      <div className="klaivia-card w-full max-w-sm p-8">
        <div className="mb-6 text-center">
          <div className="font-[var(--font-dm-serif)] text-2xl text-[color:var(--color-klaivia-orange)]">
            Klaivia CRM
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Accès réservé — entre ton mot de passe
          </div>
        </div>
        <LoginForm from={sp.from || "/"} />
      </div>
    </div>
  );
}
