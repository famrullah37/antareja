export const dynamic = "force-dynamic";

import { statistikScanTiket } from "@/actions/Tiket";
import QRScanner from "./QRScanner";

export default async function ScannerPage() {
  const statistik = await statistikScanTiket();
  return (
    <div className="max-w-md mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6 text-center">Scanner Tiket — Pintu Masuk</h1>
      <QRScanner statistikAwal={statistik} />
    </div>
  );
}
