import * as XLSX from "xlsx";
import { Anggota, Pembayaran, Tim, User } from "@prisma/client";

type TimExport = Tim & { anggotas: Anggota[]; pembayaran: Pembayaran | null; user: Pick<User, "email"> | null };

const POSISI_ORDER = [
  "PELATIH", "OFFICIAL", "DANTON",
  "B1S1", "B1S2", "B1S3", "B2S1", "B2S2", "B2S3", "B3S1", "B3S2", "B3S3",
  "B4S1", "B4S2", "B4S3", "B5S1", "B5S2", "B5S3",
];

const PASUKAN: Record<string, number> = { SMALL: 12, NORMAL: 15 };

function sheet(rows: Record<string, string | number>[]) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const headers = Object.keys(rows[0] ?? {});
  ws["!cols"] = headers.map((h) => ({
    wch: Math.min(40, Math.max(h.length, ...rows.map((r) => String(r[h] ?? "").length)) + 2),
  }));
  return ws;
}

// Data tim & anggota dalam Excel — sengaja TANPA foto (kolom foto/link foto tidak
// diikutkan), untuk diolah panitia (rekap, absensi, dst).
export function buildDataTimWorkbook(tims: TimExport[]): string {
  const timRows = tims.map((t) => {
    const byPosisi = (p: string) => t.anggotas.find((a) => a.posisi === p);
    const total = (PASUKAN[t.tipe_tim] ?? 0) + 3;
    return {
      "No. Urut": t.noUrut ?? "",
      "Nama Tim": t.nama_tim,
      "Asal Sekolah": t.asal_sekolah,
      Jenjang: t.jenjang,
      "Tipe Tim": `${PASUKAN[t.tipe_tim] ?? "?"} Pasukan`,
      "Nama Pelatih": t.pelatih,
      "No. Telp Pelatih": t.no_pelatih,
      "Nama Official": byPosisi("OFFICIAL")?.nama ?? "",
      "Nama Danton": byPosisi("DANTON")?.nama ?? "",
      "Anggota Terisi": `${t.anggotas.length}/${total}`,
      "Status Pembayaran": t.confirmed ? "Terkonfirmasi" : "Belum terkonfirmasi",
      "Jenis Pembayaran": t.pembayaran ? (t.pembayaran.isDP ? "DP 50%" : "Lunas") : "",
      "Kode Unik": t.pembayaran?.kodeUnik ?? "",
      "Total Transfer": t.pembayaran?.totalBayar ?? "",
      "Email Akun": t.user?.email ?? "",
    };
  });

  const anggotaRows = tims.flatMap((t) =>
    [...t.anggotas]
      .sort((a, b) => POSISI_ORDER.indexOf(a.posisi) - POSISI_ORDER.indexOf(b.posisi))
      .map((a) => ({
        "Nama Tim": t.nama_tim,
        "Asal Sekolah": t.asal_sekolah,
        Jenjang: t.jenjang,
        Posisi: a.posisi,
        Nama: a.nama,
        Email: a.email,
        "No. Telp": a.telp,
        NISN: a.nisn ?? "",
        Kelas: a.kelas ?? "",
        "Link Instagram": a.link_ig ?? "",
      }))
  );

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet(timRows.length ? timRows : [{ Info: "Belum ada data tim" }]), "Tim");
  XLSX.utils.book_append_sheet(wb, sheet(anggotaRows.length ? anggotaRows : [{ Info: "Belum ada anggota" }]), "Anggota");
  return XLSX.write(wb, { type: "base64", bookType: "xlsx" }) as string;
}
