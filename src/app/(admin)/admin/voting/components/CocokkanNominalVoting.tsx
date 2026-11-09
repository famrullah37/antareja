"use client";

import { cocokkanNominalVoting, verifikasiVotingMassal, type HasilCocokVoting } from "@/actions/Voting";
import { useState } from "react";
import { toast } from "sonner";

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
}

// Semi-otomatis: admin tempel daftar nominal masuk dari riwayat QRIS (aplikasi
// merchant), sistem cocokkan ke transaksi PENDING yang nominalnya tepat sama
// dan punya bukti, lalu admin verifikasi sekaligus.
export default function CocokkanNominalVoting() {
  const [teks, setTeks] = useState("");
  const [hasil, setHasil] = useState<HasilCocokVoting | null>(null);
  const [dipilih, setDipilih] = useState<Set<string>>(new Set());
  const [proses, setProses] = useState(false);

  async function handleCocokkan() {
    setProses(true);
    const r = await cocokkanNominalVoting(teks);
    setProses(false);
    if (!r.success) {
      toast.error(r.message);
      return;
    }
    setHasil(r.hasil);
    setDipilih(new Set(r.hasil.cocok.map((c) => c.id)));
  }

  async function handleVerifikasi() {
    if (dipilih.size === 0) return;
    if (!window.confirm(`Verifikasi ${dipilih.size} transaksi dukungan sekaligus? Suara langsung dihitung dan email konfirmasi dikirim.`))
      return;
    setProses(true);
    const toastId = toast.loading(`Memverifikasi ${dipilih.size} transaksi...`);
    const r = await verifikasiVotingMassal(Array.from(dipilih));
    setProses(false);
    if (!r.success) {
      toast.error(r.message ?? "Gagal verifikasi", { id: toastId });
      return;
    }
    toast.success(`${r.berhasil} transaksi diverifikasi${r.gagal ? `, ${r.gagal} gagal/sudah diproses` : ""}`, { id: toastId });
    setHasil(null);
    setDipilih(new Set());
    setTeks("");
  }

  function toggle(id: string) {
    setDipilih((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-5 flex flex-col gap-4">
      <div>
        <h3 className="font-semibold text-lg">Cocokkan Nominal Masuk</h3>
        <p className="text-sm text-gray-500">
          Salin nominal dari riwayat QRIS di aplikasi merchant, satu nominal per baris (mis. <code>Rp 10.123</code> atau{" "}
          <code>10123</code>). Transaksi yang <b>ada bukti</b> dan nominalnya <b>tepat sama</b> bisa diverifikasi sekaligus;
          selain itu tetap diproses manual di tabel bawah.
        </p>
      </div>

      <textarea
        value={teks}
        onChange={(e) => setTeks(e.target.value)}
        rows={5}
        placeholder={"Rp 10.123\nRp 20.045\n30210"}
        className="border border-neutral-300 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-400"
      />
      <button
        type="button"
        onClick={handleCocokkan}
        disabled={proses || !teks.trim()}
        className="self-start bg-primary-500 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-primary-600 disabled:opacity-50"
      >
        Cocokkan
      </button>

      {hasil && (
        <div className="flex flex-col gap-4">
          <div>
            <h4 className="font-semibold text-sm mb-2 text-green-700">
              Cocok &amp; ada bukti ({hasil.cocok.length}) — siap diverifikasi
            </h4>
            {hasil.cocok.length === 0 ? (
              <p className="text-sm text-gray-400">Tidak ada.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-neutral-200">
                <table className="w-full text-sm">
                  <thead className="bg-neutral-50 text-neutral-600">
                    <tr>
                      <th className="px-3 py-2 text-left">
                        <input
                          type="checkbox"
                          aria-label="Pilih semua"
                          checked={dipilih.size === hasil.cocok.length}
                          onChange={(e) =>
                            setDipilih(e.target.checked ? new Set(hasil.cocok.map((c) => c.id)) : new Set())
                          }
                        />
                      </th>
                      <th className="px-3 py-2 text-left">Nominal</th>
                      <th className="px-3 py-2 text-left">Pendukung</th>
                      <th className="px-3 py-2 text-left">Tim</th>
                      <th className="px-3 py-2 text-left">Vote</th>
                      <th className="px-3 py-2 text-left">Kode</th>
                      <th className="px-3 py-2 text-left">Bukti</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {hasil.cocok.map((c) => (
                      <tr key={c.id}>
                        <td className="px-3 py-2">
                          <input type="checkbox" checked={dipilih.has(c.id)} onChange={() => toggle(c.id)} />
                        </td>
                        <td className="px-3 py-2 font-semibold">{formatRupiah(c.nominal)}</td>
                        <td className="px-3 py-2">{c.nama}</td>
                        <td className="px-3 py-2">
                          {c.tim}
                          <div className="text-xs text-gray-400">
                            {c.kategori === "tim_favorit" ? "Tim Favorit" : c.kategori.replace(/_/g, " ")}
                          </div>
                        </td>
                        <td className="px-3 py-2">{c.jumlahVote}×</td>
                        <td className="px-3 py-2 font-mono">{c.kodeUnik}</td>
                        <td className="px-3 py-2">
                          <a href={c.bukti} target="_blank" className="text-blue-500 hover:underline text-xs">
                            Lihat
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {hasil.cocok.length > 0 && (
              <button
                type="button"
                onClick={handleVerifikasi}
                disabled={proses || dipilih.size === 0}
                className="mt-3 bg-green-500 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-green-600 disabled:opacity-50"
              >
                Verifikasi {dipilih.size} terpilih
              </button>
            )}
          </div>

          {hasil.tanpaBukti.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-1 text-amber-700">
                Nominal cocok tapi tanpa bukti ({hasil.tanpaBukti.length}) — proses manual
              </h4>
              <ul className="text-sm text-gray-600 list-disc pl-5">
                {hasil.tanpaBukti.map((t, i) => (
                  <li key={i}>
                    {formatRupiah(t.nominal)} — {t.nama} untuk {t.tim} (kode {t.kodeUnik})
                  </li>
                ))}
              </ul>
            </div>
          )}

          {hasil.tidakCocok.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-1 text-red-700">
                Tidak ada transaksi PENDING dengan nominal ini ({hasil.tidakCocok.length}) — cek manual
              </h4>
              <p className="text-sm text-gray-600">{hasil.tidakCocok.map(formatRupiah).join(", ")}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
