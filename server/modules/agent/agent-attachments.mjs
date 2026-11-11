import { extname } from "node:path";
import ExcelJS from "exceljs";
import mammoth from "mammoth";

const textExtensions = new Set([
  ".txt",
  ".md",
  ".csv",
  ".json",
  ".xml",
  ".yaml",
  ".yml",
  ".feature",
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".log",
]);
const imageTypes = new Map([
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".gif", "image/gif"],
]);

function validateOfficeArchive(buffer) {
  let end = -1;
  for (let index = buffer.length - 22; index >= Math.max(0, buffer.length - 65557); index--) {
    if (buffer.readUInt32LE(index) === 0x06054b50) {
      end = index;
      break;
    }
  }
  if (end < 0) throw new Error("invalid archive");
  const count = buffer.readUInt16LE(end + 10);
  let offset = buffer.readUInt32LE(end + 16);
  let total = 0;
  if (count > 2000) throw new Error("archive too large");
  for (let index = 0; index < count; index++) {
    if (offset + 46 > buffer.length || buffer.readUInt32LE(offset) !== 0x02014b50) throw new Error("invalid archive");
    if (buffer.readUInt16LE(offset + 8) & 1) throw new Error("encrypted archive");
    total += buffer.readUInt32LE(offset + 24);
    if (total > 20_000_000) throw new Error("archive too large");
    offset +=
      46 + buffer.readUInt16LE(offset + 28) + buffer.readUInt16LE(offset + 30) + buffer.readUInt16LE(offset + 32);
  }
}

export async function readUploadedAttachment(item) {
  if (
    typeof item.title !== "string" ||
    !item.title.trim() ||
    item.title.length > 180 ||
    /[\\/]/.test(item.title) ||
    [...item.title].some((character) => character.charCodeAt(0) < 32)
  )
    throw new Error("A context file name is invalid.");
  if (
    typeof item.data !== "string" ||
    item.data.length > 5_333_336 ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(item.data)
  )
    throw new Error("A context file is invalid. Attach it again.");
  const buffer = Buffer.from(item.data, "base64");
  if (!buffer.length || buffer.length > 4_000_000) throw new Error("A context file must be between 1 byte and 4 MB.");
  const ext = extname(item.title).toLowerCase();
  const imageType = imageTypes.get(ext);
  if (imageType) {
    const valid =
      (imageType === "image/png" && buffer.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))) ||
      (imageType === "image/jpeg" && buffer.subarray(0, 3).equals(Buffer.from("ffd8ff", "hex"))) ||
      (imageType === "image/gif" && /^GIF8[79]a$/.test(buffer.subarray(0, 6).toString("ascii"))) ||
      (imageType === "image/webp" &&
        buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
        buffer.subarray(8, 12).toString("ascii") === "WEBP");
    if (!valid) throw new Error("A context file does not match its image format.");
    return { content: "Image attached to this message.", image: `data:${imageType};base64,${item.data}` };
  }
  let content;
  try {
    if (textExtensions.has(ext)) {
      content = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
      if (content.includes("\0")) throw new Error("binary");
    } else if (ext === ".pdf") {
      if (buffer.subarray(0, 5).toString() !== "%PDF-") throw new Error("invalid PDF");
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer), useSystemFonts: true }).promise;
      if (pdf.numPages > 100) throw new Error("too many pages");
      const pages = [];
      for (let page = 1; page <= pdf.numPages; page++) {
        const text = await (await pdf.getPage(page)).getTextContent();
        pages.push(`Page ${page}:\n${text.items.map((part) => part.str || "").join(" ")}`);
        if (Buffer.byteLength(pages.join("\n")) > 64000) throw new Error("too much text");
      }
      content = pages.join("\n\n");
      await pdf.destroy();
    } else if (ext === ".docx") {
      validateOfficeArchive(buffer);
      content = (await mammoth.extractRawText({ buffer })).value;
    } else if (ext === ".xlsx") {
      validateOfficeArchive(buffer);
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const rows = [];
      workbook.eachSheet((sheet) => {
        rows.push(`Sheet: ${sheet.name}`);
        sheet.eachRow((row, number) => {
          rows.push(
            `${number}: ${row.values
              .slice(1)
              .map((value) =>
                typeof value === "object" && value !== null ? JSON.stringify(value) : String(value ?? ""),
              )
              .join("\t")}`,
          );
          if (rows.length > 10000 || Buffer.byteLength(rows.join("\n")) > 64000)
            throw new Error("too much spreadsheet data");
        });
      });
      content = rows.join("\n");
    } else throw new Error("unsupported format");
  } catch {
    throw new Error(
      "A context file could not be read. Check its format, content, and size; encrypted or damaged files are not supported.",
    );
  }
  if (!content?.trim())
    throw new Error("A context file contains no readable text. Scanned PDFs need OCR before attaching.");
  if (Buffer.byteLength(content) > 64000)
    throw new Error("A context file has too much text. Keep combined context under 64 KB.");
  return { content };
}
