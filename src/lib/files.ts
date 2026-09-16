import type { Attachment } from "../types";
import { uid } from "./utils";

const MAX_FILE = 2.5 * 1024 * 1024;
const MAX_DIM = 1400;

const readAsDataURL = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error(`Couldn't read "${file.name}".`));
    r.readAsDataURL(file);
  });

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image failed to load"));
    img.src = src;
  });

async function shrinkImage(src: string): Promise<string> {
  const img = await loadImage(src);
  if (img.width <= MAX_DIM) return src;
  const scale = MAX_DIM / img.width;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return src;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

export async function fileToAttachment(file: File): Promise<Attachment> {
  if (file.size > MAX_FILE) {
    throw new Error(
      `"${file.name}" is over 2.5 MB — too large for browser storage.`,
    );
  }
  const isImage = file.type.startsWith("image/");
  let src = await readAsDataURL(file);
  if (isImage) {
    try {
      src = await shrinkImage(src);
    } catch {
      /* keep original */
    }
  }
  return {
    id: uid(),
    name: file.name,
    mime: file.type || "application/octet-stream",
    size: file.size,
    src,
    kind: isImage ? "image" : "file",
    addedAt: Date.now(),
  };
}

export async function filesToAttachments(
  files: FileList | File[],
): Promise<{ ok: Attachment[]; errors: string[] }> {
  const ok: Attachment[] = [];
  const errors: string[] = [];
  for (const f of Array.from(files)) {
    try {
      ok.push(await fileToAttachment(f));
    } catch (e) {
      errors.push(e instanceof Error ? e.message : "Failed to read file.");
    }
  }
  return { ok, errors };
}
