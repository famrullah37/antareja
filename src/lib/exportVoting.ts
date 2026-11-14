import * as XLSX from "xlsx";
import type { KategoriVoting } from "@/queries/voting.query";

type TimVoting = {
  id: string;
  nama_tim: string;
  asal_sekolah: string;
  jenjang: string;
  noUrut: number | null;
  pelatih: string | null;
  totalVote: number;
};

type TransaksiVotingExport = {
  id: string;
  timId: string;
  nama: string;
  email: string;
  noHp: string;
  kategori: string;
  jumlahVote: number;
  hargaSatuan: number;
  kodeUnik: string;
  totalBayar: number;
  status: string;
  bukti: string | null;
  catatanAdmin: string | null;
  createdAt: Date;
  tim: { nama_tim: string; asal_sekolah: string; jenjang: string } | null;
};

const STATUS_LABEL: Record<string, string> = {
  VERIFIED: "Terverifikasi",
  PENDING: "Menunggu verifikasi",
  REJECTED: "Ditolak",
};

function sheet(rows: Record<string, string | number>[]) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const headers = Object.keys(rows[0] ?? {});
  ws["!cols"] = headers.map((h) => ({
    wch: Math.min(45, Math.max(h.length, ...rows.map((r) => String(r[h] ?? "").length)) + 2),
  }));
  return ws;
}

function waktuWib(d: Date) {
  return new Date(d).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "short", timeStyle: "medium" });
}

// Export voting detail: ringkasan, rekap per sekolah, rekap per tim tiap kategori (suara
// terverifikasi/pending/ditolak + rupiah), dan seluruh transaksi.
// "Tercatat di Leaderboard" = Tim.totalVote (tim_favorit) / VotingTally —
// harus sama dengan "Suara Masuk"; kalau beda berarti ada selisih data.
export function buildVotingWorkbook(
  tims: TimVoting[],
  transaksis: TransaksiVotingExport[],
  kategoriAktif: KategoriVoting[],
  tallyMap: Record<string, Record<string, number>>,
  dantonMap: Record<string, string>
): string {
  // Kategori yang sudah dihapus/diganti key-nya di pengaturan tetap ikut
  // direkap kalau masih punya transaksi/tally — supaya tidak ada suara hilang.
  const kategoriList = [...kategoriAktif];
  const keyLain = new Set([
    ...transaksis.map((t) => t.kategori),
    ...Object.values(tallyMap).flatMap((m) => Object.keys(m)),
  ]);
  for (const key of keyLain) {
    if (!kategoriList.some((k) => k.key === key)) {
      kategoriList.push({ key, label: `${key} (kategori lama)`, unit: "TIM" });
    }
  }
  const labelKategori = (key: string) => kategoriList.find((k) => k.key === key)?.label ?? key;
  const wb = XLSX.utils.book_new();

  // ── Ringkasan ──
  const sum = (list: TransaksiVotingExport[], f: (t: TransaksiVotingExport) => number) =>
    list.reduce((a, t) => a + f(t), 0);
  const verified = transaksis.filter((t) => t.status === "VERIFIED");
  const ringkasan = kategoriList.map((k) => {
    const list = transaksis.filter((t) => t.kategori === k.key);
    const v = list.filter((t) => t.status === "VERIFIED");
    return {
      Kategori: k.label,
      "Suara Masuk (Terverifikasi)": sum(v, (t) => t.jumlahVote),
      "Suara Pending": sum(list.filter((t) => t.status === "PENDING"), (t) => t.jumlahVote),
      "Suara Ditolak": sum(list.filter((t) => t.status === "REJECTED"), (t) => t.jumlahVote),
      "Jumlah Transaksi": list.length,
      "Transaksi Terverifikasi": v.length,
      "Total Rupiah Terverifikasi": sum(v, (t) => t.totalBayar),
    };
  });
  ringkasan.push({
    Kategori: "TOTAL",
    "Suara Masuk (Terverifikasi)": sum(verified, (t) => t.jumlahVote),
    "Suara Pending": sum(transaksis.filter((t) => t.status === "PENDING"), (t) => t.jumlahVote),
    "Suara Ditolak": sum(transaksis.filter((t) => t.status === "REJECTED"), (t) => t.jumlahVote),
    "Jumlah Transaksi": transaksis.length,
    "Transaksi Terverifikasi": verified.length,
    "Total Rupiah Terverifikasi": sum(verified, (t) => t.totalBayar),
  });
  XLSX.utils.book_append_sheet(wb, sheet(ringkasan), "Ringkasan");

  // ── Rekap per sekolah (nama sekolah digabung tanpa beda huruf besar/spasi) ──
  const sekolahMap = new Map<string, { sekolah: string; jenjang: string; timIds: Set<string>; list: TransaksiVotingExport[] }>();
  const keySekolah = (nama: string, jenjang: string) => `${jenjang}|${nama.trim().replace(/\s+/g, " ").toLowerCase()}`;
  const ambilSekolah = (nama: string, jenjang: string) => {
    const key = keySekolah(nama, jenjang);
    let g = sekolahMap.get(key);
    if (!g) sekolahMap.set(key, (g = { sekolah: nama.trim(), jenjang, timIds: new Set(), list: [] }));
    return g;
  };
  for (const t of tims) ambilSekolah(t.asal_sekolah, t.jenjang).timIds.add(t.id);
  for (const t of transaksis) {
    const g = ambilSekolah(t.tim?.asal_sekolah ?? "-", t.tim?.jenjang ?? "");
    g.timIds.add(t.timId);
    g.list.push(t);
  }
  const sekolahRows = [...sekolahMap.values()]
    .map((g) => {
      const v = g.list.filter((t) => t.status === "VERIFIED");
      const row: Record<string, string | number> = {
        "Asal Sekolah": g.sekolah,
        Jenjang: g.jenjang,
        "Jumlah Tim": g.timIds.size,
      };
      for (const k of kategoriList) {
        row[`Suara ${k.label}`] = sum(v.filter((t) => t.kategori === k.key), (t) => t.jumlahVote);
      }
      row["Total Suara Masuk"] = sum(v, (t) => t.jumlahVote);
      row["Suara Pending"] = sum(g.list.filter((t) => t.status === "PENDING"), (t) => t.jumlahVote);
      row["Jumlah Pendukung (Transaksi Terverifikasi)"] = v.length;
      row["Total Rupiah Terverifikasi"] = sum(v, (t) => t.totalBayar);
      return row;
    })
    .sort((a, b) => Number(b["Total Suara Masuk"]) - Number(a["Total Suara Masuk"]) || String(a["Asal Sekolah"]).localeCompare(String(b["Asal Sekolah"])))
    .map((r, i) => ({ Peringkat: i + 1, ...r }));
  XLSX.utils.book_append_sheet(wb, sheet(sekolahRows.length ? sekolahRows : [{ Info: "Belum ada data" }]), "Rekap per Sekolah");

  // ── Rekap per tim, satu sheet per kategori ──
  const timIds = new Set([...tims.map((t) => t.id), ...transaksis.map((t) => t.timId)]);
  const timById = new Map(tims.map((t) => [t.id, t]));
  const usedNames = new Set<string>(["Ringkasan", "Transaksi", "Rekap per Sekolah"]);

  for (const k of kategoriList) {
    const rows = [...timIds]
      .map((id) => {
        const tim = timById.get(id);
        const trx = transaksis.find((t) => t.timId === id)?.tim;
        const list = transaksis.filter((t) => t.timId === id && t.kategori === k.key);
        const v = list.filter((t) => t.status === "VERIFIED");
        const tercatat = k.key === "tim_favorit" ? tim?.totalVote ?? 0 : tallyMap[id]?.[k.key] ?? 0;
        const row: Record<string, string | number> = {
          "No. Urut": tim?.noUrut ?? "",
          "Nama Tim": tim?.nama_tim ?? trx?.nama_tim ?? "",
          "Asal Sekolah": tim?.asal_sekolah ?? trx?.asal_sekolah ?? "",
          Jenjang: tim?.jenjang ?? trx?.jenjang ?? "",
        };
        if (k.unit === "PELATIH") row["Nama Pelatih"] = tim?.pelatih ?? "";
        if (k.unit === "DANTON") row["Nama Danton"] = dantonMap[id] ?? "";
        return {
          ...row,
          "Suara Masuk": sum(v, (t) => t.jumlahVote),
          "Suara Pending": sum(list.filter((t) => t.status === "PENDING"), (t) => t.jumlahVote),
          "Suara Ditolak": sum(list.filter((t) => t.status === "REJECTED"), (t) => t.jumlahVote),
          "Jumlah Pendukung (Transaksi Terverifikasi)": v.length,
          "Total Rupiah Terverifikasi": sum(v, (t) => t.totalBayar),
          "Tercatat di Leaderboard": tercatat,
        } as Record<string, string | number>;
      })
      .sort((a, b) => Number(b["Suara Masuk"]) - Number(a["Suara Masuk"]) || String(a["Nama Tim"]).localeCompare(String(b["Nama Tim"])));

    const ranked = rows.map((r, i) => ({ Peringkat: i + 1, ...r }));
    let name = `Rekap ${k.label}`.replace(/[\\/?*[\]:]/g, "").slice(0, 31);
    for (let n = 2; usedNames.has(name); n++) name = `${name.slice(0, 28)} ${n}`;
    usedNames.add(name);
    XLSX.utils.book_append_sheet(wb, sheet(ranked.length ? ranked : [{ Info: "Belum ada tim" }]), name);
  }

  // ── Semua transaksi ──
  const trxRows = transaksis.map((t, i) => ({
    No: i + 1,
    Waktu: waktuWib(t.createdAt),
    Status: STATUS_LABEL[t.status] ?? t.status,
    Kategori: labelKategori(t.kategori),
    "Nama Tim": t.tim?.nama_tim ?? "",
    "Asal Sekolah": t.tim?.asal_sekolah ?? "",
    Jenjang: t.tim?.jenjang ?? "",
    "Nama Pendukung": t.nama,
    Email: t.email,
    "No. HP": t.noHp,
    "Jumlah Vote": t.jumlahVote,
    "Harga Satuan": t.hargaSatuan,
    "Kode Unik": t.kodeUnik,
    "Total Bayar": t.totalBayar,
    "Link Bukti": t.bukti ?? "",
    "Catatan Admin": t.catatanAdmin ?? "",
    "ID Transaksi": t.id,
  }));
  XLSX.utils.book_append_sheet(wb, sheet(trxRows.length ? trxRows : [{ Info: "Belum ada transaksi" }]), "Transaksi");

  return XLSX.write(wb, { type: "base64", bookType: "xlsx" }) as string;
}
