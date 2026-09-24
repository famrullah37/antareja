import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/next-auth";

// Gagal mencatat log TIDAK BOLEH menggagalkan aksi utama yang sedang
// berjalan (verifikasi pembayaran, dst) — sama seperti pola email non-fatal
// di tempat lain (mis. verifikasiFoto di Galeri.ts).
async function tulisLog(data: {
  userId: string | null;
  userNama: string;
  userRole: string;
  aksi: string;
  detail?: string;
}) {
  try {
    await prisma.activityLog.create({ data: { ...data, detail: data.detail ?? null } });
  } catch (e) {
    console.error("Gagal mencatat log aktivitas:", e);
  }
}

// Dipakai di dalam server action yang sudah lewat requireAdmin/dst — ambil
// identitas dari sesi yang sedang login, jadi pemanggil cukup kasih aksi &
// detailnya saja.
export async function catatLog(aksi: string, detail?: string) {
  const session = await getServerSession();
  if (!session?.user?.id) return; // tidak ada sesi (mis. dipanggil dari webhook) — jangan dipaksakan
  await tulisLog({
    userId: session.user.id,
    userNama: session.user.nama,
    userRole: session.user.role,
    aksi,
    detail,
  });
}

// Dipakai khusus dari authorize() next-auth, sebelum session/jwt callback
// terbentuk — identitas user dikirim langsung, bukan diambil dari sesi.
export async function catatLogLogin(user: { id: string; nama: string; role: string }) {
  await tulisLog({
    userId: user.id,
    userNama: user.nama,
    userRole: user.role,
    aksi: "LOGIN",
  });
}
