"use client";

import { batalGugurTim, tandaiGugurTim } from "@/actions/StatusTim";
import { JENIS_GUGUR, labelGugur, type JenisGugur } from "@/lib/gugurTim";
import { useRouter } from "next-nprogress-bar";
import { useState } from "react";
import { toast } from "sonner";

export type DataGugur = {
  gugurAt: string | null;
  gugurJenis: string | null;
  gugurAlasan: string | null;
  gugurOleh: string | null;
  gugurTanpaVote: boolean;
};

const tglWIB = (iso: string) =>
  new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });

// Kotak status gugur di menu Tim & Presensi DP. `jenisTersedia` membatasi pilihan
// (mis. tim yang sudah presensi tidak bisa ditandai "Tidak hadir").
export default function StatusGugurTim({
  timId,
  namaTim,
  confirmed,
  data,
  sudahPresensi,
  nilaiDipublish,
}: {
  timId: string;
  namaTim: string;
  confirmed: boolean;
  data: DataGugur;
  sudahPresensi: boolean;
  nilaiDipublish: boolean;
}) {
  const router = useRouter();
  const [buka, setBuka] = useState(false);
  const [jenis, setJenis] = useState<JenisGugur>(sudahPresensi ? "MUNDUR" : "TIDAK_HADIR");
  const [alasan, setAlasan] = useState("");
  const [sibuk, setSibuk] = useState(false);

  if (!confirmed) return null;

  async function jalankan(aksi: () => Promise<{ success: boolean; message?: string }>, sukses: string) {
    setSibuk(true);
    const r = await aksi().catch(() => ({ success: false, message: "Koneksi terputus, coba lagi" }));
    setSibuk(false);
    if (r.success) {
      toast.success(sukses);
      setBuka(false);
      setAlasan("");
      router.refresh();
    } else toast.error(r.message ?? "Gagal");
  }

  if (data.gugurAt) {
    return (
      <div className="rounded-2xl border-2 border-red-300 bg-red-50 p-4 flex flex-wrap items-start gap-3">
        <div className="flex-1 min-w-[220px] text-sm text-red-900">
          <div className="font-bold text-base">{labelGugur(data.gugurJenis)}</div>
          <div>
            Ditandai {tglWIB(data.gugurAt)}
            {data.gugurOleh ? ` oleh ${data.gugurOleh}` : ""}
            {data.gugurAlasan ? ` — ${data.gugurAlasan}` : ""}
          </div>
          <div className="mt-1 text-red-800">
            Tidak dinilai juri, tidak ikut rekap & juara, sertifikat tidak diterbitkan.{" "}
            {data.gugurTanpaVote
              ? "Keluar dari voting (mundur sebelum voting dibuka, tanpa vote)."
              : "Tetap tampil di voting."}
          </div>
        </div>
        <button
          type="button"
          disabled={sibuk}
          onClick={() => {
            if (confirm(`Batalkan status "${labelGugur(data.gugurJenis)}" untuk ${namaTim}? Tim kembali ikut lomba.`))
              jalankan(() => batalGugurTim(timId), "Status dibatalkan — tim kembali ikut lomba");
          }}
          className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
        >
          Batalkan status
        </button>
      </div>
    );
  }

  if (!buka) {
    return (
      <button
        type="button"
        onClick={() => setBuka(true)}
        className="self-start rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
      >
        Tandai mundur / tidak hadir
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-red-200 bg-white p-4 flex flex-col gap-3 text-sm">
      <div className="font-semibold">Tandai {namaTim} tidak ikut lomba</div>
      {nilaiDipublish && (
        <p className="text-amber-700">Nilai tim ini sudah dipublish — sembunyikan dulu di Konfigurasi Penilaian.</p>
      )}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(JENIS_GUGUR) as JenisGugur[]).map((j) => {
          const terlarang = j === "TIDAK_HADIR" && sudahPresensi;
          return (
            <label
              key={j}
              className={`flex items-center gap-2 rounded-lg border-2 px-3 py-2 ${
                jenis === j ? "border-red-500 bg-red-50" : "border-neutral-200"
              } ${terlarang ? "opacity-50" : "cursor-pointer"}`}
            >
              <input
                type="radio"
                name={`gugur-${timId}`}
                checked={jenis === j}
                disabled={terlarang}
                onChange={() => setJenis(j)}
              />
              {JENIS_GUGUR[j]}
            </label>
          );
        })}
      </div>
      <p className="text-xs text-gray-500">
        {jenis === "MUNDUR"
          ? "Mundur sebelum voting dibuka & belum punya vote → tim keluar dari voting. Bila voting sudah berjalan, tim tetap tampil di voting."
          : "Tidak hadir / tidak registrasi ulang di hari H — tim tetap tampil di voting."}
        {sudahPresensi && " Tim sudah tercatat hadir di DP, jadi hanya bisa ditandai mengundurkan diri."}
      </p>
      <input
        value={alasan}
        onChange={(e) => setAlasan(e.target.value)}
        maxLength={200}
        placeholder="Alasan / keterangan (opsional), mis. surat pengunduran diri 10 Nov"
        className="border border-neutral-300 rounded-lg px-3 py-2"
      />
      <div className="flex gap-2">
        <button
          type="button"
          disabled={sibuk || nilaiDipublish}
          onClick={() => {
            if (
              confirm(
                `Tandai ${namaTim} "${JENIS_GUGUR[jenis]}"?\n\nTim tidak akan dinilai, tidak ikut rekap & juara, dan sertifikat tidak diterbitkan. Nilai yang sudah ada tetap tersimpan dan kembali dihitung bila status dibatalkan.`
              )
            )
              jalankan(() => tandaiGugurTim(timId, jenis, alasan), `${namaTim} ditandai ${JENIS_GUGUR[jenis].toLowerCase()}`);
          }}
          className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-50"
        >
          Simpan
        </button>
        <button
          type="button"
          onClick={() => setBuka(false)}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-gray-600 hover:bg-neutral-50"
        >
          Batal
        </button>
      </div>
    </div>
  );
}
