import type { StrukPOS } from "@/actions/PosProduk";
import { labelMetodePOS } from "@/lib/posProduk";

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

// Cetak struk di jendela baru (lebar 58mm, cocok untuk printer thermal maupun
// "Save as PDF") — tidak ikut mencetak sidebar/halaman admin.
export function cetakStruk(s: StrukPOS) {
  const w = window.open("", "_blank", "width=380,height=640");
  if (!w) return false;
  const tanggal = new Date(s.createdAt).toLocaleString("id-ID", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta",
  });
  const baris = s.items
    .map(
      (i) => `<tr><td colspan="2">${esc(i.nama)}${i.varian ? ` (${esc(i.varian)})` : ""}</td></tr>
      <tr><td>${i.jumlah} × ${rp(i.harga)}</td><td class="r">${rp(i.harga * i.jumlah)}</td></tr>`
    )
    .join("");
  const tunai =
    s.metodePembayaran === "CASH" && s.uangDiterima != null
      ? `<tr><td>Tunai</td><td class="r">${rp(s.uangDiterima)}</td></tr>
         <tr><td>Kembali</td><td class="r">${rp(s.uangDiterima - s.total)}</td></tr>`
      : `<tr><td>Bayar</td><td class="r">${labelMetodePOS(s.metodePembayaran)}</td></tr>`;

  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(s.nomor)}</title>
<style>
  @page { size: 58mm auto; margin: 3mm; }
  body { font-family: ui-monospace, monospace; font-size: 11px; width: 52mm; margin: 0 auto; color: #000; }
  h1 { font-size: 13px; text-align: center; margin: 0; }
  p { margin: 2px 0; } .c { text-align: center; } .r { text-align: right; white-space: nowrap; }
  table { width: 100%; border-collapse: collapse; } td { padding: 1px 0; vertical-align: top; }
  hr { border: 0; border-top: 1px dashed #000; margin: 6px 0; } .b td { font-weight: bold; font-size: 12px; }
</style></head><body>
  <h1>LPKBB ANTAREJA</h1>
  <p class="c">SMK Telkom Malang</p>
  <hr>
  <p>${esc(s.nomor)}</p>
  <p>${tanggal} WIB</p>
  <p>Kasir: ${esc(s.kasirNama)}</p>
  ${s.namaPembeli ? `<p>Pembeli: ${esc(s.namaPembeli)}</p>` : ""}
  <hr>
  <table>${baris}</table>
  <hr>
  <table><tr class="b"><td>TOTAL</td><td class="r">${rp(s.total)}</td></tr>${tunai}</table>
  <hr>
  <p class="c">Terima kasih!</p>
  <script>window.onload = () => { window.print(); };</script>
</body></html>`);
  w.document.close();
  return true;
}
