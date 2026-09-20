import PDFDocument from "pdfkit";
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";
import { Anggota, Tim } from "@prisma/client";

const PAGE_MARGIN_X = 40;
const BOX_W = 92;
const BOX_H = 123; // rasio 3x4 seperti pas foto
const COL_GAP = 60;
const ROW_PITCH = BOX_H + 36; // kotak + nama (maks. 2 baris) + jarak antar baris

// Kop surat resmi (logo Paskibra + SMK Telkom Malang + Telkom Schools) diambil
// dari template DOCX lama, disimpan sebagai gambar utuh di public/.
let kopCache: Buffer | null = null;
async function getKop(): Promise<Buffer | null> {
  if (kopCache) return kopCache;
  try {
    kopCache = await fs.readFile(path.join(process.cwd(), "public", "image", "kop-formulir.png"));
    return kopCache;
  } catch (e) {
    console.error("Gagal muat kop formulir:", e);
    return null;
  }
}

// Foto anggota di Cloudinary bisa besar (sampai 1200px) — kecilkan & potong
// ke rasio 3x4 persis ukuran kotak supaya PDF tetap ringan (16+ foto).
async function fetchFotoBox(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const raw = Buffer.from(await res.arrayBuffer());
    return await sharp(raw)
      .rotate()
      .resize(BOX_W * 3, BOX_H * 3, { fit: "cover" })
      .jpeg({ quality: 80 })
      .toBuffer();
  } catch (e) {
    console.error("Gagal ambil foto anggota untuk formulir:", url, e);
    return null;
  }
}

const POSISI_PASUKAN = [
  "B1S1", "B1S2", "B1S3",
  "B2S1", "B2S2", "B2S3",
  "B3S1", "B3S2", "B3S3",
  "B4S1", "B4S2", "B4S3",
  "B5S1", "B5S2", "B5S3",
];

// Berkas registrasi peserta otomatis-terisi (format sama dengan template DOCX
// lama: kop surat, isian tim, kotak foto Danton & pasukan, tanda tangan
// Pelatih/Official). Dipanggil hanya kalau data tim & anggota sudah lengkap
// (lihat downloadFormulirPdf di actions/Tim.ts).
export async function buildFormulirPdf(tim: Tim, anggotas: Anggota[]): Promise<Buffer> {
  const danton = anggotas.find((a) => a.posisi === "DANTON");
  const official = anggotas.find((a) => a.posisi === "OFFICIAL");
  const pelatih = anggotas.find((a) => a.posisi === "PELATIH");
  const pasukan = POSISI_PASUKAN.map((p) => anggotas.find((a) => a.posisi === p)).filter(
    (a): a is Anggota => !!a
  );

  const [kop, fotoDanton, fotoPelatih, fotoOfficial, fotoPasukan] = await Promise.all([
    getKop(),
    danton?.foto ? fetchFotoBox(danton.foto) : Promise.resolve(null),
    pelatih?.foto ? fetchFotoBox(pelatih.foto) : Promise.resolve(null),
    official?.foto ? fetchFotoBox(official.foto) : Promise.resolve(null),
    Promise.all(pasukan.map((a) => (a.foto ? fetchFotoBox(a.foto) : Promise.resolve(null)))),
  ]);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 30, bottom: 20, left: PAGE_MARGIN_X, right: PAGE_MARGIN_X },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const contentW = doc.page.width - PAGE_MARGIN_X * 2;
    const startX = PAGE_MARGIN_X + (contentW - (3 * BOX_W + 2 * COL_GAP)) / 2;
    const colX = (i: number) => startX + i * (BOX_W + COL_GAP);

    let y = 30;
    if (kop) {
      try {
        doc.image(kop, PAGE_MARGIN_X, y, { width: contentW });
        y += Math.round((contentW * 200) / 975) + 22;
      } catch {
        y += 22;
      }
    } else {
      y += 22;
    }

    doc.font("Helvetica-Bold").fontSize(18).text("ANTAREJA SEASON 4", PAGE_MARGIN_X, y, {
      width: contentW,
      align: "center",
    });
    y += 26;
    doc.fontSize(9.5).text("FORMULIR REGISTRASI PESERTA", PAGE_MARGIN_X, y, {
      width: contentW,
      align: "center",
    });
    y += 32;

    const fields: [string, string][] = [
      ["Asal Sekolah", tim.asal_sekolah],
      ["Jumlah Tim", `1 Tim (${pasukan.length} Anggota + 1 Danton)`],
      ["Nama Pelatih", tim.pelatih],
      ["Nama Official", official?.nama ?? "-"],
    ];
    for (const [label, value] of fields) {
      doc.font("Helvetica-Bold").fontSize(10.5).text(label, 85, y, { width: 90 });
      doc.text(":", 178, y);
      doc.font("Helvetica").text(value, 190, y, { width: contentW - 150 });
      y += 17;
    }
    y += 10;

    doc.font("Helvetica-Bold").fontSize(11).text("Dokumen Foto Pelatih, Official, Danton dan Pasukan", PAGE_MARGIN_X, y, {
      width: contentW,
      align: "center",
    });
    y += 20;
    doc.moveTo(PAGE_MARGIN_X + 20, y).lineTo(PAGE_MARGIN_X + contentW - 20, y).lineWidth(0.5).strokeColor("#888888").stroke();
    y += 14;

    const drawBox = (x: number, top: number, foto: Buffer | null, nama: string, label?: string) => {
      if (foto) {
        try {
          doc.image(foto, x, top, { width: BOX_W, height: BOX_H });
        } catch {
          // Foto korup: kotak kosong tetap tercetak supaya bisa ditempel manual.
        }
      }
      doc.lineWidth(0.8).strokeColor("#000000").rect(x, top, BOX_W, BOX_H).stroke();

      // Nama lengkap di bawah foto, boleh 2 baris (nama panjang tidak dipotong).
      const capX = x - 25;
      const capW = BOX_W + 50;
      const nameY = top + BOX_H + 5;
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#000000");
      const nameH = Math.min(doc.heightOfString(nama, { width: capW }), 22);
      doc.text(nama, capX, nameY, { width: capW, height: 22, align: "center", ellipsis: true });
      if (label) {
        doc.font("Helvetica").fontSize(7.5).fillColor("#555555");
        doc.text(label, capX, nameY + nameH + 1, { width: capW, height: 10, align: "center", lineBreak: false });
      }
    };

    // Halaman 1: Danton di tengah diapit Pelatih & Official, lalu satu baris
    // pasukan pertama (susunan sama seperti template).
    drawBox(colX(0), y, fotoPelatih, tim.pelatih, "Pelatih");
    drawBox(colX(1), y, fotoDanton, danton?.nama ?? "-", "Danton");
    drawBox(colX(2), y, fotoOfficial, official?.nama ?? "-", "Official");
    y += ROW_PITCH + 12; // nama Danton bisa 2 baris + label, butuh ruang ekstra

    const rows: number[][] = [];
    for (let i = 0; i < pasukan.length; i += 3) {
      rows.push([i, i + 1, i + 2].filter((n) => n < pasukan.length));
    }
    rows.forEach((row, rowIdx) => {
      if (rowIdx === 1) {
        doc.addPage();
        y = 50;
      }
      row.forEach((n, col) => drawBox(colX(col), y, fotoPasukan[n], pasukan[n].nama));
      y += ROW_PITCH;
    });

    // Blok tanda tangan Pelatih & Official.
    if (y + 110 > doc.page.height - 30) {
      doc.addPage();
      y = 50;
    }
    y += 10;
    const sigW = 190;
    const leftX = PAGE_MARGIN_X + 20;
    const rightX = PAGE_MARGIN_X + contentW - 20 - sigW;
    doc.font("Helvetica-Bold").fontSize(10);
    doc.text("Pelatih", leftX, y, { width: sigW, align: "center" });
    doc.text("Official", rightX, y, { width: sigW, align: "center" });
    y += 62;
    doc.font("Helvetica");
    doc.text(`( ${tim.pelatih} )`, leftX, y, { width: sigW, align: "center" });
    doc.text(`( ${official?.nama ?? "..................."} )`, rightX, y, { width: sigW, align: "center" });

    doc.font("Helvetica-Oblique").fontSize(7.5).fillColor("#666666").text(
      `Dicetak otomatis dari sistem pendaftaran Antareja pada ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}.`,
      PAGE_MARGIN_X,
      doc.page.height - 28,
      { width: contentW, height: 10, lineBreak: false }
    );

    doc.end();
  });
}
