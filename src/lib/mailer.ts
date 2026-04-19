// SMTP mailer — envoi via contact@klaivia.ch (ou compte configuré dans .env)
// Config attendue (voir .env.example) :
//   SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM

import nodemailer, { type Transporter } from "nodemailer";

let cachedTransporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (cachedTransporter) return cachedTransporter;

  const host = process.env.SMTP_HOST;
  const portStr = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !portStr || !user || !pass) {
    throw new Error(
      "SMTP non configuré. Renseigne SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS dans .env."
    );
  }

  const port = Number(portStr);
  // Port 465 = SSL (secure = true) ; 587 = STARTTLS (secure = false).
  const secure = process.env.SMTP_SECURE
    ? process.env.SMTP_SECURE === "true"
    : port === 465;

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  return cachedTransporter;
}

export type SendMailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  cc?: string;
  bcc?: string;
};

export async function sendMail(input: SendMailInput): Promise<{ messageId: string }> {
  const transporter = getTransporter();
  const from = process.env.SMTP_FROM || `Klaivia <${process.env.SMTP_USER}>`;

  const info = await transporter.sendMail({
    from,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html ?? textToHtml(input.text),
    replyTo: input.replyTo,
    cc: input.cc,
    bcc: input.bcc,
  });

  return { messageId: info.messageId };
}

// Conversion basique texte → HTML (préserve les sauts de ligne)
function textToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const paragraphs = escaped
    .split(/\n\s*\n/)
    .map((p) => `<p>${p.replace(/\n/g, "<br />")}</p>`)
    .join("\n");
  return `<!doctype html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#2E3B4E;">${paragraphs}</body></html>`;
}

// Ping SMTP (à appeler depuis un endpoint de debug si besoin)
export async function verifySmtp(): Promise<boolean> {
  const transporter = getTransporter();
  await transporter.verify();
  return true;
}
