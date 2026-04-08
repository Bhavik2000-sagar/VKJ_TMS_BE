import nodemailer from "nodemailer";
import { env } from "../config/env.js";

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!env.SMTP_HOST) {
    return null;
  }
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT ?? 587,
    secure: env.SMTP_SECURE ?? false,
    auth:
      env.SMTP_USER && env.SMTP_PASS
        ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
        : undefined,
  });
  return transporter;
}

export async function sendTenantInvitationEmail(opts: {
  to: string;
  tenantName: string;
  inviteLink: string;
}) {
  const from = env.EMAIL_FROM ?? "noreply@localhost";
  const fromName = env.EMAIL_FROM_NAME ?? "TMS";
  const subject = `You're invited to ${opts.tenantName} on TMS`;
  const text = `Hello,\n\nYou've been invited as the organization admin for ${opts.tenantName}.\n\nOpen this link to accept and set your password:\n${opts.inviteLink}\n`;
  const html = `<p>Hello,</p><p>You've been invited as the organization admin for <strong>${escapeHtml(opts.tenantName)}</strong>.</p><p><a href="${opts.inviteLink}">Accept invitation</a></p>`;

  const t = getTransporter();
  if (!t) {
    console.warn(
      "[email] SMTP not configured; invitation email skipped:",
      opts.to,
    );
    return { skipped: true as const };
  }

  await t.sendMail({
    from: `"${fromName}" <${from}>`,
    to: opts.to,
    subject,
    text,
    html,
  });
  return { skipped: false as const };
}

export async function sendPasswordResetEmail(opts: {
  to: string;
  resetLink: string;
}) {
  const from = env.EMAIL_FROM ?? "noreply@localhost";
  const fromName = env.EMAIL_FROM_NAME ?? "TMS";
  const subject = "Reset your TMS password";
  const text = `We received a request to reset your password.\n\nOpen this link (valid for 1 hour):\n${opts.resetLink}\n\nIf you did not request this, you can ignore this email.`;
  const html = `<p>We received a request to reset your password.</p><p><a href="${opts.resetLink}">Reset password</a></p><p>This link expires in one hour. If you did not request this, you can ignore this email.</p>`;

  const t = getTransporter();
  if (!t) {
    console.warn(
      "[email] SMTP not configured; password reset link (dev):",
      opts.resetLink,
    );
    return { skipped: true as const };
  }

  await t.sendMail({
    from: `"${fromName}" <${from}>`,
    to: opts.to,
    subject,
    text,
    html,
  });
  return { skipped: false as const };
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
