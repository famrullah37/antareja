import { getServerSession } from "@/lib/next-auth";
import { readUploadFile } from "@/lib/localUpload";
import prisma from "@/lib/prisma";
import { findOrLinkJuriByUser } from "@/queries/juri.query";

export const dynamic = "force-dynamic";

// Memutar masukan suara juri. Yang boleh mendengar: Admin/Sie Lomba, juri
// pemilik rekaman, dan tim yang dinilai — tim hanya setelah nilainya dipublish.
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session?.user) return new Response("Tidak diizinkan", { status: 401 });

  const ms = await prisma.masukanSuara.findUnique({
    where: { id: params.id },
    include: { penilaian: { select: { published: true, tim: { select: { userId: true } } } } },
  });
  if (!ms) return new Response("Tidak ditemukan", { status: 404 });

  const role = session.user.role ?? "";
  let boleh = ["ADMIN", "SIE_LOMBA"].includes(role);
  if (!boleh && role === "JURI") {
    const juri = await findOrLinkJuriByUser(session.user.id);
    boleh = juri?.id === ms.juriId;
  }
  if (!boleh) boleh = ms.penilaian.published && ms.penilaian.tim.userId === session.user.id;
  if (!boleh) return new Response("Tidak ditemukan", { status: 404 });

  const file = await readUploadFile(ms.file);
  if (!file) return new Response("Rekaman tidak ditemukan", { status: 404 });

  const headers = {
    "Content-Type": ms.mime,
    "Accept-Ranges": "bytes",
    // Nama file berubah tiap rekam ulang, tapi isinya privat — jangan dicache proxy.
    "Cache-Control": "private, max-age=300",
  };

  // Safari (iPhone/iPad) hanya mau memutar audio kalau server melayani Range request.
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range") ?? "");
  if (range && (range[1] || range[2])) {
    const size = file.length;
    let start = range[1] ? Number(range[1]) : size - Number(range[2]);
    let end = range[1] && range[2] ? Number(range[2]) : size - 1;
    start = Math.max(0, start);
    end = Math.min(end, size - 1);
    if (start > end) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    return new Response(new Uint8Array(file.subarray(start, end + 1)), {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) },
    });
  }

  return new Response(new Uint8Array(file), { headers: { ...headers, "Content-Length": String(file.length) } });
}
