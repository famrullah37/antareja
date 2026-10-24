import "server-only";
import { escapeHtml } from "@/lib/escapeHtml";
import { sendMailTo } from "@/lib/mailer";
import { siteConfig } from "@/config/site";

// Ringkasan pembayaran untuk email Tiket & Galeri Foto: (1) email "pesanan
// diterima" begitu pembeli checkout — supaya nominal tepat (termasuk kode unik)
// tersimpan di sisi pembeli walau halaman pembelian sudah ditutup; (2) blok
// yang sama disisipkan ke email verifikasi sebagai bukti pembayaran.

export type BarisRincian = { label: string; nominal: number };

export type RingkasanPembayaran = {
  kodeUnik: string | null;
  totalBayar: number;
  metodePembayaran: string;
  tanggal: Date;
  rincian: BarisRincian[];
};

const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

function formatTanggal(d: Date) {
  return (
    d.toLocaleString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Jakarta",
    }) + " WIB"
  );
}

export function labelMetode(metode: string) {
  return metode === "QRIS" ? "QRIS" : metode === "CASH" ? "Tunai" : "Transfer Bank";
}

export function blokRingkasanPembayaran(r: RingkasanPembayaran, status: string) {
  const baris = r.rincian
    .map(
      (b) => `<tr>
        <td style="padding:6px 0">${escapeHtml(b.label)}</td>
        <td style="padding:6px 0;text-align:right">${rp(b.nominal)}</td>
      </tr>`
    )
    .join("");
  const kode = r.kodeUnik
    ? `<tr><td style="padding:6px 0;border-top:1px solid #ddd">Kode unik</td><td style="padding:6px 0;border-top:1px solid #ddd;text-align:right">+${parseInt(r.kodeUnik, 10)}</td></tr>`
    : "";
  return `
    <div style="background:#f9f9f9;border-radius:8px;padding:16px;margin:16px 0">
      ${r.kodeUnik ? `<p style="margin:0 0 4px"><b>Kode Pesanan:</b> <span style="font-family:monospace;font-size:16px">#${r.kodeUnik}</span></p>` : ""}
      <p style="margin:0 0 4px"><b>Tanggal Pesan:</b> ${formatTanggal(r.tanggal)}</p>
      <p style="margin:0 0 12px"><b>Status:</b> ${escapeHtml(status)} · ${labelMetode(r.metodePembayaran)}</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        ${baris}
        ${kode}
        <tr><td style="padding:6px 0;font-weight:bold">Total ${status === "Lunas" ? "Dibayar" : "Bayar"}</td><td style="padding:6px 0;text-align:right;font-weight:bold">${rp(r.totalBayar)}</td></tr>
      </table>
    </div>`;
}

// Email "pesanan diterima" — gagal kirim tidak menggagalkan pembelian.
export async function kirimEmailPesananDiterima(input: {
  to: string;
  nama: string;
  produk: string; // mis. "Tiket", "Foto"
  ringkasan: RingkasanPembayaran;
  keterangan: string; // apa yang dikirim setelah diverifikasi
}) {
  const { ringkasan } = input;
  try {
    await sendMailTo({
      to: input.to,
      subject: `🧾 Pesanan ${input.produk} LPKBB Antareja 2026 Diterima${ringkasan.kodeUnik ? ` — #${ringkasan.kodeUnik}` : ""}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:auto">
          <h2 style="color:#F70048">Pesanan ${escapeHtml(input.produk)} Diterima</h2>
          <p>Halo <b>${escapeHtml(input.nama)}</b>,</p>
          <p>Pesanan Anda sudah kami terima dan sedang <b>menunggu verifikasi pembayaran</b> oleh panitia.</p>
          ${blokRingkasanPembayaran(ringkasan, "Menunggu verifikasi")}
          <p style="background:#fff7ed;border-radius:8px;padding:12px">
            Pastikan nominal yang dibayar <b>tepat ${rp(ringkasan.totalBayar)}</b> (termasuk kode unik) — panitia
            mencocokkan pembayaran dari nominal ini. Simpan email ini sebagai catatan pesanan.
          </p>
          <p>${escapeHtml(input.keterangan)}</p>
          <p style="font-size:12px;color:#aaa">LPKBB Antareja 2026 — SMK Telkom Malang</p>
        </div>`,
    });
  } catch (e) {
    console.error(`Gagal kirim email pesanan ${input.produk}:`, e);
  }
}

// Notifikasi ke panitia setiap ada pembayaran baru masuk (status PENDING),
// supaya bendahara tidak perlu bolak-balik membuka panel admin. Alamat bisa
// diganti lewat env EMAIL_NOTIF_PEMBAYARAN tanpa deploy ulang kode.
const EMAIL_NOTIF_PEMBAYARAN = process.env.EMAIL_NOTIF_PEMBAYARAN || "antareja@smktelkom-mlg.sch.id";

export type NotifPembayaranMasuk = {
  jenis: string; // mis. "Pendaftaran Tim", "Tiket"
  pathAdmin: string; // halaman verifikasi, mis. "/admin/tiket"
  nama: string;
  kontak?: string | null; // email / no. HP pembayar
  totalBayar: number;
  kodeUnik?: string | null;
  metodePembayaran: string;
  buktiUrl?: string | null;
  detail?: string; // ringkasan isi pesanan
};

// Sengaja tidak di-await pemanggil: pembeli tidak perlu menunggu SMTP ke
// panitia, dan gagal kirim tidak boleh menggagalkan pembayaran.
export function notifPembayaranMasuk(n: NotifPembayaranMasuk) {
  const linkAdmin = `${siteConfig.url}${n.pathAdmin}`;
  const baris = (label: string, isi: string) =>
    `<tr><td style="padding:4px 12px 4px 0;color:#666;vertical-align:top">${label}</td><td style="padding:4px 0">${isi}</td></tr>`;
  sendMailTo({
    to: EMAIL_NOTIF_PEMBAYARAN,
    subject: `💰 Pembayaran ${n.jenis} masuk — ${rp(n.totalBayar)}${n.kodeUnik ? ` #${n.kodeUnik}` : ""}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto">
        <h2 style="color:#F70048">Pembayaran ${escapeHtml(n.jenis)} Masuk</h2>
        <p>Ada pembayaran baru yang <b>menunggu verifikasi</b>.</p>
        <table style="border-collapse:collapse;font-size:14px">
          ${baris("Nama", `<b>${escapeHtml(n.nama)}</b>`)}
          ${n.kontak ? baris("Kontak", escapeHtml(n.kontak)) : ""}
          ${n.detail ? baris("Pesanan", escapeHtml(n.detail)) : ""}
          ${baris("Total", `<b>${rp(n.totalBayar)}</b>`)}
          ${n.kodeUnik ? baris("Kode unik", `<span style="font-family:monospace">#${escapeHtml(n.kodeUnik)}</span>`) : ""}
          ${baris("Metode", labelMetode(n.metodePembayaran))}
          ${baris("Waktu", formatTanggal(new Date()))}
          ${baris("Bukti", n.buktiUrl ? `<a href="${escapeHtml(n.buktiUrl)}">Lihat bukti</a>` : "Tidak diunggah — cocokkan nominal di mutasi/riwayat QRIS")}
        </table>
        <p style="margin-top:20px">
          <a href="${linkAdmin}" style="background:#F70048;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Buka halaman verifikasi</a>
        </p>
        <p style="font-size:12px;color:#aaa">Notifikasi otomatis LPKBB Antareja 2026</p>
      </div>`,
  }).catch((e) => console.error(`Gagal kirim notifikasi pembayaran ${n.jenis}:`, e));
}
