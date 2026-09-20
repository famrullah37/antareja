import sharp from "sharp";

// Watermark preview galeri foto berbayar — sebelumnya pathWatermark cuma
// disalin dari pathAsli (lihat riwayat Galeri.ts), jadi preview publik untuk
// album berbayar sama persis dengan file aslinya (bisa langsung dipakai tanpa
// bayar). Tempel teks "ANTAREJA" berulang secara diagonal supaya foto tetap
// bisa dilihat tapi tidak layak dipakai tanpa beli versi asli.
export async function addWatermark(buffer: Buffer): Promise<Buffer> {
  try {
    const image = sharp(buffer).rotate();
    const metadata = await image.metadata();
    const width = metadata.width ?? 1200;
    const height = metadata.height ?? 800;

    const stepX = Math.max(160, Math.round(width / 4));
    const stepY = Math.max(110, Math.round(height / 6));
    const fontSize = Math.max(20, Math.round(stepX / 6));

    const texts: string[] = [];
    let row = 0;
    // Mulai & selesai di luar kanvas (margin selebar 1 step) supaya sudut foto
    // setelah teks dirotasi tetap ikut kena watermark, bukan cuma bagian tengah.
    for (let y = -stepY; y < height + stepY; y += stepY) {
      const offsetX = row % 2 === 0 ? 0 : stepX / 2;
      for (let x = -stepX; x < width + stepX; x += stepX) {
        const cx = x + offsetX;
        texts.push(
          `<text x="${cx}" y="${y}" transform="rotate(-30 ${cx} ${y})" text-anchor="middle">ANTAREJA</text>`
        );
      }
      row++;
    }

    const svgOverlay = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <style>
          text {
            font-family: Helvetica, Arial, sans-serif;
            font-weight: bold;
            font-size: ${fontSize}px;
            fill: rgba(255,255,255,0.32);
            stroke: rgba(0,0,0,0.22);
            stroke-width: 1;
          }
        </style>
        ${texts.join("\n")}
      </svg>
    `;

    return await image
      .composite([{ input: Buffer.from(svgOverlay), blend: "over" }])
      .jpeg({ quality: 90 })
      .toBuffer();
  } catch (e) {
    console.error("Gagal menambah watermark, pakai foto asli sebagai fallback:", e);
    return buffer;
  }
}
