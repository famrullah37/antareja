import QRScanner from "./QRScanner";

export default function ScannerPage() {
  return (
    <div className="max-w-md mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6 text-center">
        Scanner Tiket — Pintu Masuk
      </h1>
      <QRScanner />
    </div>
  );
}
