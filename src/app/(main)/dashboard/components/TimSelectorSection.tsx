"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type TimBasic = {
  id: string;
  nama_tim: string;
  asal_sekolah: string;
  jenjang: string;
  confirmed: boolean;
};

export default function TimSelectorSection({
  tims,
  selectedTimId,
}: {
  tims: TimBasic[];
  selectedTimId: string;
}) {
  return (
    <div className="mx-4 sm:mx-8 mb-2">
      <div className="flex flex-wrap gap-3 items-center">
        {tims.map((t) => (
          <Link
            key={t.id}
            href={`/dashboard?timId=${t.id}`}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-sm font-medium transition-colors ${
              t.id === selectedTimId
                ? "border-primary-500 bg-primary-50 text-primary-700"
                : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400"
            }`}
          >
            <span>{t.nama_tim}</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                t.confirmed
                  ? "bg-green-100 text-green-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {t.confirmed ? "Confirmed" : "Pending"}
            </span>
          </Link>
        ))}
        <Link
          href="/form"
          className="px-4 py-2 rounded-xl border-2 border-dashed border-neutral-300 text-sm font-medium text-gray-500 hover:border-primary-400 hover:text-primary-600 transition-colors"
        >
          + Daftarkan Tim Baru
        </Link>
      </div>
    </div>
  );
}
