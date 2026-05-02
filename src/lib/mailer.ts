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
      "SMTP non configuré. Renseigne SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS dans .env.",
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

  // Si le user n'a pas fourni de HTML custom, on génère :
  //   - HTML : corps formaté + signature pro
  //   - text : corps + version texte plate de la signature (clients sans HTML)
  const finalHtml = input.html ?? buildHtmlEmail(input.text);
  const finalText = appendTextSignature(input.text);

  const info = await transporter.sendMail({
    from,
    to: input.to,
    subject: input.subject,
    text: finalText,
    html: finalHtml,
    replyTo: input.replyTo,
    cc: input.cc,
    bcc: input.bcc,
  });

  return { messageId: info.messageId };
}

// Construit l'HTML complet : corps user + signature pro
function buildHtmlEmail(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const paragraphs = escaped
    .split(/\n\s*\n/)
    .map((p) => `<p style="margin:0 0 14px 0;">${p.replace(/\n/g, "<br />")}</p>`)
    .join("\n");

  return `<!doctype html>
<html>
<body style="margin:0;padding:0;background-color:#F5F8FA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#2E3B4E;line-height:1.6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F5F8FA;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff;border-radius:12px;box-shadow:0 1px 3px rgba(46,59,78,0.08);overflow:hidden;">
          <tr>
            <td style="padding:32px 36px 8px 36px;font-size:15px;color:#2E3B4E;line-height:1.65;">
              ${paragraphs}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 36px 32px 36px;">
              ${KLAIVIA_SIGNATURE_HTML}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Signature HTML pro Klaivia — table-based pour compat Outlook/Gmail/Apple Mail
const KLAIVIA_SIGNATURE_HTML = `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #EAF0F6;padding-top:20px;margin-top:8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <tr>
    <td style="vertical-align:top;padding-right:18px;">
      <!-- Logo K dans badge violet -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="56" height="56" align="center" valign="middle" style="width:56px;height:56px;background:linear-gradient(135deg,#5B3FA6 0%,#7B5DC8 100%);background-color:#5B3FA6;border-radius:14px;color:#ffffff;font-size:26px;font-weight:700;font-family:Georgia,serif;line-height:56px;text-align:center;">K</td>
        </tr>
      </table>
    </td>
    <td style="vertical-align:top;border-left:2px solid #EDE9FA;padding-left:18px;">
      <div style="font-size:16px;font-weight:600;color:#2E3B4E;letter-spacing:-0.01em;margin-bottom:2px;">Hugo</div>
      <div style="font-size:13px;font-weight:600;color:#5B3FA6;letter-spacing:0.01em;margin-bottom:8px;">Klaivia · Agence IA &amp; Sites Web</div>
      <div style="font-size:12px;color:#7C98B6;line-height:1.5;margin-bottom:10px;">
        Sites web · Automatisations · Agents IA<br/>
        Pour les PME romandes
      </div>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="font-size:12px;">
        <tr>
          <td style="padding-right:10px;">
            <a href="https://klaivia.ch" style="color:#5B3FA6;text-decoration:none;font-weight:600;">klaivia.ch</a>
          </td>
          <td style="color:#CBD6E2;padding-right:10px;">·</td>
          <td style="padding-right:10px;">
            <a href="https://www.instagram.com/klaivia.agency/" style="color:#5B3FA6;text-decoration:none;font-weight:600;">@klaivia.agency</a>
          </td>
          <td style="color:#CBD6E2;padding-right:10px;">·</td>
          <td>
            <a href="mailto:contact@klaivia.ch" style="color:#5B3FA6;text-decoration:none;font-weight:600;">contact@klaivia.ch</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;

// Version texte plate de la signature (fallback clients no-HTML)
const KLAIVIA_SIGNATURE_TEXT = `\n\n— —\nHugo
Klaivia · Agence IA & Sites Web
Sites web · Automatisations · Agents IA pour PME romandes

klaivia.ch · @klaivia.agency · contact@klaivia.ch`;

function appendTextSignature(body: string): string {
  return body.trimEnd() + KLAIVIA_SIGNATURE_TEXT;
}

// Ping SMTP (à appeler depuis un endpoint de debug si besoin)
export async function verifySmtp(): Promise<boolean> {
  const transporter = getTransporter();
  await transporter.verify();
  return true;
}
