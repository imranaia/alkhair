// Plain inline-styled HTML — email clients don't reliably support external
// CSS or the app's oklch() tokens, so colors here are hex approximations of
// the brand green/gold instead of shared theme variables.
const BRAND_GREEN = "#5a8f3c";
const GOLD = "#c9973f";
const INK = "#1a1a1a";
const MUTED = "#6b7280";
// Email clients can't load a relative path — needs the live production URL.
export const APP_URL = "https://alkhair.ng";
const LOGO_URL = `${APP_URL}/logo-mark-512.png`;

function wrapper(title: string, bodyHtml: string) {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f4f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e5e0;">
            <tr>
              <td style="background:${BRAND_GREEN};padding:18px 28px;">
                <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                  <td style="padding-right:10px;"><img src="${LOGO_URL}" width="28" height="28" alt="" style="display:block;border-radius:6px;" /></td>
                  <td><span style="color:#ffffff;font-size:16px;font-weight:700;letter-spacing:-0.01em;">Alkhair Microcredit</span></td>
                </tr></table>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <h1 style="margin:0 0 12px;font-size:19px;color:${INK};">${title}</h1>
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px;border-top:1px solid #eeeeea;">
                <p style="margin:0;font-size:12px;color:${MUTED};">Alkhair Microcredit Limited &middot; RC: 9640793</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function paragraph(text: string) {
  return `<p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:${INK};">${text}</p>`;
}

function button(label: string, href: string) {
  return `<a href="${href}" style="display:inline-block;margin-top:6px;padding:10px 20px;background:${BRAND_GREEN};color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">${label}</a>`;
}

function credentialBox(rows: { label: string; value: string }[]) {
  const items = rows
    .map(
      (r) =>
        `<tr><td style="padding:4px 0;font-size:12px;color:${MUTED};">${r.label}</td><td style="padding:4px 0;font-size:14px;font-weight:600;color:${INK};text-align:right;">${r.value}</td></tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f6f2;border-left:3px solid ${GOLD};border-radius:10px;padding:12px 16px;margin:0 0 14px;">${items}</table>`;
}

export function approvalNeededEmail(params: { recipientName: string; kind: string; submittedBy: string; link: string }) {
  return {
    subject: `Action needed: ${params.kind} awaiting your approval`,
    html: wrapper(
      "An approval needs your attention",
      paragraph(`Hi ${params.recipientName},`) +
        paragraph(`${params.submittedBy} submitted a <strong>${params.kind}</strong> that's now waiting on your review.`) +
        button("Review now", params.link),
    ),
  };
}

export function clientAccountCreatedEmail(params: { clientName: string; clientCode: string; username: string; tempPassword: string; loginUrl: string }) {
  return {
    subject: "Your Alkhair Microcredit account has been created",
    html: wrapper(
      "Welcome to Alkhair Microcredit",
      paragraph(`Hi ${params.clientName},`) +
        paragraph(`Your account has been created under client code <strong>${params.clientCode}</strong>. Use the details below to sign in to your portal — you'll be asked to set your own password on first login.`) +
        credentialBox([
          { label: "Username", value: params.username },
          { label: "Temporary password", value: params.tempPassword },
        ]) +
        button("Sign in to your portal", params.loginUrl),
    ),
  };
}

export function loanApprovedEmail(params: { clientName: string; principalAmount: string; tenureWeeks: number; startDate: string; loginUrl: string }) {
  return {
    subject: "Your loan has been approved",
    html: wrapper(
      "Your loan has been approved",
      paragraph(`Hi ${params.clientName},`) +
        paragraph(`Good news — your principal has been approved and is ready.`) +
        credentialBox([
          { label: "Principal", value: `₦${params.principalAmount}` },
          { label: "Tenure", value: `${params.tenureWeeks} weeks` },
          { label: "Start date", value: params.startDate },
        ]) +
        button("View in your portal", params.loginUrl),
    ),
  };
}

export function importBatchCompletedEmail(params: { recipientName: string; totalRows: number; successCount: number; errorCount: number; link: string }) {
  return {
    subject: `Excel import finished: ${params.successCount}/${params.totalRows} clients added`,
    html: wrapper(
      "Bulk import finished",
      paragraph(`Hi ${params.recipientName},`) +
        paragraph(
          `An Excel import just finished processing <strong>${params.totalRows}</strong> rows — <strong>${params.successCount}</strong> succeeded${
            params.errorCount > 0 ? ` and <strong>${params.errorCount}</strong> need a second look` : ""
          }.`,
        ) +
        button("Review the batch", params.link),
    ),
  };
}
