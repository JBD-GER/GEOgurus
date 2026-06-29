import type { APIRoute } from "astro";

export const prerender = false;

const RESEND_API_URL = "https://api.resend.com/emails";
const DEFAULT_FROM = "GEOgurus <info@geogurus.de>";
const DEFAULT_NOTIFY_TO = ["info@geogurus.de", "c.pfad@flaaq.com"];

type ContactPayload = {
  name?: string;
  email?: string;
  website?: string;
  message?: string;
  company?: string;
  source?: string;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const normalize = (value: unknown) => String(value || "").trim();

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const splitRecipients = (value: string | undefined) =>
  (value ? value.split(",") : DEFAULT_NOTIFY_TO).map((item) => item.trim()).filter(Boolean);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

const sendResendEmail = async ({
  apiKey,
  from,
  to,
  subject,
  html,
  text,
  replyTo,
}: {
  apiKey: string;
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}) => {
  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
      text,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend failed with ${response.status}: ${errorText}`);
  }

  return response.json();
};

const renderConfirmationHtml = ({ name, website, message }: { name: string; website: string; message: string }) => {
  const safeName = escapeHtml(name);
  const safeWebsite = escapeHtml(website || "Nicht angegeben");
  const safeMessage = escapeHtml(message || "Kein zusätzlicher Kontext").replace(/\n/g, "<br />");

  return `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Ihre Anfrage bei GEOgurus</title>
  </head>
  <body style="margin:0;background:#f7f2e8;color:#081111;font-family:Inter,Segoe UI,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f2e8;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #e0d9cc;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background:#081111;padding:28px 30px;color:#ffffff;">
                <div style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#13c8b5;font-weight:800;">GEOgurus</div>
                <h1 style="margin:10px 0 0;font-size:30px;line-height:1.15;">Ihre Anfrage ist angekommen.</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:30px;">
                <p style="margin:0 0 18px;font-size:17px;line-height:1.65;">Hallo ${safeName},</p>
                <p style="margin:0 0 18px;font-size:16px;line-height:1.65;color:#5d6a67;">
                  danke für Ihre Anfrage. Wir prüfen Ihre Angaben und melden uns mit einer ersten Einschätzung,
                  ob ein GEO-Audit, technische Optimierung, Content-Architektur oder Monitoring der sinnvollste nächste Schritt ist.
                </p>
                <div style="margin:26px 0;padding:20px;border:1px solid #e0d9cc;border-radius:10px;background:#fbf7ef;">
                  <div style="margin-bottom:14px;">
                    <strong style="display:block;font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:#0a7e74;">Website</strong>
                    <span style="font-size:16px;color:#081111;">${safeWebsite}</span>
                  </div>
                  <div>
                    <strong style="display:block;font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:#0a7e74;">Ihr Kontext</strong>
                    <p style="margin:6px 0 0;font-size:16px;line-height:1.6;color:#5d6a67;">${safeMessage}</p>
                  </div>
                </div>
                <p style="margin:0 0 18px;font-size:16px;line-height:1.65;color:#5d6a67;">
                  Falls Sie noch etwas ergänzen möchten, antworten Sie einfach auf diese E-Mail.
                </p>
                <p style="margin:0;font-size:16px;line-height:1.65;">
                  Beste Grüße<br />
                  <strong>GEOgurus</strong>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 30px;background:#f4ecdf;color:#5d6a67;font-size:13px;line-height:1.5;">
                GEOgurus | GEO-Agentur für KI-Suche, generative Antworten und klassische SEO-Sichtbarkeit
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

const renderInternalHtml = ({
  name,
  email,
  website,
  message,
  source,
}: {
  name: string;
  email: string;
  website: string;
  message: string;
  source: string;
}) => {
  const rows = [
    ["Name", name],
    ["E-Mail", email],
    ["Website", website || "Nicht angegeben"],
    ["Quelle", source || "Website-Formular"],
  ];

  const tableRows = rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #e0d9cc;color:#5d6a67;font-weight:700;">${escapeHtml(label)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e0d9cc;color:#081111;">${escapeHtml(value)}</td>
        </tr>`
    )
    .join("");

  return `<!doctype html>
<html lang="de">
  <body style="margin:0;background:#f7f2e8;color:#081111;font-family:Inter,Segoe UI,Arial,sans-serif;">
    <div style="max-width:720px;margin:0 auto;padding:28px 12px;">
      <div style="background:#ffffff;border:1px solid #e0d9cc;border-radius:12px;overflow:hidden;">
        <div style="background:#081111;color:#ffffff;padding:24px;">
          <div style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#13c8b5;font-weight:800;">Neue GEOgurus Anfrage</div>
          <h1 style="margin:8px 0 0;font-size:28px;line-height:1.18;">${escapeHtml(name)} möchte einen Sichtbarkeits-Check.</h1>
        </div>
        <div style="padding:24px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e0d9cc;border-radius:10px;border-collapse:separate;border-spacing:0;overflow:hidden;">
            ${tableRows}
          </table>
          <h2 style="margin:24px 0 10px;font-size:18px;">Kontext</h2>
          <p style="margin:0;padding:18px;border:1px solid #e0d9cc;border-radius:10px;background:#fbf7ef;color:#5d6a67;line-height:1.65;">
            ${escapeHtml(message || "Kein zusätzlicher Kontext").replace(/\n/g, "<br />")}
          </p>
        </div>
      </div>
    </div>
  </body>
</html>`;
};

export const POST: APIRoute = async ({ request }) => {
  let payload: ContactPayload;

  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, message: "Ungültige Anfrage." }, 400);
  }

  if (normalize(payload.company)) {
    return json({ ok: true });
  }

  const name = normalize(payload.name);
  const email = normalize(payload.email).toLowerCase();
  const website = normalize(payload.website);
  const message = normalize(payload.message);
  const source = normalize(payload.source);

  if (!name || !email || !isValidEmail(email)) {
    return json({ ok: false, message: "Bitte Name und eine gültige E-Mail-Adresse angeben." }, 400);
  }

  const apiKey = import.meta.env.RESEND_API_KEY;

  if (!apiKey) {
    console.error("RESEND_API_KEY is missing");
    return json({ ok: false, message: "Der Versand ist aktuell nicht konfiguriert." }, 500);
  }

  const from = import.meta.env.RESEND_FROM_EMAIL || DEFAULT_FROM;
  const notifyTo = splitRecipients(import.meta.env.RESEND_NOTIFY_TO);
  const internalText = [
    "Neue GEOgurus Anfrage",
    "",
    `Name: ${name}`,
    `E-Mail: ${email}`,
    `Website: ${website || "Nicht angegeben"}`,
    `Quelle: ${source || "Website-Formular"}`,
    "",
    "Kontext:",
    message || "Kein zusätzlicher Kontext",
  ].join("\n");
  const confirmationText = [
    `Hallo ${name},`,
    "",
    "danke für Ihre Anfrage. Wir prüfen Ihre Angaben und melden uns mit einer ersten Einschätzung.",
    "",
    `Website: ${website || "Nicht angegeben"}`,
    "",
    "Ihr Kontext:",
    message || "Kein zusätzlicher Kontext",
    "",
    "Beste Grüße",
    "GEOgurus",
  ].join("\n");

  try {
    await Promise.all([
      sendResendEmail({
        apiKey,
        from,
        to: notifyTo,
        subject: `Neue GEOgurus Anfrage von ${name}`,
        html: renderInternalHtml({ name, email, website, message, source }),
        text: internalText,
        replyTo: email,
      }),
      sendResendEmail({
        apiKey,
        from,
        to: email,
        subject: "Ihre Anfrage bei GEOgurus ist angekommen",
        html: renderConfirmationHtml({ name, website, message }),
        text: confirmationText,
        replyTo: "info@geogurus.de",
      }),
    ]);

    return json({ ok: true, message: "Danke, Ihre Anfrage wurde versendet." });
  } catch (error) {
    console.error(error);
    return json({ ok: false, message: "Der Versand hat nicht geklappt. Bitte senden Sie uns direkt eine E-Mail." }, 502);
  }
};
