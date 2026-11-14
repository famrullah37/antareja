// Kategori saran & masukan dari tim — dipakai form dashboard dan halaman admin.
export const KATEGORI_SARAN = [
  { key: "UMUM", label: "Umum" },
  { key: "ACARA", label: "Jalannya Acara & Jadwal" },
  { key: "PENILAIAN", label: "Penilaian & Juri" },
  { key: "FASILITAS", label: "Fasilitas & Tempat" },
  { key: "KONSUMSI", label: "Konsumsi & Penginapan" },
  { key: "PANITIA", label: "Pelayanan Panitia" },
  { key: "WEBSITE", label: "Website & Pendaftaran" },
] as const;

export function labelKategoriSaran(key: string) {
  return KATEGORI_SARAN.find((k) => k.key === key)?.label ?? key;
}

export const SARAN_MIN = 10;
export const SARAN_MAKS = 2000;
