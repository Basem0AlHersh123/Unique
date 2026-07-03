import nodemailer from "nodemailer";

function buildHtml(resetUrl: string): string {
  return `
    <div dir="rtl" style="font-family: 'Cairo', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h1 style="color: #7C5CFF; text-align: center;">UNIQUE</h1>
      <p style="color: #333; font-size: 16px;">مرحباً،</p>
      <p style="color: #555; font-size: 14px;">
        لقد تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك في UNIQUE.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${resetUrl}"
           style="display: inline-block; padding: 14px 32px; background: #7C5CFF; color: #fff; text-decoration: none; border-radius: 12px; font-size: 16px; font-weight: 600;">
          إعادة تعيين كلمة المرور
        </a>
      </div>
      <p style="color: #888; font-size: 12px;">
        رابط إعادة التعيين صالح لمدة ساعة واحدة فقط. إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذا البريد.
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="color: #aaa; font-size: 11px; text-align: center;">
        إذا لم يعمل الزر أعلاه، انسخ الرابط التالي والصقه في المتصفح:<br/>
        <span style="color: #7C5CFF;">${resetUrl}</span>
      </p>
    </div>
  `;
}

// ── Resend (HTTP API, more reliable on Vercel) ──────────────────────────
async function sendViaResend(
  email: string,
  resetUrl: string,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not set");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM || "UNIQUE <noreply@unique.app>",
      to: email,
      subject: "إعادة تعيين كلمة المرور - UNIQUE",
      html: buildHtml(resetUrl),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend API error (${res.status}): ${body}`);
  }
}

// ── SMTP / Nodemailer (fallback) ───────────────────────────────────────
function createSmtpTransporter() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) {
    throw new Error(
      `SMTP not configured. Missing: ${[
        !host && "SMTP_HOST",
        !port && "SMTP_PORT",
        !user && "SMTP_USER",
        !pass && "SMTP_PASS",
      ]
        .filter(Boolean)
        .join(", ")}`
    );
  }

  const transporter = nodemailer.createTransport({
    host,
    port: Number(port),
    secure: Number(port) === 465,
    auth: { user, pass },
  });

  return transporter;
}

async function sendViaSmtp(
  email: string,
  resetUrl: string,
): Promise<void> {
  const transporter = createSmtpTransporter();

  await transporter.sendMail({
    from: `"UNIQUE" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "إعادة تعيين كلمة المرور - UNIQUE",
    html: buildHtml(resetUrl),
  });
}

// ── Public API ─────────────────────────────────────────────────────────
export async function sendResetEmail(
  toEmail: string,
  token: string,
  baseUrl?: string,
): Promise<void> {
  // Prefer explicit env var over header-inferred URL (headers can be preview deploys)
  const url =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    baseUrl ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ||
    "http://localhost:3000";

  const resetUrl = `${url.replace(/\/+$/, "")}/auth/reset-password/${token}`;

  // Prefer Resend if API key is configured (more reliable on Vercel)
  const useResend = !!process.env.RESEND_API_KEY;

  if (useResend) {
    await sendViaResend(toEmail, resetUrl);
  } else {
    await sendViaSmtp(toEmail, resetUrl);
  }
}
