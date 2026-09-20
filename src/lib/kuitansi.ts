import PDFDocument from "pdfkit";
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);
}

// Logo di public/ berformat SVG (pdfkit cuma terima raster) — konversi ke PNG
// sekali lalu simpan di memori, tidak perlu baca+konversi ulang tiap kuitansi.
let logoPngCache: Buffer | null = null;
export async function getLogoPng(): Promise<Buffer | null> {
  if (logoPngCache) return logoPngCache;
  try {
    const svgPath = path.join(process.cwd(), "public", "logo.svg");
    const svg = await fs.readFile(svgPath);
    logoPngCache = await sharp(svg).resize(160).png().toBuffer();
    return logoPngCache;
  } catch (e) {
    console.error("Gagal muat logo untuk kuitansi:", e);
    return null;
  }
}

// Tanda tangan bendahara diupload admin lewat Pengaturan, disimpan sebagai
// URL Cloudinary — perlu di-fetch dulu jadi Buffer sebelum bisa ditempel ke PDF.
async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch (e) {
    console.error("Gagal ambil gambar untuk kuitansi:", url, e);
    return null;
  }
}

export type KuitansiData = {
  namaTim: string;
  asalSekolah: string;
  jenjang: string;
  isDP: boolean;
  hargaDasar: number;
  tanggal: Date;
  bendaharaNama?: string | null;
  bendaharaTtdUrl?: string | null;
};

// Generate kuitansi PDF ke Buffer, dipanggil setelah bendahara/admin approve
// pembayaran (otomatis) atau lewat tombol "Generate Ulang Kuitansi" (manual,
// mis. untuk pelunasan setelah sebelumnya DP). Bukan template resmi ber-KOP
// surat — cukup bukti tertulis nominal & tanda tangan yang bisa diunduh/
// dilampirkan email.
export async function buildKuitansiPdf(data: KuitansiData): Promise<Buffer> {
  const [logo, ttd] = await Promise.all([
    getLogoPng(),
    data.bendaharaTtdUrl ? fetchImageBuffer(data.bendaharaTtdUrl) : Promise.resolve(null),
  ]);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A5", margin: 40 });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    if (logo) {
      try {
        doc.image(logo, doc.page.width / 2 - 25, 40, { width: 50 });
        doc.moveDown(3.5);
      } catch {
        // Logo korup/gagal ditempel bukan alasan gagalkan seluruh kuitansi.
      }
    }

    doc
      .fontSize(16)
      .font("Helvetica-Bold")
      .text("KUITANSI PEMBAYARAN PENDAFTARAN", { align: "center" });
    doc.fontSize(11).font("Helvetica").text("LKBB Antareja 2026 - SMK Telkom Malang", { align: "center" });
    doc.moveDown(1.5);

    const rows: [string, string][] = [
      ["Diterima dari", data.asalSekolah],
      ["Nama Tim", data.namaTim],
      ["Jenjang", data.jenjang],
      ["Jenis Pembayaran", data.isDP ? "DP 50%" : "Lunas"],
      ["Biaya Pendaftaran", formatRupiah(data.hargaDasar)],
      ["Tanggal", data.tanggal.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })],
    ];

    doc.fontSize(11);
    for (const [label, value] of rows) {
      doc.font("Helvetica-Bold").text(label, { continued: true, width: 150 });
      doc.font("Helvetica").text(`: ${value}`);
      doc.moveDown(0.3);
    }

    doc.moveDown(1);
    doc.font("Helvetica-Bold").fontSize(13).text(`Total Dibayar: ${formatRupiah(data.hargaDasar)}`);
    doc.moveDown(3);

    // Blok tanda tangan bendahara, rata kanan.
    const signX = doc.page.width - doc.page.margins.right - 160;
    doc.fontSize(10).font("Helvetica").text(
      data.tanggal.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }),
      signX,
      doc.y,
      { width: 160, align: "center" }
    );
    doc.text("Bendahara,", signX, doc.y, { width: 160, align: "center" });

    if (ttd) {
      try {
        doc.image(ttd, signX + 30, doc.y + 4, { width: 100, height: 50, fit: [100, 50] });
        doc.moveDown(4);
      } catch {
        doc.moveDown(4);
      }
    } else {
      doc.moveDown(4);
    }

    doc.font("Helvetica-Bold").text(data.bendaharaNama || "(________________)", signX, doc.y, {
      width: 160,
      align: "center",
    });

    doc.moveDown(2);
    doc.fontSize(9).font("Helvetica-Oblique").text(
      "Kuitansi ini digenerate otomatis oleh sistem setelah pembayaran diverifikasi. " +
      "Simpan sebagai bukti pendaftaran resmi.",
      40,
      doc.y,
      { align: "left" }
    );

    doc.end();
  });
}
