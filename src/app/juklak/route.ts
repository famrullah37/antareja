import { readUploadFile } from "@/lib/localUpload";

export const dynamic = "force-dynamic";

export async function GET() {
  const file = await readUploadFile("juklak.pdf");
  if (!file) return new Response("Juklak belum tersedia", { status: 404 });
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="Juklak Antareja.pdf"',
      // Jangan di-cache: kalau halaman masih memegang link ?v= lama (cache
      // router/halaman), browser tetap menyajikan PDF lama. File ini kecil &
      // jarang diunduh, jadi selalu ambil dari disk.
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
