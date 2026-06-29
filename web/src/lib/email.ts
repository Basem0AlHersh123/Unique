import nodemailer from "nodemailer";

function createTransporter() {
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

  return nodemailer.createTransport({
    host,
    port: Number(port),
    secure: Number(port) === 465,
    auth: { user, pass },
  });
}

export async function sendResetEmail(
  email: string,
  token: string
): Promise<void> {
  const transporter = createTransporter();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const resetUrl = `${baseUrl}/auth/reset-password/${token}`;

  await transporter.sendMail({
    from: `"UNIQUE" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "إعادة تعيين كلمة المرور - UNIQUE",
    html: `
      <div dir="rtl" style="font-family: 'Cairo', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h1 style="color: #6E24E2; text-align: center;">UNIQUE</h1>
        <p style="color: #333; font-size: 16px;">مرحباً،</p>
        <p style="color: #555; font-size: 14px;">
          لقد تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك في UNIQUE.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}"
             style="display: inline-block; padding: 14px 32px; background: #6E24E2; color: #fff; text-decoration: none; border-radius: 12px; font-size: 16px; font-weight: 600;">
            إعادة تعيين كلمة المرور
          </a>
        </div>
        <p style="color: #888; font-size: 12px;">
          رابط إعادة التعيين صالح لمدة ساعة واحدة فقط. إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذا البريد.
        </p>
      </div>
    `,
  });
}
