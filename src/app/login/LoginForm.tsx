// Form client — gère l'erreur retournée par le server action
"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { loginAction } from "./actions";

export function LoginForm({ from }: { from: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(fd: FormData) => {
        setError(null);
        startTransition(async () => {
          const res = await loginAction(fd);
          if (res?.error) setError(res.error);
        });
      }}
      className="space-y-4"
    >
      <input type="hidden" name="from" value={from} />
      <div>
        <Label htmlFor="password">Mot de passe</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoFocus
          autoComplete="current-password"
          className="mt-1"
        />
      </div>
      {error && (
        <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
          {error}
        </div>
      )}
      <Button
        type="submit"
        disabled={isPending}
        className="w-full bg-[color:var(--color-klaivia-orange)] text-white hover:bg-[color:var(--color-klaivia-orange-light)]"
      >
        {isPending ? "…" : "Se connecter"}
      </Button>
    </form>
  );
}
