import sharp from "sharp";

// Versi watermark saat ini. Naikkan angka ini setiap gaya watermark diubah —
// foto dengan Foto.watermarkVersi lebih kecil akan ditawarkan untuk diproses
// ulang di panel "Perbarui watermark" (lihat buatWatermarkFotoLama).
export const VERSI_WATERMARK = 2;

// Lebar maksimum preview watermark. Preview resolusi penuh lebih mudah
// "dibersihkan" watermark-nya; untuk dilihat di galeri 1600px sudah cukup.
const MAKS_PREVIEW = 1600;

// Watermark preview galeri foto berbayar: teks "ANTAREJA" diagonal berulang
// (tebal, rapat) + pita gelap di tengah — foto tetap bisa dinilai pembeli
// tapi tidak layak dipakai tanpa membeli versi asli.
export async function addWatermark(buffer: Buffer): Promise<Buffer> {
  try {
    // Putar sesuai EXIF & kecilkan dulu, baru ukur — overlay harus pas ukuran akhir.
    const dasar = await sharp(buffer)
      .rotate()
      .resize({ width: MAKS_PREVIEW, height: MAKS_PREVIEW, fit: "inside", withoutEnlargement: true })
      .toBuffer();
    const image = sharp(dasar);
    const metadata = await image.metadata();
    const width = metadata.width ?? 1200;
    const height = metadata.height ?? 800;

    // Grid teks MENDATAR yang kemudian diputar sekaligus -30° di tengah foto —
    // jarak antar-kata terjaga, tidak saling menimpa (memutar tiap kata sendiri-
    // sendiri membuat kata dari baris sebelah menyilang & tidak terbaca).
    const sisiPendek = Math.min(width, height);
    const fontSize = Math.max(22, Math.round(sisiPendek / 11));
    const lebarKata = fontSize * 6.4; // perkiraan lebar "ANTAREJA" tebal
    const stepX = Math.round(lebarKata * 1.2);
    const stepY = Math.round(fontSize * 2.1);
    const stroke = Math.max(1.5, fontSize / 16);

    // Grid dibuat seluas diagonal foto supaya setelah diputar sudut tetap tertutup.
    const diag = Math.ceil(Math.hypot(width, height));
    const cx = width / 2;
    const cy = height / 2;
    const texts: string[] = [];
    let row = 0;
    for (let y = cy - diag / 2; y < cy + diag / 2; y += stepY) {
      const geser = row % 2 === 0 ? 0 : stepX / 2;
      for (let x = cx - diag / 2 - stepX + geser; x < cx + diag / 2 + stepX; x += stepX) {
        texts.push(`<text x="${Math.round(x)}" y="${Math.round(y)}" text-anchor="middle">ANTAREJA</text>`);
      }
      row++;
    }

    // Pita tengah: blok gelap transparan selebar foto + teks besar.
    const pitaTinggi = Math.round(Math.min(height, width) * 0.16);
    const pitaY = Math.round(height / 2 - pitaTinggi / 2);
    const pitaFont = Math.round(pitaTinggi * 0.5);

    const svgOverlay = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <style>
          .ulang {
            font-family: Helvetica, Arial, sans-serif;
            font-weight: 900;
            font-size: ${fontSize}px;
            fill: rgba(255,255,255,0.5);
            stroke: rgba(0,0,0,0.38);
            stroke-width: ${stroke};
          }
          .pita {
            font-family: Helvetica, Arial, sans-serif;
            font-weight: 900;
            font-size: ${pitaFont}px;
            fill: rgba(255,255,255,0.85);
            letter-spacing: ${Math.round(pitaFont / 6)}px;
          }
        </style>
        <g class="ulang" transform="rotate(-30 ${cx} ${cy})">${texts.join("")}</g>
        <rect x="0" y="${pitaY}" width="${width}" height="${pitaTinggi}" fill="rgba(0,0,0,0.42)" />
        <text class="pita" x="${width / 2}" y="${pitaY + pitaTinggi / 2}" text-anchor="middle" dominant-baseline="central">ANTAREJA · PREVIEW</text>
      </svg>
    `;

    return await image
      .composite([{ input: Buffer.from(svgOverlay), blend: "over" }])
      .jpeg({ quality: 80 })
      .toBuffer();
  } catch (e) {
    console.error("Gagal menambah watermark, pakai foto asli sebagai fallback:", e);
    return buffer;
  }
}
