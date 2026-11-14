import Link from "next/link";

// Pintasan ke bagian-bagian dashboard tim. Semua bagian di bawah selalu
// dirender (yang belum dibuka panitia menampilkan keterangan), jadi anchor
// tidak pernah mengarah ke bagian yang hilang.
type ItemMenu = { label: string; href: string };

// Dikelompokkan sesuai urutan bagian di halaman dashboard (atas → bawah).
const KELOMPOK: { judul: string; items: (ItemMenu & { syarat?: "pelunasan" | "tiketWajib" | "tiket" })[] }[] = [
  {
    judul: "Tim & Pembayaran",
    items: [
      { label: "Profil Tim", href: "#profile-tim" },
      { label: "Pelunasan", href: "#pelunasan", syarat: "pelunasan" },
      { label: "Tiket Wajib", href: "#tiket-wajib", syarat: "tiketWajib" },
      { label: "Grup WA", href: "#grup-wa" },
    ],
  },
  {
    judul: "Persiapan Lomba",
    items: [
      { label: "Basecamp", href: "#basecamp" },
      { label: "Uji Coba", href: "#uji-coba" },
      { label: "Menginap", href: "#menginap" },
      { label: "Makanan", href: "#makanan" },
    ],
  },
  {
    judul: "Hasil Lomba",
    items: [
      { label: "Foto Tim", href: "#foto-tim" },
      { label: "Nilai", href: "#nilai-akhir" },
      { label: "Sertifikat", href: "#sertifikat-saya" },
    ],
  },
  {
    judul: "Tiket & Lainnya",
    items: [
      { label: "Tiket Saya", href: "#tiket-saya", syarat: "tiket" },
      { label: "Beli Tiket", href: "/tiket" },
      { label: "Saran & Masukan", href: "#saran" },
    ],
  },
];

export default function MenuDashboard({
  adaPelunasan,
  adaTiket,
  adaTiketWajib,
}: {
  adaPelunasan: boolean;
  adaTiket: boolean;
  adaTiketWajib: boolean;
}) {
  // Bagian bersyarat hanya dirender kalau ada isinya (Pelunasan, Tiket Wajib,
  // Tiket Saya) — menunya ikut disembunyikan supaya anchor tidak mengarah ke kosong.
  const ada = { pelunasan: adaPelunasan, tiketWajib: adaTiketWajib, tiket: adaTiket };
  const kelompok = KELOMPOK.map((k) => ({
    ...k,
    items: k.items.filter((i) => !i.syarat || ada[i.syarat]),
  })).filter((k) => k.items.length > 0);

  return (
    <nav aria-label="Menu dashboard tim" className="mx-[27px] xl:mx-[51px] mb-10">
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {kelompok.map((k) => (
          <div key={k.judul} className="bg-white border border-gray-200 rounded-2xl p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">{k.judul}</p>
            <ul className="flex flex-wrap gap-2">
              {k.items.map((m) => (
                <li key={m.href}>
                  <Link
                    href={m.href}
                    className="inline-block text-sm font-medium bg-neutral-50 border border-gray-200 text-gray-700 hover:border-primary-400 hover:text-primary-600 rounded-full px-3.5 py-1.5 transition-colors"
                  >
                    {m.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
