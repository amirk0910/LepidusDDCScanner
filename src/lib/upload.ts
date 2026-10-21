import { AppError } from "./errors";

export const MAX_FILE_BYTES = 1_048_576;
export const MAX_REQUEST_BYTES = MAX_FILE_BYTES + 65_536;
const ALLOWED_MIME = new Set(["", "text/plain", "text/csv", "application/csv", "application/vnd.ms-excel"]);

export async function validateUpload(file: File): Promise<string> {
  if (!file.size) throw new AppError("The file is empty. Choose a non-empty CSV or TXT file.", 400);
  if (file.size > MAX_FILE_BYTES) throw new AppError("The file exceeds 1 MiB (1,048,576 bytes). Choose a smaller file.", 413);
  if (file.name.length > 255 || /[/\\\u0000-\u001f\u007f]/.test(file.name)) throw new AppError("The filename is invalid. Rename the file and try again.", 400);
  if (!/\.(csv|txt)$/i.test(file.name) || !ALLOWED_MIME.has(file.type.toLowerCase())) {
    throw new AppError("Only CSV and TXT files are supported.", 415);
  }
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
  } catch (error) {
    if (error instanceof TypeError) throw new AppError("The file is not valid UTF-8. Save it as UTF-8 and try again.", 415);
    throw error;
  }
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/.test(text)) throw new AppError("Binary content is not supported. Choose a UTF-8 text file.", 415);
  return text;
}

export async function readUpload(request: Request): Promise<File> {
  const length = Number(request.headers.get("content-length"));
  if (length > MAX_REQUEST_BYTES) throw new AppError("The upload is too large. Maximum file size is 1 MiB.", 413);
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.startsWith("multipart/form-data;") || !request.body) throw new AppError("Send one file using multipart/form-data.", 400);
  const reader = request.body.getReader();
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_REQUEST_BYTES) {
        await reader.cancel();
        throw new AppError("The upload is too large. Maximum file size is 1 MiB.", 413);
      }
      chunks.push(new Uint8Array(value));
    }
  } finally {
    reader.releaseLock();
  }
  let form: FormData;
  try {
    form = await new Response(new Blob(chunks), { headers: { "content-type": contentType } }).formData();
  } catch {
    throw new AppError("The upload is malformed. Choose the file again and retry.", 400);
  }
  const files = form.getAll("file");
  if (files.length !== 1 || !(files[0] instanceof File)) throw new AppError("Choose exactly one CSV or TXT file.", 400);
  if (form.get("synthetic") !== "true") throw new AppError("Confirm that this file contains synthetic training data only.", 400);
  return files[0];
}
