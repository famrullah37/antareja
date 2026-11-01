// Pilihan form kuitansi manual Bendahara — dipakai server action & tampilan admin.

export const METODE_KUITANSI_MANUAL: Record<string, string> = {
  TUNAI: "Tunai",
  TRANSFER: "Transfer Bank",
  QRIS: "QRIS",
};

// Sama dengan pilihan kategori pemasukan di form Kas (LaporanKasClient).
export const KATEGORI_KAS_PEMASUKAN: Record<string, string> = {
  SPONSOR: "Sponsor",
  PENDAFTARAN_TIM: "Pendaftaran Tim",
  LAINNYA: "Lainnya",
};
