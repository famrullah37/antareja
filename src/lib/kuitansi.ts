import PDFDocument from "pdfkit";
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";
import { terbilangRupiah } from "./terbilang";

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);
}

// Nomor kuitansi: KW/ANTAREJA/<tahun terbit>/<urutan 4 digit>, mis. KW/ANTAREJA/2026/0001.
export function formatNomorKuitansi(urutan: number, tanggal: Date) {
  return `KW/ANTAREJA/${tanggal.getFullYear()}/${String(urutan).padStart(4, "0")}`;
}

// Lambang Antareja SAJA (icon-colored.svg, tanpa tulisan "ANTAREJA" seperti logo.svg).
// pdfkit cuma terima raster — konversi ke PNG sekali per ukuran lalu simpan di memori.
const logoCache = new Map<number, Buffer>();
export async function getLogoPng(width = 160): Promise<Buffer | null> {
  const cached = logoCache.get(width);
  if (cached) return cached;
  try {
    const svg = await fs.readFile(path.join(process.cwd(), "public", "icon-colored.svg"));
    const png = await sharp(svg).resize(width).png().toBuffer();
    logoCache.set(width, png);
    return png;
  } catch (e) {
    console.error("Gagal muat logo untuk kuitansi:", e);
    return null;
  }
}

// Lambang watermark yang sudah "dipudarkan" di pikselnya (dicampur ke putih, tanpa
// alpha). Jangan pakai doc.opacity(): sebagian viewer PDF (HP/WhatsApp) mengabaikan
// transparansi sehingga watermark tampil pekat menutupi isi kuitansi.
let watermarkLogoCache: Buffer | null = null;
async function getWatermarkLogoPng(kepekatan: number): Promise<Buffer | null> {
  if (watermarkLogoCache) return watermarkLogoCache;
  const logo = await getLogoPng(600);
  if (!logo) return null;
  try {
    const { data, info } = await sharp(logo)
      .flatten({ background: "#ffffff" })
      .raw()
      .toBuffer({ resolveWithObject: true });
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.round(255 - (255 - data[i]) * kepekatan);
    }
    watermarkLogoCache = await sharp(data, {
      raw: { width: info.width, height: info.height, channels: info.channels },
    })
      .png()
      .toBuffer();
    return watermarkLogoCache;
  } catch (e) {
    console.error("Gagal buat watermark logo kuitansi:", e);
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

// pdfkit sering salah baca alpha PNG (palette/grayscale+alpha) sehingga latar
// transparan tanda tangan jadi kotak hitam. Normalkan ke PNG RGBA 8-bit: tinta
// gelap di atas latar transparan, supaya watermark tetap terlihat di belakangnya.
// - Gambar ber-alpha: pakai alpha aslinya, tinta diwarnai gelap (tinta putih/abu
//   di file transparan tetap terbaca di kertas putih).
// - Gambar tanpa alpha (scan/foto): alpha dari kegelapan piksel; kalau latarnya
//   gelap (tinta terang di latar hitam), dibalik dulu.
async function prepareTtdPng(input: Buffer): Promise<Buffer | null> {
  try {
    const { data, info } = await sharp(input)
      .rotate()
      .resize({ width: 600, height: 300, fit: "inside", withoutEnlargement: true })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const px = info.width * info.height;
    let transparan = 0;
    let totalLum = 0;
    for (let i = 0; i < px; i++) {
      const o = i * 4;
      if (data[o + 3] < 250) transparan++;
      totalLum += 0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2];
    }
    const pakaiAlpha = transparan > px * 0.01;
    const latarGelap = totalLum / px < 128;
    const lumAt = (o: number) => {
      const l = 0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2];
      return latarGelap ? 255 - l : l;
    };

    // Tinta tergelap -> alpha penuh, latar (dekat putih) -> transparan, supaya
    // tinta pudar (pensil/abu-abu) tetap tebal di kuitansi.
    let minLum = 255;
    if (!pakaiAlpha) for (let i = 0; i < px; i++) minLum = Math.min(minLum, lumAt(i * 4));
    const batasLatar = Math.min(230, minLum + 0.85 * (255 - minLum));

    for (let i = 0; i < px; i++) {
      const o = i * 4;
      let alpha: number;
      if (pakaiAlpha) {
        alpha = data[o + 3];
      } else {
        const t = (batasLatar - lumAt(o)) / Math.max(1, batasLatar - minLum);
        alpha = Math.round(Math.max(0, Math.min(1, t)) * 255);
      }
      data[o] = 0x1a;
      data[o + 1] = 0x1a;
      data[o + 2] = 0x2e;
      data[o + 3] = alpha;
    }

    return await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
      .png({ palette: false })
      .toBuffer();
  } catch (e) {
    console.error("Gagal proses tanda tangan untuk kuitansi:", e);
    return null;
  }
}

export type KuitansiData = {
  nomor: string;
  namaTim: string;
  asalSekolah: string;
  jenjang: string;
  isDP: boolean;
  hargaDasar: number;
  tanggal: Date;
  bendaharaNama?: string | null;
  bendaharaTtdUrl?: string | null;
};

// Watermark di belakang isi (digambar paling awal): lambang besar samar di tengah +
// teks "LPKBB ANTAREJA" berulang diagonal supaya kuitansi tampak asli & sulit ditiru.
// Kuitansi DP ditambah cap besar "SEMENTARA".
// Semua warna watermark sudah dicampur ke putih (teks hitam 10%, lambang 10%, cap
// merah 20% — cukup tebal supaya tetap tercetak di printer biasa) — bukan transparansi PDF, lihat getWatermarkLogoPng.
function drawWatermark(doc: PDFKit.PDFDocument, logoBesar: Buffer | null, isDP: boolean) {
  const W = doc.page.width;
  const H = doc.page.height;

  doc.save();
  if (logoBesar) {
    try {
      doc.image(logoBesar, W / 2 - 135, H / 2 - 135, { width: 270 });
    } catch {
      // Watermark gagal bukan alasan menggagalkan kuitansi.
    }
  }

  doc.rotate(-30, { origin: [W / 2, H / 2] });
  doc.fillColor("#E6E6E6").font("Helvetica-Bold").fontSize(14);
  for (let y = -H, row = 0; y < H * 2; y += 56, row++) {
    for (let x = -W; x < W * 2; x += 150) {
      doc.text("LPKBB ANTAREJA", x + (row % 2 ? 75 : 0), y, { lineBreak: false });
    }
  }

  if (isDP) {
    doc.fillColor("#F7CCD1").fontSize(58);
    doc.text("SEMENTARA", 0, H / 2 - 30, { width: W, align: "center", lineBreak: false });
  }
  doc.restore();
}

// Generate kuitansi PDF ke Buffer, dipanggil setelah bendahara/admin approve
// pembayaran (otomatis), lewat tombol "Generate Ulang Kuitansi", atau unduh
// langsung dari dashboard tim. Kuitansi DP bersifat SEMENTARA (diganti kuitansi
// lunas). Bukan template resmi ber-KOP surat.
export async function buildKuitansiPdf(data: KuitansiData): Promise<Buffer> {
  const [logo, logoBesar, ttd] = await Promise.all([
    getLogoPng(160),
    getWatermarkLogoPng(0.1),
    data.bendaharaTtdUrl
      ? fetchImageBuffer(data.bendaharaTtdUrl).then((b) => (b ? prepareTtdPng(b) : null))
      : Promise.resolve(null),
  ]);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A5", margin: 40 });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    drawWatermark(doc, logoBesar, data.isDP);

    let y = 36;
    if (logo) {
      try {
        doc.image(logo, doc.page.width / 2 - 24, y, { width: 48 });
        y += 48 + 10;
      } catch {
        // Logo korup/gagal ditempel bukan alasan gagalkan seluruh kuitansi.
      }
    }

    doc
      .fontSize(16)
      .font("Helvetica-Bold")
      .fillColor("#000000")
      .text(data.isDP ? "KUITANSI SEMENTARA" : "KUITANSI PEMBAYARAN PENDAFTARAN", 40, y, {
        width: doc.page.width - 80,
        align: "center",
      });
    if (data.isDP) {
      doc.fontSize(11).text("Pembayaran Uang Muka (DP 50%)", { align: "center" });
    }
    doc.fontSize(11).font("Helvetica").text("LPKBB Antareja 2026 - SMK Telkom Malang", { align: "center" });
    doc.moveDown(1.5);

    const rows: [string, string][] = [
      ["No. Kuitansi", data.nomor],
      ["Diterima dari", data.asalSekolah],
      ["Nama Tim", data.namaTim],
      ["Jenjang", data.jenjang],
      ["Jenis Pembayaran", data.isDP ? "DP 50% (sementara)" : "Lunas"],
      ["Tanggal", data.tanggal.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })],
    ];

    doc.fontSize(11);
    // Label & nilai di kolom tetap supaya nilai panjang wrap di kolomnya sendiri,
    // bukan menabrak label.
    const labelX = doc.page.margins.left;
    const valueX = labelX + 125;
    const valueW = doc.page.width - doc.page.margins.right - valueX;
    for (const [label, value] of rows) {
      const rowY = doc.y;
      doc.font("Helvetica-Bold").text(label, labelX, rowY, { width: 120 });
      doc.font(label === "No. Kuitansi" ? "Helvetica-Bold" : "Helvetica").text(`: ${value}`, valueX, rowY, { width: valueW });
      doc.moveDown(0.3);
    }
    doc.x = labelX;

    doc.moveDown(1);
    const contentW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    doc.font("Helvetica-Bold").fontSize(13).text(`Total Dibayar: ${formatRupiah(data.hargaDasar)}`, labelX, doc.y, { width: contentW });
    doc.moveDown(0.3);
    doc.font("Helvetica-BoldOblique").fontSize(11).text(`Terbilang: ${terbilangRupiah(data.hargaDasar)}`, labelX, doc.y, { width: contentW });
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

    // Ruang tanda tangan dihitung eksplisit (bukan moveDown) supaya gambar
    // tidak menimpa nama bendahara di bawahnya.
    const ttdTop = doc.y + 4;
    const ttdH = 50;
    if (ttd) {
      try {
        doc.image(ttd, signX + 30, ttdTop, { fit: [100, ttdH], align: "center", valign: "center" });
      } catch {
        // Tanda tangan gagal ditempel bukan alasan gagalkan kuitansi.
      }
    }
    doc.y = ttdTop + ttdH + 6;

    doc.font("Helvetica-Bold").text(data.bendaharaNama || "(________________)", signX, doc.y, {
      width: 160,
      align: "center",
    });

    doc.moveDown(2);
    const catatan = data.isDP
      ? "Kuitansi ini bersifat SEMENTARA sebagai bukti pembayaran uang muka (DP 50%) dan akan " +
        "digantikan dengan kuitansi resmi (lunas) setelah pelunasan. Simpan sampai kuitansi lunas diterbitkan."
      : "Kuitansi ini digenerate otomatis oleh sistem setelah pembayaran diverifikasi. " +
        "Simpan sebagai bukti pendaftaran resmi.";
    doc.fontSize(9).font("Helvetica-Oblique").text(catatan, 40, doc.y, { width: contentW, align: "left" });

    doc.end();
  });
}
