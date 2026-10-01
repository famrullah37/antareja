import { readUploadFile } from "@/lib/localUpload";
import { DOKUMEN_EXT, isDokumenKey, type DokumenPeserta } from "@/lib/dokumenPeserta";
import { getKonfigUmum } from "@/queries/konfigUmum.query";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { key: string } }) {
  if (!isDokumenKey(params.key)) return new Response("Tidak ditemukan", { status: 404 });

  const konfig = await getKonfigUmum();
  const info = ((konfig.dokumenPeserta ?? {}) as DokumenPeserta)[params.key];
  const file = info ? await readUploadFile(info.file) : null;
  if (!info || !file) return new Response("Dokumen belum tersedia", { status: 404 });

  const ext = info.file.split(".").pop() as keyof typeof DOKUMEN_EXT;
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": DOKUMEN_EXT[ext] ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(info.nama)}`,
      // URL diberi ?v=<waktu upload>, jadi tiap upload baru melewati cache browser.
      "Cache-Control": "public, max-age=300",
    },
  });
}
