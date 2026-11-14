/**
 * Visions: a tiny, dependency-free PDF writer for exporting a Book. Each page is one full-page JPEG image (the
 * rendered page at export resolution), in order, sized to the page's proportions. PDF 1.4 with DCT (JPEG) images is
 * understood by every reader; nothing is fetched or uploaded.
 */
export type PdfPage = { jpeg: Uint8Array; width: number; height: number };

const enc = new TextEncoder();
/** Builds the PDF bytes. Page size in points keeps each image's aspect, with the longer side at `longPt` (A4-ish). */
export function buildPdf(pages: PdfPage[], longPt = 842): Uint8Array {
  const chunks: Uint8Array[] = [], offsets: number[] = [];
  let length = 0;
  const push = (b: Uint8Array | string) => { const u = typeof b === "string" ? enc.encode(b) : b; chunks.push(u); length += u.length; };
  const obj = (n: number, body: () => void) => { offsets[n] = length; push(`${n} 0 obj\n`); body(); push("\nendobj\n"); };
  push("%PDF-1.4\n%âãÏÓ\n");
  const count = pages.length, pageIds = pages.map((_, i) => 3 + i * 3);
  obj(1, () => push("<< /Type /Catalog /Pages 2 0 R >>"));
  obj(2, () => push(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${count} >>`));
  pages.forEach((p, i) => {
    const id = pageIds[i], k = longPt / Math.max(p.width, p.height), W = +(p.width * k).toFixed(2), H = +(p.height * k).toFixed(2);
    const content = `q ${W} 0 0 ${H} 0 0 cm /Im0 Do Q`;
    obj(id, () => push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im0 ${id + 2} 0 R >> >> /Contents ${id + 1} 0 R >>`));
    obj(id + 1, () => { push(`<< /Length ${enc.encode(content).length} >>\nstream\n`); push(content); push("\nendstream"); });
    obj(id + 2, () => { push(`<< /Type /XObject /Subtype /Image /Width ${p.width} /Height ${p.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>\nstream\n`); push(p.jpeg); push("\nendstream"); });
  });
  const total = 3 + count * 3, xref = length;
  push(`xref\n0 ${total}\n0000000000 65535 f \n`);
  for (let n = 1; n < total; n++) push(`${String(offsets[n]).padStart(10, "0")} 00000 n \n`);
  push(`trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  const out = new Uint8Array(length);
  let at = 0;
  for (const c of chunks) { out.set(c, at); at += c.length; }
  return out;
}
/** A JPEG's pixel size, read from its SOF marker (so the PDF never needs to decode the image). */
export function jpegSize(b: Uint8Array): { width: number; height: number } | null {
  let i = 2;
  while (i < b.length) {
    if (b[i] !== 0xff) return null;
    const m = b[i + 1], len = (b[i + 2] << 8) | b[i + 3];
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { height: (b[i + 5] << 8) | b[i + 6], width: (b[i + 7] << 8) | b[i + 8] };
    i += 2 + len;
  }
  return null;
}
