import { ReactNode } from "react";

// Keterangan netral untuk menu dashboard yang belum dibuka/diisi panitia —
// supaya menunya tetap terlihat oleh tim (dulu section disembunyikan total).
export default function InfoBelumDibuka({ children }: { children: ReactNode }) {
  return (
    <div className="bg-gray-50 border border-gray-200 text-gray-600 rounded-xl p-4 text-sm">{children}</div>
  );
}
