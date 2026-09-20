import PDFDocument from "pdfkit";
import { Anggota, Tim } from "@prisma/client";
import { getLogoPng } from "./kuitansi";

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch (e) {
    console.error("Gagal ambil foto anggota untuk formulir:", url, e);
    return null;
  }
}

const posisiOrder = [
  "PELATIH",
  "OFFICIAL",
  "DANTON",
  "B1S1", "B1S2", "B1S3",
  "B2S1", "B2S2", "B2S3",
  "B3S1", "B3S2", "B3S3",
  "B4S1", "B4S2", "B4S3",
  "B5S1", "B5S2", "B5S3",
];

const tipeTimLabel: Record<string, string> = {
  SMALL: "12 Anggota",
  NORMAL: "15 Anggota",
};

// Formulir registrasi otomatis-terisi, menggantikan template DOCX kosong yang
// sebelumnya harus diisi manual oleh tim — data langsung diambil dari sistem
// begitu seluruh data tim & anggota sudah lengkap (lihat isTimDataLengkap).
export async function buildFormulirPdf(
  tim: Tim,
  anggotas: Anggota[]
): Promise<Buffer> {
  const sortedAnggota = [...anggotas].sort(
    (a, b) => posisiOrder.indexOf(a.posisi) - posisiOrder.indexOf(b.posisi)
  );

  const [logo, fotoBuffers] = await Promise.all([
    getLogoPng(),
    Promise.all(
      sortedAnggota.map((a) => (a.foto ? fetchImageBuffer(a.foto) : Promise.resolve(null)))
    ),
  ]);

  const official = sortedAnggota.find((a) => a.posisi === "OFFICIAL");
  const danton = sortedAnggota.find((a) => a.posisi === "DANTON");

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    if (logo) {
      try {
        doc.image(logo, doc.page.width / 2 - 25, 40, { width: 50 });
        doc.moveDown(3.5);
      } catch {
        // Logo korup/gagal ditempel bukan alasan gagalkan seluruh formulir.
      }
    } else {
      doc.moveDown(1);
    }

    doc.fontSize(16).font("Helvetica-Bold").text("FORMULIR REGISTRASI PESERTA", { align: "center" });
    doc.fontSize(12).font("Helvetica").text("ANTAREJA SEASON 4", { align: "center" });
    doc.moveDown(1.5);

    doc.fontSize(13).font("Helvetica-Bold").text("Data Tim");
    doc.moveDown(0.3);

    const rows: [string, string][] = [
      ["Asal Sekolah", tim.asal_sekolah],
      ["Nama Tim", tim.nama_tim],
      ["Jenjang", tim.jenjang],
      ["Tipe Tim", tipeTimLabel[tim.tipe_tim] ?? tim.tipe_tim],
      ["Nama Pelatih", tim.pelatih],
      ["No. Telp Pelatih", tim.no_pelatih],
      ["Nama Official", official?.nama ?? "-"],
      ["Nama Danton", danton?.nama ?? "-"],
      ["Link Video Tiktok + Foto Pasukan", tim.link_video || "-"],
    ];

    doc.fontSize(10.5);
    for (const [label, value] of rows) {
      doc.font("Helvetica-Bold").text(label, { continued: true, width: 200 });
      doc.font("Helvetica").text(`: ${value}`);
      doc.moveDown(0.25);
    }

    doc.moveDown(1);
    doc.fontSize(13).font("Helvetica-Bold").text("Daftar Anggota");
    doc.moveDown(0.5);

    const colX = { no: 40, posisi: 70, nama: 150, kelasNisn: 320, telp: 420 };
    const headerY = doc.y;
    doc.fontSize(9.5).font("Helvetica-Bold");
    doc.text("No", colX.no, headerY, { width: 25 });
    doc.text("Posisi", colX.posisi, headerY, { width: 75 });
    doc.text("Nama", colX.nama, headerY, { width: 165 });
    doc.text("Kelas/NISN", colX.kelasNisn, headerY, { width: 95 });
    doc.text("No. Telp", colX.telp, headerY, { width: 100 });
    doc.moveDown(0.5);
    doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).strokeColor("#cccccc").stroke();
    doc.moveDown(0.3);

    doc.font("Helvetica").fontSize(9.5);
    sortedAnggota.forEach((a, i) => {
      if (doc.y > doc.page.height - 80) doc.addPage();
      const rowY = doc.y;
      doc.text(String(i + 1), colX.no, rowY, { width: 25 });
      doc.text(a.posisi, colX.posisi, rowY, { width: 75 });
      doc.text(a.nama, colX.nama, rowY, { width: 165 });
      doc.text(a.kelas ?? a.nisn ?? "-", colX.kelasNisn, rowY, { width: 95 });
      doc.text(a.telp, colX.telp, rowY, { width: 100 });
      doc.moveDown(0.5);
    });

    doc.addPage();
    doc.fontSize(13).font("Helvetica-Bold").text("Dokumen Foto Pasukan dan Danton");
    doc.moveDown(0.8);

    const thumbSize = 90;
    const gap = 15;
    const perRow = 4;
    const startX = doc.x;
    let col = 0;
    let rowTop = doc.y;

    sortedAnggota.forEach((a, i) => {
      const foto = fotoBuffers[i];
      if (rowTop + thumbSize + 30 > doc.page.height - 40) {
        doc.addPage();
        rowTop = doc.y;
        col = 0;
      }
      const x = startX + col * (thumbSize + gap);
      if (foto) {
        try {
          doc.image(foto, x, rowTop, { width: thumbSize, height: thumbSize, fit: [thumbSize, thumbSize] });
        } catch {
          doc.rect(x, rowTop, thumbSize, thumbSize).stroke();
        }
      } else {
        doc.rect(x, rowTop, thumbSize, thumbSize).stroke();
      }
      doc.fontSize(8).font("Helvetica").text(a.nama, x, rowTop + thumbSize + 3, { width: thumbSize, align: "center" });
      doc.fontSize(8).text(a.posisi, x, rowTop + thumbSize + 14, { width: thumbSize, align: "center" });

      col++;
      if (col >= perRow) {
        col = 0;
        rowTop += thumbSize + 35;
      }
    });

    doc.moveDown(2);
    doc.fontSize(8).font("Helvetica-Oblique").text(
      `Formulir ini dibuat otomatis oleh sistem berdasarkan data pendaftaran tim pada ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}.`,
      40,
      doc.page.height - 60,
      { align: "left" }
    );

    doc.end();
  });
}
