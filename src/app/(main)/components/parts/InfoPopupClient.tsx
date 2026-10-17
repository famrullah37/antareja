"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export type KuotaJenjang = { label: string; kuota: number | null; terisi: number };

const STORAGE_KEY = "antareja-popup-info";

function hashKunci(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return String(h);
}

export default function InfoPopupClient({
  judul,
  isi,
  kuota,
  deadline,
  kunci,
}: {
  judul: string | null;
  isi: string | null;
  kuota: KuotaJenjang[];
  deadline: string | null;
  kunci: string;
}) {
  const [open, setOpen] = useState(false);
  const versi = hashKunci(kunci);

  // Sekali per sesi browser (sessionStorage) — storage bisa diblokir, jadi
  // kalau gagal dibaca popup tetap tampil.
  useEffect(() => {
    let sudah = false;
    try {
      sudah = sessionStorage.getItem(STORAGE_KEY) === versi;
    } catch {}
    if (!sudah) setOpen(true);
  }, [versi]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && tutup();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function tutup() {
    setOpen(false);
    try {
      sessionStorage.setItem(STORAGE_KEY, versi);
    } catch {}
  }

  if (!open) return null;

  const deadlineDate = deadline ? new Date(deadline) : null;
  const ditutup = !!deadlineDate && deadlineDate.getTime() <= Date.now();
  const deadlineText = deadlineDate?.toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      onClick={tutup}
      role="dialog"
      aria-modal="true"
      aria-labelledby="popup-info-judul"
    >
      <div
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-2 w-full bg-gradient-to-r from-primary-500 to-primary-600" />
        <button
          type="button"
          onClick={tutup}
          aria-label="Tutup"
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700"
        >
          ✕
        </button>

        <div className="p-6 sm:p-7 flex flex-col gap-5">
          <div className="flex flex-col gap-2 pr-8">
            <span className="text-primary-500 font-semibold text-xs uppercase tracking-widest">Informasi</span>
            {judul && (
              <h2 id="popup-info-judul" className="text-2xl font-extrabold text-black leading-tight">
                {judul}
              </h2>
            )}
          </div>

          {isi && <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{isi}</p>}

          {kuota.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Sisa Kuota Pendaftaran</span>
              <ul className="flex flex-col gap-2">
                {kuota.map((k) => {
                  const sisa = k.kuota === null ? null : Math.max(k.kuota - k.terisi, 0);
                  const penuh = sisa === 0;
                  return (
                    <li
                      key={k.label}
                      className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3 text-sm"
                    >
                      <span className="font-semibold text-gray-800">Jenjang {k.label}</span>
                      {sisa === null ? (
                        <span className="text-gray-500">Tidak dibatasi</span>
                      ) : penuh ? (
                        <span className="font-bold text-red-600">Penuh</span>
                      ) : (
                        <span className="text-gray-600">
                          <strong className="text-primary-500 text-base">{sisa}</strong> dari {k.kuota} tim
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {deadlineText && (
            <p className={`text-sm rounded-2xl px-4 py-3 ${ditutup ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800"}`}>
              {ditutup ? "Pendaftaran telah ditutup pada " : "Pendaftaran ditutup "}
              <strong>{deadlineText} WIB</strong>
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            {kuota.length > 0 && !ditutup && (
              <Link
                href="/auth/register"
                onClick={tutup}
                className="flex-1 text-center bg-primary-500 text-white rounded-xl py-2.5 px-5 text-sm font-semibold hover:bg-primary-600 transition-colors"
              >
                Daftarkan Tim
              </Link>
            )}
            <button
              type="button"
              onClick={tutup}
              className="flex-1 border border-gray-200 rounded-xl py-2.5 px-5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
