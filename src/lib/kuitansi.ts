import PDFDocument from "pdfkit";

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);
}

export type KuitansiData = {
  namaTim: string;
  asalSekolah: string;
  jenjang: string;
  isDP: boolean;
  hargaDasar: number;
  kodeUnik: string;
  totalBayar: number;
  tanggal: Date;
};

// Generate kuitansi PDF sederhana ke Buffer, dipanggil setelah bendahara/admin
// approve pembayaran pendaftaran. Bukan template resmi ber-KOP surat — cukup
// bukti tertulis nominal & tanggal yang bisa diunduh/dilampirkan email.
export function buildKuitansiPdf(data: KuitansiData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A5", margin: 40 });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

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
      ["Kode Unik", data.kodeUnik],
      ["Tanggal", data.tanggal.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })],
    ];

    doc.fontSize(11);
    for (const [label, value] of rows) {
      doc.font("Helvetica-Bold").text(label, { continued: true, width: 150 });
      doc.font("Helvetica").text(`: ${value}`);
      doc.moveDown(0.3);
    }

    doc.moveDown(1);
    doc.font("Helvetica-Bold").fontSize(13).text(`Total Dibayar: ${formatRupiah(data.totalBayar)}`);
    doc.moveDown(2);

    doc.fontSize(9).font("Helvetica-Oblique").text(
      "Kuitansi ini digenerate otomatis oleh sistem setelah pembayaran diverifikasi. " +
      "Simpan sebagai bukti pendaftaran resmi.",
      { align: "left" }
    );

    doc.end();
  });
}
