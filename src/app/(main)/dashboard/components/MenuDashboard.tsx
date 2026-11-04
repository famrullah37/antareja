import Link from "next/link";

// Pintasan ke bagian-bagian dashboard tim. Semua bagian di bawah selalu
// dirender (yang belum dibuka panitia menampilkan keterangan), jadi anchor
// tidak pernah mengarah ke bagian yang hilang.
const MENU = [
  { label: "Profil Tim", href: "#profile-tim" },
  { label: "Grup WA", href: "#grup-wa" },
  { label: "Basecamp", href: "#basecamp" },
  { label: "Uji Coba", href: "#uji-coba" },
  { label: "Menginap", href: "#menginap" },
  { label: "Makanan", href: "#makanan" },
  { label: "Foto Tim", href: "#foto-tim" },
  { label: "Nilai", href: "#nilai-akhir" },
  { label: "Sertifikat", href: "#sertifikat-saya" },
  { label: "Tiket Saya", href: "#tiket-saya" },
  { label: "Beli Tiket", href: "/tiket" },
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
  // "Tiket Saya" hanya dirender kalau sudah ada transaksi (TiketSayaSection),
  // "Tiket Wajib" hanya kalau panitia menandai tiket wajib tim.
  const dasar = adaTiket ? MENU : MENU.filter((m) => m.href !== "#tiket-saya");
  const menu = [
    ...(adaPelunasan ? [{ label: "Pelunasan", href: "#pelunasan" }] : []),
    ...(adaTiketWajib ? [{ label: "Tiket Wajib", href: "#tiket-wajib" }] : []),
    ...dasar,
  ];
  return (
    <nav aria-label="Menu dashboard tim" className="mx-[27px] xl:mx-[51px] mb-10">
      <ul className="flex flex-wrap gap-2">
        {menu.map((m) => (
          <li key={m.href}>
            <Link
              href={m.href}
              className="inline-block text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:border-primary-400 hover:text-primary-600 rounded-full px-4 py-1.5 transition-colors"
            >
              {m.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
