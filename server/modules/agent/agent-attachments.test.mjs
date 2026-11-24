import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { readUploadedAttachment } from "./agent-attachments.mjs";

const requireFromExcelJs = createRequire(import.meta.resolve("exceljs"));
const JSZip = requireFromExcelJs("jszip");

function pdfWithPages(contents) {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${contents.map((_, index) => `${4 + index * 2} 0 R`).join(" ")}] /Count ${contents.length} >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  for (let index = 0; index < contents.length; index++) {
    const stream = contents[index] ? `BT /F1 12 Tf 20 100 Td (${contents[index]}) Tj ET` : "";
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + index * 2} 0 R >>`,
      `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    );
  }
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${offsets.length}\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("")}trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf).toString("base64");
}

test("PDF extraction reports layout limits and pages without readable text", async () => {
  const result = await readUploadedAttachment({ title: "manual.pdf", data: pdfWithPages(["Readable page", ""]) });
  assert.match(result.content, /Readable page/);
  assert.match(result.content, /images or diagrams/);
  assert.match(result.content, /No readable text was extracted from PDF pages: 2\./);
  await assert.rejects(
    readUploadedAttachment({ title: "scan.pdf", data: pdfWithPages(["", ""]) }),
    /Scanned PDFs need OCR/,
  );
});

test("DOCX extraction reports that embedded visuals and layout may be missing", async () => {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
  );
  zip.file(
    "_rels/.rels",
    '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
  );
  zip.file(
    "word/document.xml",
    '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Readable content</w:t></w:r></w:p></w:body></w:document>',
  );
  const result = await readUploadedAttachment({
    title: "manual.docx",
    data: await zip.generateAsync({ type: "base64" }),
  });
  assert.match(result.content, /Readable content/);
  assert.match(result.content, /images or diagrams/);
  assert.match(result.content, /table structure/);
});
