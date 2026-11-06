
import nodemailer from 'nodemailer'
import dotenv from 'dotenv'

dotenv.config();
const transporter = nodemailer.createTransport({
  service: "gmail",
  secure: true, // Use true for port 465, false for port 587
  auth: {
    user: process.env.EMAIL_ID,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const sendMail = async (to, otp) => {
  await transporter.sendMail({
    from: process.env.EMAIL_ID,
    to,
    subject: "Skillio Password Reset OTP",
    html: `
    <div style="margin:0;padding:0;background-color:#f4f6f8;font-family:Arial,Helvetica,sans-serif;">
      <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:8px;overflow:hidden;">
        
        <tr>
          <td style="background:#0f172a;padding:20px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:22px;">Skillio</h1>
          </td>
        </tr>

        <tr>
          <td style="padding:30px;">
            <h2 style="margin-top:0;color:#111827;">Reset Your Password</h2>
            <p style="color:#374151;font-size:15px;line-height:1.6;">
              We received a request to reset your password. 
              Use the OTP below to proceed.
            </p>

            <div style="margin:30px 0;text-align:center;">
              <span style="
                display:inline-block;
                padding:14px 28px;
                font-size:24px;
                letter-spacing:4px;
                font-weight:bold;
                color:#111827;
                background:#e5e7eb;
                border-radius:6px;
              ">
                ${otp}
              </span>
            </div>

            <p style="color:#6b7280;font-size:14px;">
              This OTP is valid for 5 minutes. Do not share it with anyone.
            </p>

            <p style="color:#6b7280;font-size:14px;margin-top:30px;">
              If you didn’t request a password reset, you can safely ignore this email.
            </p>
          </td>
        </tr>

        <tr>
          <td style="background:#f9fafb;padding:15px;text-align:center;font-size:12px;color:#9ca3af;">
            © ${new Date().getFullYear()} Skillio. All rights reserved.
          </td>
        </tr>

      </table>
    </div>
    `
  });
};

export default sendMail;