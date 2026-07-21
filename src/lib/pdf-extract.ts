// Client-side PDF text extraction using pdfjs-dist. Browser only.
import * as pdfjsLib from "pdfjs-dist";
// Vite bundles the worker file and gives us a URL.
// @ts-expect-error - Vite ?url import
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc as string;

export async function extractPdfText(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: buf }).promise;
  const parts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((it) => ("str" in it ? (it as { str: string }).str : ""))
      .join(" ");
    parts.push(`--- Page ${i} ---\n${pageText}`);
  }
  return parts.join("\n\n");
}
