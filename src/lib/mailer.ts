import nodemailer from "nodemailer";

// SMTP biasa (bukan Gmail API/OAuth2) — jauh lebih simpel setup-nya untuk
// akun Google Workspace: aktifkan 2-Step Verification di akun pengirim,
// lalu buat App Password di myaccount.google.com/apppasswords, pakai itu
// sebagai SMTP_PASS. Tidak perlu Google Cloud Console/OAuth Client/redirect
// URI sama sekali.
const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
const smtpPort = parseInt(process.env.SMTP_PORT || "465", 10);
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  // 465 = SSL langsung (secure: true). Port lain (mis. 587) pakai STARTTLS
  // (secure: false, nodemailer upgrade koneksinya sendiri).
  secure: smtpPort === 465,
  auth: { user: smtpUser, pass: smtpPass },
  // Tanpa batas, SMTP yang menggantung bikin aksi admin (konfirmasi pembayaran)
  // ikut menggantung sampai menit-an.
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 30000,
});

export type mailMetaData = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  fileAttachments?: Array<{
    filename: string;
    path?: string;
    content?: string | Buffer;
    contentType?: string;
  }>;
};

export const sendMailTo = async (metadata: mailMetaData) => {
  try {
    return await transporter.sendMail({
    from: `"LKBB Antareja 2026" <${smtpUser}>`,
    to: metadata.to,
    subject: metadata.subject,
    text: metadata.text,
    html: metadata.html,
    attachments: metadata.fileAttachments,
    headers: {
      "X-Application-Developer": "Antareja",
      "X-Application-Version": "v1",
    },
    });
  } catch (e) {
    // Penyebab sebenarnya (auth SMTP salah, koneksi diblokir, dst) harus terlihat
    // di `docker logs`, bukan hilang di catch pemanggil.
    console.error(`[mailer] gagal kirim "${metadata.subject}":`, e instanceof Error ? e.message : e);
    throw e;
  }
};
