"use client";

import { kirimSaran } from "@/actions/Saran";
import { KATEGORI_SARAN, SARAN_MAKS, SARAN_MIN } from "@/lib/saranTim";
import { useRef, useState } from "react";
import { toast } from "sonner";

export default function SaranForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const [rating, setRating] = useState(0);
  const [panjang, setPanjang] = useState(0);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const data = new FormData(e.currentTarget);
    data.set("rating", String(rating));
    try {
      const res = await kirimSaran(data);
      if (!res.success) {
        toast.error(res.message ?? "Gagal mengirim");
        return;
      }
      toast.success("Terima kasih! Masukanmu sudah terkirim ke panitia.");
      formRef.current?.reset();
      setRating(0);
      setPanjang(0);
    } catch {
      toast.error("Gagal mengirim, coba lagi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col gap-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Kategori</span>
          <select name="kategori" required defaultValue="" className="border border-gray-300 rounded-lg px-3 py-2.5 bg-white">
            <option value="" disabled>
              Pilih kategori
            </option>
            {KATEGORI_SARAN.map((k) => (
              <option key={k.key} value={k.key}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Penilaian (opsional)</span>
          <div className="flex gap-1" role="radiogroup" aria-label="Penilaian bintang">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} bintang`}
                onClick={() => setRating(rating === n ? 0 : n)}
                className={`text-3xl leading-none ${n <= rating ? "text-amber-400" : "text-gray-300"} hover:text-amber-300`}
              >
                ★
              </button>
            ))}
          </div>
        </div>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Saran / masukan</span>
        <textarea
          name="isi"
          required
          minLength={SARAN_MIN}
          maxLength={SARAN_MAKS}
          rows={5}
          onChange={(e) => setPanjang(e.target.value.length)}
          placeholder="Tuliskan saran, kritik, atau masukanmu untuk panitia..."
          className="border border-gray-300 rounded-lg px-3 py-2.5"
        />
        <span className="text-xs text-gray-400 self-end">
          {panjang}/{SARAN_MAKS}
        </span>
      </label>
      <button
        type="submit"
        disabled={loading}
        className="self-start bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-white font-semibold rounded-xl px-6 py-2.5 transition-colors"
      >
        {loading ? "Mengirim..." : "Kirim Masukan"}
      </button>
    </form>
  );
}
