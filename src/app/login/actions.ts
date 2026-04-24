// Server action pour le login — vérifie le password et pose le cookie de session
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, isPasswordValid, signSessionToken } from "@/lib/auth";

const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 jours

export async function loginAction(formData: FormData): Promise<{ error?: string }> {
  const password = String(formData.get("password") || "");
  const from = String(formData.get("from") || "/");

  if (!isPasswordValid(password)) {
    return { error: "Mot de passe incorrect" };
  }

  const token = signSessionToken();
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  // Redirect vers la page demandée (si fournie via ?from=...) ou la racine
  const safeFrom = from.startsWith("/") && !from.startsWith("//") ? from : "/";
  redirect(safeFrom);
}

export async function logoutAction() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}
