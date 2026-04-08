import nodemailer from "nodemailer";
import fs from "node:fs";
import path from "node:path";
import { env } from "../config/env.js";
let transporter = null;
const APP_NAME = "VKJ_TMS";
const BRAND_COLOR = "#ffcf2b";
const LOGO_CID = "vkj-tms-logo";
function getTransporter() {
    if (transporter)
        return transporter;
    if (!env.SMTP_HOST) {
        return null;
    }
    transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT ?? 587,
        secure: env.SMTP_SECURE ?? false,
        auth: env.SMTP_USER && env.SMTP_PASS
            ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
            : undefined,
    });
    return transporter;
}
export async function sendTenantInvitationEmail(opts) {
    const from = env.EMAIL_FROM ?? "noreply@localhost";
    const fromName = env.EMAIL_FROM_NAME ?? APP_NAME;
    const subject = opts.isReinvite
        ? `Reminder: Admin invite for ${opts.tenantName} on ${APP_NAME}`
        : `You're invited to ${opts.tenantName} on ${APP_NAME}`;
    const actionLabel = opts.isReinvite ? "Accept invitation (new link)" : "Accept invitation";
    const text = `${opts.isReinvite ? "Reminder:" : "Hello,"}\n\nYou've been invited as the organization admin for ${opts.tenantName}.\n\nOpen this link to accept and set your password (valid for 7 days):\n${opts.inviteLink}\n\nIf you were not expecting this email, you can ignore it.`;
    const html = renderEmailLayout({
        preheader: opts.isReinvite
            ? `Reminder invitation for ${opts.tenantName}`
            : `Admin invitation for ${opts.tenantName}`,
        title: opts.isReinvite ? "You're invited again" : "You're invited",
        lead: `You've been invited as the organization admin for <strong>${escapeHtml(opts.tenantName)}</strong>.`,
        body: opts.isReinvite
            ? "This is a refreshed invitation link. For security, please use this latest link to complete your account setup."
            : "Use the button below to accept your invitation and set your password.",
        actionLabel,
        actionUrl: opts.inviteLink,
        meta: "This invitation link expires in 2 minutes (testing mode).",
    });
    const attachments = getLogoAttachment();
    const t = getTransporter();
    if (!t) {
        console.warn("[email] SMTP not configured; invitation email skipped:", opts.to);
        return { skipped: true };
    }
    await t.sendMail({
        from: `"${fromName}" <${from}>`,
        to: opts.to,
        subject,
        text,
        html,
        attachments,
    });
    return { skipped: false };
}
export async function sendPasswordResetEmail(opts) {
    const from = env.EMAIL_FROM ?? "noreply@localhost";
    const fromName = env.EMAIL_FROM_NAME ?? APP_NAME;
    const subject = `Reset your ${APP_NAME} password`;
    const text = `We received a request to reset your ${APP_NAME} password.\n\nOpen this link (valid for 1 hour):\n${opts.resetLink}\n\nIf you did not request this, you can ignore this email.`;
    const html = renderEmailLayout({
        preheader: `${APP_NAME} password reset`,
        title: "Reset your password",
        lead: `We received a request to reset your <strong>${APP_NAME}</strong> password.`,
        body: "Use the button below to create a new password. If this wasn't you, you can safely ignore this email.",
        actionLabel: "Reset password",
        actionUrl: opts.resetLink,
        meta: "This reset link expires in 1 hour.",
    });
    const attachments = getLogoAttachment();
    const t = getTransporter();
    if (!t) {
        console.warn("[email] SMTP not configured; password reset link (dev):", opts.resetLink);
        return { skipped: true };
    }
    await t.sendMail({
        from: `"${fromName}" <${from}>`,
        to: opts.to,
        subject,
        text,
        html,
        attachments,
    });
    return { skipped: false };
}
function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapeAttr(s) {
    return escapeHtml(s).replace(/"/g, "&quot;");
}
function renderEmailLayout(opts) {
    return `
<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(APP_NAME)} email</title>
    <style>
      :root {
        color-scheme: light dark;
      }
      .mail-page {
        background: #f5f7fb !important;
      }
      .mail-card {
        background: #ffffff !important;
        border: 1px solid #e5e9f4 !important;
      }
      .mail-title,
      .mail-body-strong,
      .mail-link {
        color: #0f172a !important;
      }
      .mail-muted {
        color: #475569 !important;
      }
      @media (prefers-color-scheme: dark) {
        .mail-page {
          background: #0b1220 !important;
        }
        .mail-card {
          background: #121a2b !important;
          border-color: #27324d !important;
        }
        .mail-title,
        .mail-body-strong,
        .mail-link {
          color: #e5ecff !important;
        }
        .mail-muted {
          color: #9aa8c7 !important;
        }
      }
    </style>
  </head>
  <body class="mail-page" style="margin:0;background:#f5f7fb;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(opts.preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:28px 14px;">
      <tr>
        <td align="center">
          <table class="mail-card" role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid #e5e9f4;border-radius:14px;padding:24px;">
            <tr>
              <td align="center" style="padding-bottom:16px;">
                <img src="cid:${LOGO_CID}" alt="${escapeAttr(APP_NAME)} logo" width="88" style="display:block;height:auto;border:0;" />
              </td>
            </tr>
            <tr>
              <td class="mail-title" style="color:#0f172a;font-size:28px;font-weight:700;line-height:1.2;padding:0 0 10px;">
                ${escapeHtml(opts.title)}
              </td>
            </tr>
            <tr>
              <td class="mail-body-strong" style="color:#0f172a;font-size:15px;line-height:1.65;padding:0 0 12px;">
                ${opts.lead}
              </td>
            </tr>
            <tr>
              <td class="mail-muted" style="color:#475569;font-size:14px;line-height:1.65;padding:0 0 18px;">
                ${escapeHtml(opts.body)}
              </td>
            </tr>
            <tr>
              <td style="padding:4px 0 18px;">
                <a href="${escapeAttr(opts.actionUrl)}" style="display:inline-block;background:${BRAND_COLOR};color:#151515;text-decoration:none;font-weight:700;font-size:14px;padding:12px 18px;border-radius:10px;">
                  ${escapeHtml(opts.actionLabel)}
                </a>
              </td>
            </tr>
            <tr>
              <td class="mail-muted" style="color:#475569;font-size:12px;line-height:1.55;padding:0 0 10px;">
                ${escapeHtml(opts.meta)}
              </td>
            </tr>
            <tr>
              <td class="mail-muted" style="color:#475569;font-size:12px;line-height:1.55;border-top:1px solid #e5e9f4;padding-top:14px;">
                Sent by ${escapeHtml(APP_NAME)}. If the button does not work, copy and paste this URL into your browser:<br />
                <span class="mail-link" style="word-break:break-all;color:#0f172a;">${escapeHtml(opts.actionUrl)}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
function getLogoAttachment() {
    const logoPath = path.resolve(process.cwd(), "../VKJ-TMS-FE/public/logo.png");
    if (!fs.existsSync(logoPath))
        return undefined;
    return [
        {
            filename: "logo.png",
            path: logoPath,
            cid: LOGO_CID,
        },
    ];
}
//# sourceMappingURL=email.service.js.map