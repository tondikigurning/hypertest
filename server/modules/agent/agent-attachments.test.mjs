import assert from "node:assert/strict";
import test from "node:test";
import ExcelJS from "exceljs";
import { readUploadedAttachment } from "./agent-attachments.mjs";

const upload = (title, data) => ({ title, data: Buffer.from(data).toString("base64") });
test("reads text and spreadsheet contents for the agent", async () => {
  assert.equal(
    (await readUploadedAttachment(upload("notes.md", "# Acceptance criteria"))).content,
    "# Acceptance criteria",
  );
  const book = new ExcelJS.Workbook();
  book.addWorksheet("Cases").addRow(["Scenario", "Expected result"]);
  const result = await readUploadedAttachment(upload("cases.xlsx", await book.xlsx.writeBuffer()));
  assert.match(result.content, /Sheet: Cases/);
  assert.match(result.content, /Scenario\tExpected result/);
});
test("passes valid image data and rejects invalid files", async () => {
  const image = await readUploadedAttachment(upload("image.png", Buffer.from("89504e470d0a1a0a0000", "hex")));
  assert.match(image.image, /^data:image\/png;base64,/);
  await assert.rejects(readUploadedAttachment(upload("image.png", "not an image")), /image format/);
  await assert.rejects(readUploadedAttachment(upload("legacy.doc", "document")), /could not be read/);
});
