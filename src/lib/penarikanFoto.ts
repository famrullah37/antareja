// Label status penarikan bagi hasil foto — dipakai halaman Bagi Hasil & Pendapatan Saya.
export const STATUS_PENARIKAN: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Diajukan", cls: "bg-yellow-100 text-yellow-800" },
  DIBAYAR: { label: "Dibayar", cls: "bg-green-100 text-green-800" },
  DITOLAK: { label: "Ditolak", cls: "bg-red-100 text-red-700" },
  DIBATALKAN: { label: "Dibatalkan", cls: "bg-neutral-100 text-neutral-600" },
};
