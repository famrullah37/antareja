"use client";

import { hitungUlangSemuaNilai, publishNilaiBaru, publishNilaiJenjang } from "@/actions/PenilaianBaru";
import { useState } from "react";
import { toast } from "sonner";
import { bandingkanRanking, labelSeri, nilaiPenentuSeri, statusSeri } from "@/lib/rankingNilai";

// Dijalankan panitia sebelum mengumumkan juara — memastikan total tiap tim sesuai
// nilai juri & pelanggaran yang tersimpan.
function TombolHitungUlang() {
  const [proses, setProses] = useState(false);
  async function jalankan() {
    setProses(true);
    const toastId = toast.loading("Menghitung ulang nilai semua tim...");
    const r = await hitungUlangSemuaNilai();
    setProses(false);
    if (!r.success) {
      toast.error("Gagal menghitung ulang", { id: toastId });
      return;
    }
    if (r.berubah.length === 0) {
      toast.success(`Semua ${r.total} nilai tim sudah sesuai`, { id: toastId });
    } else {
      toast.warning(`${r.berubah.length} nilai tim diperbaiki: ${r.berubah.join("; ")}`, {
        id: toastId,
        duration: 15000,
      });
    }
  }
  return (
    <button
      onClick={jalankan}
      disabled={proses}
      className="px-3 py-1.5 rounded-lg border border-neutral-300 text-sm hover:bg-neutral-50 disabled:opacity-50"
      title="Hitung ulang total semua tim dari nilai juri & pelanggaran yang tersimpan"
    >
      {proses ? "Menghitung..." : "Hitung ulang semua nilai"}
    </button>
  );
}

type NilaiJuriItem = {
  nilaiDipilih: number;
  predikat: string;
  subKategori: { kategori: string; kode: string };
  juri: { nama: string };
};

type PelanggaranTimItem = {
  id: string;
  jumlahKejadian: number;
  totalPengurang: number;
  pelanggaran: { kode: string; nama: string; kategori: string };
};

type PenilaianBaruItem = {
  id: string;
  timId: string;
  nilaiKotor: number;
  totalPengurang: number;
  nilaiAkhir: number;
  published: boolean;
  status: string;
  tim: { nama_tim: string; asal_sekolah: string; jenjang: string };
  nilaiJuri: NilaiJuriItem[];
  pelanggaranTim: PelanggaranTimItem[];
};

type KategoriLomba = { id: string; nama: string };

const JENJANG_ORDER = ["SD", "SMP", "SMA", "PURNA"];

type Kelengkapan = { kosong: number; diharapkan: number; detail: string };

export default function RankingSection({
  penilaians,
  kategoris,
  kelengkapan,
  timBelumDinilai,
}: {
  penilaians: PenilaianBaruItem[];
  kategoris: KategoriLomba[];
  // Per timId: jumlah nilai juri yang belum diisi (kosong ≠ 0) — lib/kelengkapanNilai.ts.
  kelengkapan: Record<string, Kelengkapan>;
  timBelumDinilai: { timId: string; jenjang: string; label: string }[];
}) {
  const belumLengkap = penilaians.filter((p) => (kelengkapan[p.timId]?.kosong ?? 0) > 0);

  // Publish/sembunyikan semua tim satu jenjang sekaligus (momen pengumuman).
  async function handlePublishJenjang(jenjang: string, publish: boolean, daftar: (PenilaianBaruItem & { nilaiPBB: number })[]) {
    if (publish) {
      const kosong = daftar.filter((p) => (kelengkapan[p.timId]?.kosong ?? 0) > 0);
      const belumDinilai = timBelumDinilai.filter((t) => t.jenjang === jenjang);
      const adaSeri = daftar.some((_, i) => statusSeri(daftar, i).seri);
      const peringatan = [
        kosong.length ? `• ${kosong.length} tim nilainya masih ada yang KOSONG` : "",
        belumDinilai.length ? `• ${belumDinilai.length} tim belum dinilai sama sekali (tidak ikut dipublish)` : "",
        adaSeri ? "• Ada tim SERI (nilai akhir & PBB sama) yang perlu diputuskan panitia" : "",
      ].filter(Boolean);
      const pesan =
        `Publish nilai SEMUA ${daftar.length} tim jenjang ${jenjang}? Semua tim langsung bisa melihat hasilnya di dashboard.` +
        (peringatan.length ? `\n\nPERHATIAN:\n${peringatan.join("\n")}` : "\n\nSemua nilai lengkap.") +
        `\n\nSarannya: klik "Hitung ulang semua nilai" dulu sebelum publish.`;
      if (!confirm(pesan)) return;
    } else if (!confirm(`Sembunyikan nilai semua tim jenjang ${jenjang}? Tim tidak lagi bisa melihat hasilnya.`)) {
      return;
    }
    const toastId = toast.loading(publish ? `Mempublish nilai ${jenjang}...` : `Menyembunyikan nilai ${jenjang}...`);
    const r = await publishNilaiJenjang(jenjang, publish);
    if (r.success)
      toast.success(`${r.count} tim ${jenjang} ${publish ? "dipublish" : "disembunyikan"}`, { id: toastId });
    else toast.error("Gagal", { id: toastId });
  }

  async function handlePublish(id: string, current: boolean) {
    const p = penilaians.find((x) => x.id === id);
    const k = p ? kelengkapan[p.timId] : undefined;
    if (
      !current &&
      k &&
      k.kosong > 0 &&
      !confirm(
        `Nilai ${p!.tim.nama_tim} BELUM LENGKAP: ${k.kosong} nilai juri masih kosong (${k.detail}).\n\nNilai kosong dihitung 0. Tetap publish?`
      )
    )
      return;
    const toastId = toast.loading(current ? "Menyembunyikan..." : "Mempublish...");
    const result = await publishNilaiBaru(id, !current);
    if (result.success)
      toast.success(current ? "Nilai disembunyikan" : "Nilai dipublish!", { id: toastId });
    else toast.error("Gagal", { id: toastId });
  }

  // Kolom kategori lomba: dari master, ditambah kategori yang muncul di data
  // tapi belum/tidak ada di master (jaga-jaga kategori lama yang sudah dihapus).
  const kategoriNama = Array.from(
    new Set([
      ...kategoris.map((k) => k.nama),
      ...penilaians.flatMap((p) => p.nilaiJuri.map((n) => n.subKategori.kategori)),
    ])
  );

  function nilaiKategori(p: PenilaianBaruItem, kategori: string) {
    return p.nilaiJuri
      .filter((n) => n.subKategori.kategori === kategori)
      .reduce((sum, n) => sum + n.nilaiDipilih, 0);
  }

  // Peringatan nilai kosong — ditampilkan di atas tabel (juga saat belum ada penilaian sama sekali).
  const peringatan = (belumLengkap.length > 0 || timBelumDinilai.length > 0) && (
    <div className="bg-amber-50 border border-amber-300 text-amber-900 rounded-xl p-4 text-sm mb-4 flex flex-col gap-2">
      <p className="font-semibold">
        ⚠ Ada nilai yang masih KOSONG — dihitung 0 di total. Lengkapi sebelum menentukan juara. (Nilai 0 yang
        sengaja diberikan juri karena peserta tidak melakukan perintah tidak termasuk di sini.)
      </p>
      {belumLengkap.length > 0 && (
        <div>
          <p className="font-medium">Nilai belum lengkap ({belumLengkap.length} tim):</p>
          <ul className="list-disc ml-5">
            {belumLengkap.map((p) => (
              <li key={p.id}>
                {p.tim.jenjang} · {p.tim.nama_tim} — {kelengkapan[p.timId].detail}
              </li>
            ))}
          </ul>
        </div>
      )}
      {timBelumDinilai.length > 0 && (
        <div>
          <p className="font-medium">Belum dinilai sama sekali ({timBelumDinilai.length} tim, tidak masuk tabel):</p>
          <ul className="list-disc ml-5">
            {timBelumDinilai.map((t) => (
              <li key={t.timId}>{t.label}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  if (penilaians.length === 0) {
    return (
      <section>
        <h2 className="text-xl font-semibold mb-3">Rekap Nilai</h2>
        {peringatan}
        <p className="text-gray-400 text-sm">Belum ada data penilaian.</p>
      </section>
    );
  }

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 className="text-xl font-semibold">Rekap Nilai</h2>
        <TombolHitungUlang />
      </div>
      {peringatan}
      {JENJANG_ORDER.map((jenjang) => {
        // Nilai sama → PBB lebih tinggi di atas (juklak), lihat lib/rankingNilai.ts.
        const grouped = penilaians
          .filter((p) => p.tim.jenjang === jenjang)
          .map((p) => ({ ...p, nilaiPBB: nilaiPenentuSeri(p.nilaiJuri) }))
          .sort(bandingkanRanking);

        if (grouped.length === 0) return null;

        return (
          <div key={jenjang} className="mb-6">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h3 className="font-semibold text-base text-neutral-600 mr-auto">
                Jenjang {jenjang}{" "}
                <span className="text-xs font-normal text-gray-400">
                  ({grouped.filter((p) => p.published).length}/{grouped.length} dipublish)
                </span>
              </h3>
              {grouped.some((p) => !p.published) && (
                <button
                  onClick={() => handlePublishJenjang(jenjang, true, grouped)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary-500 text-white hover:bg-primary-600"
                >
                  Publish semua {jenjang}
                </button>
              )}
              {grouped.some((p) => p.published) && (
                <button
                  onClick={() => handlePublishJenjang(jenjang, false, grouped)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-neutral-300 hover:bg-neutral-50"
                >
                  Sembunyikan semua {jenjang}
                </button>
              )}
            </div>
            <div className="overflow-x-auto rounded-xl border border-neutral-200">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-4 py-3 text-left w-10">#</th>
                    <th className="px-4 py-3 text-left">Tim</th>
                    {kategoriNama.map((k) => (
                      <th key={k} className="px-4 py-3 text-right whitespace-nowrap">
                        {k}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right">Nilai Kotor</th>
                    <th className="px-4 py-3 text-right">Pengurang</th>
                    <th className="px-4 py-3 text-right font-bold">Nilai Akhir</th>
                    <th className="px-4 py-3 text-center">Kelengkapan</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Publish</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {grouped.map((p, idx) => (
                    <tr key={p.id} className="bg-white">
                      <td className="px-4 py-3 font-bold text-gray-400">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{p.tim.nama_tim}</div>
                        <div className="text-xs text-gray-400">{p.tim.asal_sekolah}</div>
                        {labelSeri(statusSeri(grouped, idx)) && (
                          <div
                            className={`text-xs mt-0.5 ${statusSeri(grouped, idx).seri ? "text-red-600 font-semibold" : "text-gray-500"}`}
                          >
                            {labelSeri(statusSeri(grouped, idx))}
                          </div>
                        )}
                      </td>
                      {kategoriNama.map((k) => (
                        <td key={k} className="px-4 py-3 text-right">
                          {nilaiKategori(p, k)}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-right">{p.nilaiKotor}</td>
                      <td className="px-4 py-3 text-right text-red-500">
                        -{p.totalPengurang}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-lg">
                        {p.nilaiAkhir}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {(() => {
                          const k = kelengkapan[p.timId];
                          if (!k || k.diharapkan === 0)
                            return <span className="text-xs text-gray-400" title="Belum ada penugasan juri">–</span>;
                          return k.kosong === 0 ? (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              Lengkap
                            </span>
                          ) : (
                            <span
                              className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 whitespace-nowrap"
                              title={k.detail}
                            >
                              {k.kosong} kosong
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            p.status === "FINAL"
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handlePublish(p.id, p.published)}
                          className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                            p.published
                              ? "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                              : "bg-primary-500 text-white hover:bg-primary-600"
                          }`}
                        >
                          {p.published ? "Sembunyikan" : "Publish"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </section>
  );
}
