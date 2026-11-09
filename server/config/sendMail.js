import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

/**
 * Creates and returns the best configured nodemailer transport.
 * Supports custom SMTP (SendGrid, Mailgun, Brevo, AWS SES) or Gmail service.
 */
const createTransporter = () => {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: process.env.SMTP_SECURE === "true" || process.env.SMTP_PORT === "465",
      auth: {
        user: process.env.SMTP_USER || process.env.EMAIL_ID,
        pass: process.env.SMTP_PASS || process.env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === "production",
      },
    });
  }

  // Fallback to Gmail service if EMAIL_ID and EMAIL_PASSWORD are provided
  if (process.env.EMAIL_ID && process.env.EMAIL_PASSWORD) {
    return nodemailer.createTransport({
      service: "gmail",
      secure: true,
      auth: {
        user: process.env.EMAIL_ID,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  return null;
};

let cachedTransporter = null;

const getTransporter = () => {
  if (!cachedTransporter) {
    cachedTransporter = createTransporter();
  }
  return cachedTransporter;
};

/**
 * Sends a branded password reset verification code email.
 *
 * @param {string} to - Recipient email address
 * @param {string} otp - 6-digit or 4-digit verification code
 * @param {string} institutionName - Optional academy or institution name
 * @returns {Promise<{ success: boolean, delivered: boolean, devFallback?: boolean, error?: string }>}
 */
const sendMail = async (to, otp, institutionName = "Skillio Academy") => {
  const isDev = process.env.NODE_ENV !== "production";
  const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_ID || "noreply@skillio.com";

  const emailHtml = `
  <div style="margin:0;padding:0;background-color:#f8f7f4;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;margin:30px auto;background:#ffffff;border:1px solid #e8e5dc;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.03);">
      
      <!-- Brand Header -->
      <tr>
        <td style="background:#1e3a8a;padding:24px 32px;text-align:left;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <span style="color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">Skillio</span>
                <span style="color:#bfdbfe;font-size:12px;display:block;margin-top:2px;font-weight:500;">${institutionName}</span>
              </td>
              <td style="text-align:right;">
                <span style="display:inline-block;padding:4px 12px;background:rgba(255,255,255,0.15);color:#ffffff;font-size:11px;font-weight:700;border-radius:20px;letter-spacing:0.5px;text-transform:uppercase;">
                  Security Alert
                </span>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Body Content -->
      <tr>
        <td style="padding:32px;">
          <h2 style="margin:0 0 12px;color:#1c1917;font-size:20px;font-weight:800;letter-spacing:-0.3px;">
            Password Reset Verification
          </h2>
          <p style="color:#57534e;font-size:14px;line-height:1.6;margin:0 0 24px;">
            We received a request to reset the password for your account (<strong>${to}</strong>). Enter the verification code below to securely set your new password.
          </p>

          <!-- OTP Box -->
          <div style="margin:24px 0;text-align:center;padding:20px;background:#f8f7f4;border:1px dashed #d6d3c9;border-radius:12px;">
            <span style="font-size:11px;font-weight:700;color:#78716c;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:8px;">
              Your One-Time Code
            </span>
            <span style="
              display:inline-block;
              padding:10px 24px;
              font-size:32px;
              letter-spacing:8px;
              font-weight:800;
              color:#1e3a8a;
              font-family:monospace;
              background:#ffffff;
              border:1px solid #bfdbfe;
              border-radius:8px;
              box-shadow:0 2px 4px rgba(30,58,138,0.06);
            ">
              ${otp}
            </span>
            <p style="color:#78716c;font-size:12px;margin:12px 0 0;font-weight:500;">
              ⏱ Valid for <strong>10 minutes</strong> • Single use only
            </p>
          </div>

          <!-- Security Notice -->
          <div style="background:#eff6ff;border-left:4px solid #1e3a8a;padding:12px 16px;border-radius:0 8px 8px 0;margin:24px 0 0;">
            <p style="color:#1e3a8a;font-size:12px;line-height:1.5;margin:0;">
              <strong>Security Tip:</strong> Never share this code with anyone. Skillio instructors and administrators will never ask for your verification code.
            </p>
          </div>

          <p style="color:#a8a29e;font-size:12px;line-height:1.5;margin:24px 0 0;">
            If you did not request this password reset, you can safely ignore this email. Your existing password remains active and secure.
          </p>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background:#faf9f6;padding:16px 32px;border-top:1px solid #f2efe9;text-align:center;">
          <p style="margin:0;font-size:11px;color:#a8a29e;">
            © ${new Date().getFullYear()} ${institutionName} • Powered by Skillio Platform
          </p>
        </td>
      </tr>

    </table>
  </div>
  `;

  const transporter = getTransporter();

  // If no transporter configured (e.g., local dev with no credentials)
  if (!transporter) {
    console.log(`\n========================================================================`);
    console.log(`[SKILLIO AUTH - DEV FALLBACK] No SMTP configured.`);
    console.log(`Recipient: ${to}`);
    console.log(`Verification Code: ${otp}`);
    console.log(`========================================================================\n`);
    return { success: true, delivered: false, devFallback: true };
  }

  try {
    const info = await transporter.sendMail({
      from: `"${institutionName}" <${fromAddress}>`,
      to,
      subject: `${otp} is your ${institutionName} password reset code`,
      html: emailHtml,
      text: `Your ${institutionName} password reset verification code is: ${otp}. It expires in 10 minutes. If you did not request this, please ignore this email.`,
    });

    return { success: true, delivered: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[MailService Error] Failed to send email to ${to}:`, err.message);

    // In development or testing, log code to console so workflows and tests never block
    if (isDev) {
      console.log(`\n========================================================================`);
      console.log(`[SKILLIO AUTH - DEV OTP FALLBACK] (SMTP error: ${err.message})`);
      console.log(`Recipient: ${to}`);
      console.log(`Verification Code: ${otp}`);
      console.log(`========================================================================\n`);
      return { success: true, delivered: false, devFallback: true, error: err.message };
    }

    return { success: false, delivered: false, error: err.message };
  }
};

export default sendMail;
