/**
 * Shared HTML shell for every transactional email.
 *
 * Email clients are a decade behind browsers: Outlook renders through Word, and
 * Gmail strips <style> blocks on some clients. So this is table-based with
 * inline styles only — no flexbox, no grid, no classes, no web fonts.
 *
 * The logo is a remote image, which many clients block until the reader opts
 * in. The header therefore carries the brand colour and the wordmark as live
 * text behind it, so a blocked image costs nothing but the picture.
 */

const BRAND = {
  teal700: "#0f766e",
  teal600: "#0d9488",
  teal50: "#f0fdfa",
  ink: "#0b1f1c",
  body: "#334155",
  muted: "#64748b",
  faint: "#94a3b8",
  line: "#e2e8f0",
  canvas: "#f6f8f9",
};

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "https://app.carebora.co.ke").replace(/\/$/, "");
}

export interface EmailButton {
  label: string;
  url: string;
}

export interface EmailOptions {
  /** Shown as the first line in the inbox preview, after the subject. */
  preheader: string;
  heading: string;
  /** Body HTML — use the `p()`, `otp()`, `panel()` and `rows()` helpers. */
  body: string;
  button?: EmailButton;
  /** Small print under the button, e.g. link expiry or a security note. */
  footnote?: string;
}

/** A body paragraph. */
export function p(html: string): string {
  return `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${BRAND.body}">${html}</p>`;
}

/** A large, spaced-out verification code. */
export function otp(code: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0">
      <tr>
        <td style="background:${BRAND.teal50};border:1px solid #ccfbf1;border-radius:14px;padding:18px 28px;text-align:center">
          <div style="font-family:'SF Mono',SFMono-Regular,Consolas,monospace;font-size:34px;font-weight:700;letter-spacing:10px;color:${BRAND.teal700};line-height:1">${code}</div>
        </td>
      </tr>
    </table>`;
}

/** A tinted callout for the one thing that matters most in the mail. */
export function panel(html: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0">
      <tr>
        <td style="background:${BRAND.teal50};border-left:3px solid ${BRAND.teal600};border-radius:10px;padding:14px 18px;font-size:15px;line-height:1.6;color:${BRAND.body}">${html}</td>
      </tr>
    </table>`;
}

/** A label/value detail table — appointment time, fee, receipt number. */
export function rows(items: [string, string][]): string {
  const body = items
    .map(
      ([label, value], i) => `
      <tr>
        <td style="padding:${i === 0 ? "0" : "9px"} 14px 9px 0;font-size:13px;color:${BRAND.muted};white-space:nowrap;vertical-align:top">${label}</td>
        <td style="padding:${i === 0 ? "0" : "9px"} 0 9px;font-size:15px;font-weight:600;color:${BRAND.ink};vertical-align:top">${value}</td>
      </tr>`,
    )
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0">${body}</table>`;
}

/** Wrap body content in the branded shell. */
export function renderEmail(opts: EmailOptions): string {
  const base = appUrl();
  const button = opts.button
    ? `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 6px">
      <tr>
        <td style="border-radius:12px;background:${BRAND.teal600}">
          <a href="${opts.button.url}" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px">${opts.button.label}</a>
        </td>
      </tr>
    </table>`
    : "";
  const footnote = opts.footnote
    ? `<p style="margin:10px 0 0;font-size:13px;line-height:1.55;color:${BRAND.faint}">${opts.footnote}</p>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${opts.heading}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.canvas};-webkit-font-smoothing:antialiased">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${opts.preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.canvas}">
    <tr>
      <td align="center" style="padding:28px 14px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid ${BRAND.line};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">

          <!-- Header: brand colour carries it even when the logo is blocked -->
          <tr>
            <td style="background:${BRAND.teal600};padding:22px 28px">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle">
                    <img src="${base}/logo-mark.png" width="34" height="34" alt=""
                         style="display:block;border:0;width:34px;height:34px">
                  </td>
                  <td style="vertical-align:middle;padding-left:11px">
                    <span style="font-size:19px;font-weight:800;color:#ffffff;letter-spacing:-0.2px">Care Bora</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:30px 28px 28px">
              <h1 style="margin:0 0 14px;font-size:21px;line-height:1.3;font-weight:800;color:${BRAND.ink}">${opts.heading}</h1>
              ${opts.body}
              ${button}
              ${footnote}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top:1px solid ${BRAND.line};background:#fbfcfc;padding:20px 28px">
              <p style="margin:0 0 7px;font-size:13px;line-height:1.55;color:${BRAND.muted}">
                Quality care, made accessible.<br>
                <a href="${base}" style="color:${BRAND.teal700};text-decoration:none;font-weight:600">app.carebora.co.ke</a>
                &nbsp;·&nbsp;
                <a href="mailto:customercare@carebora.co.ke" style="color:${BRAND.teal700};text-decoration:none">customercare@carebora.co.ke</a>
              </p>
              <p style="margin:0;font-size:11px;line-height:1.6;color:${BRAND.faint}">
                Care Bora Kenya · Nairobi, Kenya · Ambulance 24/7: +254 717 231 721<br>
                You received this because you have a Care Bora account.
                <a href="${base}/privacy" style="color:${BRAND.faint};text-decoration:underline">Privacy policy</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
