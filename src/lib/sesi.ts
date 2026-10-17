// Batas sesi tanpa aktivitas — dipakai dua sisi supaya selalu sama:
// - server: umur cookie/JWT sesi (next-auth `session.maxAge`). Cookie diperbarui
//   tiap kali tab yang terbuka memanggil /api/auth/session (SessionProvider
//   refetchInterval 60 detik), jadi selama ada tab terbuka sesi tidak habis;
//   begitu browser ditutup / tab dibekukan, sesi mati sendiri di server.
// - klien: IdleLogout (tab terbuka tapi tidak ada aktivitas mouse/keyboard).
export const SESI_IDLE_MENIT = 30;
export const SESI_IDLE_MS = SESI_IDLE_MENIT * 60 * 1000;
