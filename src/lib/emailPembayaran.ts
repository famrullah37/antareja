import "server-only";
import { escapeHtml } from "@/lib/escapeHtml";
import { sendMailTo } from "@/lib/mailer";

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
