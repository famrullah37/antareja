const SATUAN = [
  "", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas",
];

function eja(n: number): string {
  if (n < 12) return SATUAN[n];
  if (n < 20) return `${eja(n - 10)} belas`;
  if (n < 100) return `${eja(Math.floor(n / 10))} puluh${n % 10 ? " " + eja(n % 10) : ""}`;
  if (n < 200) return `seratus${n - 100 ? " " + eja(n - 100) : ""}`;
  if (n < 1000) return `${eja(Math.floor(n / 100))} ratus${n % 100 ? " " + eja(n % 100) : ""}`;
  if (n < 2000) return `seribu${n - 1000 ? " " + eja(n - 1000) : ""}`;

  const skala: [number, string][] = [
    [1e12, "triliun"],
    [1e9, "miliar"],
    [1e6, "juta"],
    [1e3, "ribu"],
  ];
  for (const [nilai, nama] of skala) {
    if (n >= nilai) {
      const depan = Math.floor(n / nilai);
      const sisa = n % nilai;
      return `${eja(depan)} ${nama}${sisa ? " " + eja(sisa) : ""}`;
    }
  }
  return "";
}

// Nominal terbilang bahasa Indonesia, mis. 450000 → "Empat Ratus Lima Puluh Ribu Rupiah".
export function terbilangRupiah(n: number): string {
  const bulat = Math.floor(Math.abs(n));
  const kata = bulat === 0 ? "nol" : eja(bulat);
  const title = kata.replace(/\b\w/g, (c) => c.toUpperCase());
  return `${n < 0 ? "Minus " : ""}${title} Rupiah`;
}
