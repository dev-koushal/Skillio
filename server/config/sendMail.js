import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

/**
 * Creates and returns the configured nodemailer transport.
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
    const cleanEmail = (process.env.EMAIL_ID || "").trim().replace(/^["']|["']$/g, "");
    const cleanPassword = (process.env.EMAIL_PASSWORD || "")
      .trim()
      .replace(/^["']|["']$/g, "")
      .replace(/\s+/g, "");

    return nodemailer.createTransport({
      service: "gmail",
      secure: true,
      auth: {
        user: cleanEmail,
        pass: cleanPassword,
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
 * Sends a pixel-perfect, branded password reset verification code email.
 *
 * @param {string} to - Recipient email address
 * @param {string} otp - 6-digit verification code
 * @param {string} institutionName - Optional academy or institution name
 * @returns {Promise<{ success: boolean, delivered: boolean, messageId?: string, error?: string }>}
 */
const sendMail = async (to, otp, institutionName = "Skillio Academy") => {
  const isDev = process.env.NODE_ENV !== "production";
  const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_ID || "noreply@skillio.com";

  // Production-grade, mobile-responsive HTML email template
  const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Reset Your Password</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f3ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0;padding:32px 12px;background-color:#f4f3ef;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;background:#ffffff;border:1px solid #e7e5e4;border-radius:18px;overflow:hidden;box-shadow:0 10px 25px -5px rgba(0,0,0,0.04),0 8px 10px -6px rgba(0,0,0,0.02);">
          
          <!-- Brand Header -->
          <tr>
            <td style="background:#1e3a8a;padding:26px 32px;text-align:left;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.5px;display:inline-block;">Skillio</span>
                    <span style="color:#bfdbfe;font-size:12px;display:block;margin-top:3px;font-weight:500;">${institutionName}</span>
                  </td>
                  <td style="text-align:right;">
                    <span style="display:inline-block;padding:5px 12px;background:rgba(255,255,255,0.18);color:#ffffff;font-size:10px;font-weight:700;border-radius:20px;letter-spacing:1px;text-transform:uppercase;">
                      Security Verification
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding:36px 32px 28px;">
              <h1 style="margin:0 0 12px;color:#0f172a;font-size:22px;font-weight:800;letter-spacing:-0.4px;line-height:1.3;">
                Password Reset Code
              </h1>
              <p style="margin:0 0 18px;color:#475569;font-size:14px;line-height:1.6;">
                We received a request to reset your password for <strong>${to}</strong>.
              </p>
              <p style="margin:0 0 24px;color:#475569;font-size:14px;line-height:1.6;">
                Please enter the verification code below on the reset screen to proceed. This code confirms your identity and protects your account.
              </p>

              <!-- Luxury OTP Card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;text-align:center;">
                <tr>
                  <td style="padding:26px 20px;">
                    <span style="display:block;font-size:11px;font-weight:700;color:#64748b;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:12px;">
                      Your One-Time Code
                    </span>
                    <div style="display:inline-block;padding:12px 28px;background:#ffffff;border:2px solid #bfdbfe;border-radius:12px;box-shadow:0 2px 6px rgba(30,58,138,0.06);">
                      <span style="font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:34px;letter-spacing:10px;font-weight:800;color:#1e3a8a;margin-left:10px;">
                        ${otp}
                      </span>
                    </div>
                    <p style="margin:14px 0 0;color:#64748b;font-size:12px;font-weight:500;">
                      ⏱ Valid for <strong>10 minutes</strong> &bull; Single use only
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Security Caution Card -->
              <div style="background:#fef2f2;border:1px solid #fee2e2;border-left:4px solid #ef4444;border-radius:8px;padding:14px 16px;margin:24px 0 0;">
                <p style="margin:0;color:#991b1b;font-size:12px;line-height:1.5;">
                  <strong>Security Advisory:</strong> Never share this code with anyone. Skillio staff, teachers, or administrators will never ask for your verification code.
                </p>
              </div>

              <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;line-height:1.5;">
                If you did not request a password reset, you can safely ignore this email. No changes have been made to your account.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#64748b;">
                ${institutionName} &bull; Powered by Skillio
              </p>
              <p style="margin:0;font-size:11px;color:#94a3b8;">
                This is an automated system email. Please do not reply directly.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const transporter = getTransporter();

  // If no transporter configured
  if (!transporter) {
    console.log(`\n========================================================================`);
    console.log(`[SKILLIO MAIL] No SMTP credentials configured in .env.`);
    console.log(`To: ${to}`);
    console.log(`Code: ${otp}`);
    console.log(`========================================================================\n`);
    return { success: true, delivered: false, error: "No transporter configured" };
  }

  try {
    const info = await transporter.sendMail({
      from: `"${institutionName}" <${fromAddress}>`,
      to,
      subject: `${otp} is your ${institutionName} verification code`,
      html: emailHtml,
      text: `Your ${institutionName} password reset verification code is: ${otp}. It expires in 10 minutes. If you did not request this, please ignore this email.`,
    });

    console.log(`[MailService] Email sent successfully to ${to} (Message ID: ${info.messageId})`);
    return { success: true, delivered: true, messageId: info.messageId };
  } catch (err) {
    console.error(`\n[MailService Error] Failed to send email to ${to}: ${err.message}`);
    if (err.message.includes("BadCredentials") || err.message.includes("535")) {
      console.error(`[MailService Diagnosis] The Google App Password in EMAIL_PASSWORD has expired or was revoked.`);
      console.error(`[MailService Solution] Generate a new 16-character App Password at https://myaccount.google.com/apppasswords and update EMAIL_PASSWORD in server/.env.`);
    }

    // In development or test, log to terminal so developers can see the code in terminal if SMTP credentials expired
    if (isDev) {
      console.log(`\n========================================================================`);
      console.log(`[SKILLIO MAIL] Background Dispatch (${err.message})`);
      console.log(`Recipient: ${to}`);
      console.log(`Verification Code (logged in terminal only): ${otp}`);
      console.log(`========================================================================\n`);
      return { success: true, delivered: false, error: err.message };
    }

    return { success: false, delivered: false, error: err.message };
  }
};

export default sendMail;

const escapeHtml = (value = "") => String(value).replace(/[&<>\"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
}[char]));

/** Sends an account invitation with a single-use acceptance link. */
export const sendInvitationEmail = async ({ to, inviteUrl, institutionName = "your institution", inviteeName = "there", courseTitle = null }) => {
  const isDev = process.env.NODE_ENV !== "production";
  const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_ID || "noreply@skillio.com";
  const safeInstitution = escapeHtml(institutionName);
  const safeName = escapeHtml(inviteeName);
  const safeCourse = courseTitle ? escapeHtml(courseTitle) : "";
  const courseCopy = safeCourse ? `You have been invited to access <strong>${safeCourse}</strong> at ${safeInstitution}.` : `You have been invited to join ${safeInstitution}. Your teacher will share course access with you.`;
  const textCourse = courseTitle ? `You have been invited to access ${courseTitle} at ${institutionName}.` : `You have been invited to join ${institutionName}. Your teacher will share course access with you.`;
  if (process.env.NODE_ENV === "test") return { success: true, delivered: false, error: "Mail delivery disabled in test mode" };
  const transporter = getTransporter();

  if (!transporter) {
    console.log(`[SKILLIO INVITATION] SMTP is not configured. To: ${to}\nInvitation link: ${inviteUrl}`);
    return { success: true, delivered: false, error: "No transporter configured" };
  }

  try {
    const info = await transporter.sendMail({
      from: `"${institutionName}" <${fromAddress}>`,
      to,
      subject: `You're invited to ${institutionName}`,
      html: `<!doctype html><html><body style="margin:0;background:#f5f6f4;font-family:Arial,sans-serif;color:#17211d"><main style="max-width:540px;margin:32px auto;padding:32px;background:#fff;border:1px solid #e4e8e3;border-radius:16px"><p style="color:#68736c;font-size:13px">${safeInstitution}</p><h1 style="font-size:24px">You're invited, ${safeName}</h1><p style="line-height:1.6">${courseCopy}</p><p style="margin:28px 0"><a href="${escapeHtml(inviteUrl)}" style="display:inline-block;padding:13px 20px;border-radius:9px;background:#54208a;color:#fff;text-decoration:none;font-weight:700">Accept invitation</a></p><p style="font-size:13px;color:#68736c">This link expires in 7 days and can be used once. If the button does not work, copy this link into your browser:<br><a href="${escapeHtml(inviteUrl)}">${escapeHtml(inviteUrl)}</a></p></main></body></html>`,
      text: `You're invited, ${inviteeName}. ${textCourse}\n\nAccept your invitation: ${inviteUrl}\n\nThis link expires in 7 days and can be used once.`,
    });
    return { success: true, delivered: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[MailService] Failed to send invitation to ${to}: ${error.message}`);
    if (isDev) console.log(`[SKILLIO INVITATION] Delivery failed; invitation link: ${inviteUrl}`);
    return { success: false, delivered: false, error: error.message };
  }
};
