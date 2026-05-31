import { H2 } from "@/app/components/global/Text";
import SectionWrapper from "@/app/components/global/Wrapper";
import QRCode from "qrcode";

type QRTiket = { token: string; statusScan: boolean; waktuScan: Date | null };
type TransaksiItem = {
  id: string;
  jumlah: number;
  status: string;
  createdAt: Date;
  tiket: { jenis: string; harga: number };
  qrTikets: QRTiket[];
};

const statusBadge: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Menunggu Verifikasi", cls: "bg-yellow-100 text-yellow-700" },
  VERIFIED: { label: "Terverifikasi", cls: "bg-green-100 text-green-700" },
  REJECTED: { label: "Ditolak", cls: "bg-red-100 text-red-700" },
};

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);
}

async function generateQRDataURL(token: string): Promise<string> {
  return QRCode.toDataURL(token, {
    width: 200,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
  });
}

export default async function TiketSayaSection({
  transaksis,
}: {
  transaksis: TransaksiItem[];
}) {
  if (transaksis.length === 0) return null;

  // Generate QR data URLs server-side for all tokens
  const qrDataMap: Record<string, string> = {};
  for (const tr of transaksis) {
    for (const qr of tr.qrTikets) {
      qrDataMap[qr.token] = await generateQRDataURL(qr.token);
    }
  }

  return (
    <SectionWrapper id="tiket-saya">
      <H2 className="mb-4">Tiket Saya</H2>
      <div className="flex flex-col gap-4">
        {transaksis.map((tr) => {
          const badge = statusBadge[tr.status] ?? statusBadge.PENDING;
          return (
            <div
              key={tr.id}
              className="bg-white rounded-xl border border-neutral-200 p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-semibold text-lg">{tr.tiket.jenis}</div>
                  <div className="text-sm text-gray-500">
                    {tr.jumlah} tiket ·{" "}
                    {formatRupiah(tr.tiket.harga * tr.jumlah)}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {new Date(tr.createdAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${badge.cls}`}
                >
                  {badge.label}
                </span>
              </div>

              {/* QR Code Images */}
              {tr.qrTikets.length > 0 && (
                <div className="mt-3 border-t border-neutral-100 pt-3">
                  <p className="text-xs font-medium text-gray-500 mb-3">
                    QR Code Tiket — tunjukkan di pintu masuk
                  </p>
                  <div className="flex flex-wrap gap-4">
                    {tr.qrTikets.map((qr, idx) => (
                      <div
                        key={qr.token}
                        className={`flex flex-col items-center gap-2 rounded-xl border p-3 ${
                          qr.statusScan
                            ? "bg-neutral-50 border-neutral-200 opacity-50"
                            : "bg-white border-green-200"
                        }`}
                      >
                        <div className="text-xs font-semibold text-neutral-600">
                          Tiket #{idx + 1}
                        </div>
                        <div className="relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={qrDataMap[qr.token]}
                            alt={`QR Tiket #${idx + 1}`}
                            width={160}
                            height={160}
                            className={`rounded-lg ${qr.statusScan ? "grayscale" : ""}`}
                          />
                          {qr.statusScan && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg">
                              <span className="text-white font-bold text-xs text-center px-2">
                                SUDAH DI-SCAN
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="text-[10px] font-mono text-gray-400 text-center max-w-[160px] truncate">
                          {qr.token}
                        </div>
                        {qr.statusScan ? (
                          <span className="text-xs text-gray-400">
                            ✓ Di-scan{" "}
                            {qr.waktuScan
                              ? new Date(qr.waktuScan).toLocaleTimeString(
                                  "id-ID",
                                  { hour: "2-digit", minute: "2-digit" }
                                )
                              : ""}
                          </span>
                        ) : (
                          <span className="text-xs text-green-600 font-medium">
                            ● Belum di-scan
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tr.status === "PENDING" && (
                <p className="text-xs text-amber-600 mt-3">
                  QR Code akan muncul setelah admin memverifikasi pembayaran Anda.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </SectionWrapper>
  );
}
