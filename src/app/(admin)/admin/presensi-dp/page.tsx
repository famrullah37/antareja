export const dynamic = "force-dynamic";

import { H1 } from "@/app/components/global/Text";
import { findTimPresensiDP } from "@/queries/presensiDp.query";
import { kondisiTim, ringkasPresensi } from "@/lib/presensiDp";
import { timSlug } from "@/lib/timSlug";
import DaftarPresensi from "./components/DaftarPresensi";
import { labelGugur } from "@/lib/gugurTim";

export default async function PresensiDPPage() {
  const tims = await findTimPresensiDP();
  const baris = tims.map((t) => {
    const ringkas = ringkasPresensi(t.tipe_tim, new Map(t.anggotas.map((a) => [a.posisi, a.status])));
    return {
      id: t.id,
      slug: timSlug(t),
      nama_tim: t.nama_tim,
      asal_sekolah: t.asal_sekolah,
      jenjang: t.jenjang,
      noUrut: t.noUrut,
      hadirAt: t.presensiDP?.hadirAt.toISOString() ?? null,
      ringkas,
      kondisi: kondisiTim(!!t.presensiDP, ringkas, !!t.gugurAt),
      labelGugur: t.gugurAt ? labelGugur(t.gugurJenis) : null,
    };
  });
  const hadir = baris.filter((b) => b.hadirAt).length;
  const gugur = baris.filter((b) => b.kondisi === "GUGUR").length;
  const sesuai = baris.filter((b) => b.kondisi === "SESUAI").length;

  return (
    <div className="py-6 flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <H1>Presensi Daerah Persiapan</H1>
        <p className="text-sm text-gray-500">
          {hadir} dari {baris.length} tim terkonfirmasi sudah hadir di DP · {sesuai} tim sesuai lengkap
          {gugur > 0 && ` · ${gugur} tim mundur / tidak hadir`}. Buka tim
          yang datang, lalu tandai tiap Danton & pasukan: &quot;Sesuai&quot; (hadir & cocok dengan foto/data) atau
          &quot;Tidak hadir&quot; (anggota itu absen — tim tetap ikut lomba). Tim yang
          tidak datang / tidak registrasi ulang ditandai lewat tombol &quot;Tandai mundur / tidak hadir&quot; di halaman tim
          — tidak pernah otomatis.
        </p>
      </div>
      <DaftarPresensi tims={baris} />
    </div>
  );
}
