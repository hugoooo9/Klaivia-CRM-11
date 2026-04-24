// Instrumentation Next 16 — exécute migrate deploy au boot du serveur Node.
// Filet de sécurité si la start command de l'hébergeur saute `npm start`.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.SKIP_BOOT_MIGRATE === "true") return;

  const { execSync } = await import("node:child_process");
  try {
    execSync("npx prisma migrate deploy", { stdio: "inherit" });
    console.log("[instrumentation] prisma migrate deploy OK");
  } catch (e) {
    console.error("[instrumentation] prisma migrate deploy failed:", e);
  }
}
