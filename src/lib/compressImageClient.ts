// Kompres foto DI BROWSER sebelum dikirim ke server action. Foto kamera HP
// 5-10MB yang dikirim apa adanya butuh puluhan detik di koneksi lambat (dan
// bisa diputus di tengah jalan: "Error: aborted" di log server). Ukuran &
// kualitas sama dengan compressPhoto di server, jadi hasil akhirnya tidak
// berubah — hanya yang dikirim lewat jaringan jadi ~200-400KB.
const MAX_SISI = 1200;
const KUALITAS = 0.8;

export async function compressImageFile(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    // imageOrientation "from-image": ikuti rotasi EXIF supaya foto HP tidak miring.
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const skala = Math.min(1, MAX_SISI / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * skala);
    canvas.height = Math.round(bitmap.height * skala);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    // Latar putih: PNG transparan jadi JPEG tidak berubah hitam.
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", KUALITAS)
    );
    // Format yang tidak bisa dibaca browser (mis. HEIC di Chrome) atau hasil
    // yang malah lebih besar: kirim file asli, server tetap mengompresnya.
    if (!blob || blob.size >= file.size) return file;
    const nama = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], nama, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

// Ganti field file di FormData dengan versi terkompres (kalau ada isinya).
export async function compressFormDataImage(data: FormData, field: string) {
  const file = data.get(field);
  if (!(file instanceof File) || file.size === 0) return;
  data.set(field, await compressImageFile(file));
}
