import { readUploadFile } from "@/lib/localUpload";

export const dynamic = "force-dynamic";

export async function GET() {
  const file = await readUploadFile("juklak.pdf");
  if (!file) return new Response("Juklak belum tersedia", { status: 404 });
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="Juklak Antareja.pdf"',
      // URL di database diberi ?v=<waktu upload>, jadi tiap upload baru
      // otomatis melewati cache browser.
      "Cache-Control": "public, max-age=300",
    },
  });
}
