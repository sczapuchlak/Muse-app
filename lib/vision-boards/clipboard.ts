/** Image bytes only: never fetch URLs or execute HTML copied from a website. */
export function imageFilesFromPaste(data: Pick<DataTransfer, "files" | "items">): File[] {
  const files = Array.from(data.files).filter((file) => file.type.startsWith("image/"));
  if (files.length) return files;
  return Array.from(data.items ?? []).flatMap((item) => {
    const file = item.kind === "file" && item.type.startsWith("image/") ? item.getAsFile() : null;
    return file ? [file] : [];
  });
}

export async function readClipboardImages(clipboard: Pick<Clipboard, "read"> | undefined = navigator.clipboard): Promise<File[]> {
  if (!clipboard?.read) throw Error("This browser can’t read clipboard images here. Save the picture and add it with Photos instead.");
  const items = await clipboard.read();
  const files: File[] = [];
  for (const item of items) {
    const type = item.types.find((t) => t === "image/png") ?? item.types.find((t) => t.startsWith("image/"));
    if (type) {
      const blob = await item.getType(type);
      files.push(new File([blob], `pasted-image.${type === "image/png" ? "png" : type.split("/")[1]}`, { type }));
    }
  }
  if (!files.length) throw Error("No picture was found on the clipboard. Use Copy Image on the picture itself, then try Paste. You can also save it and add it with Photos.");
  return files;
}

export function clipboardPasteError(error: unknown): string {
  return error instanceof DOMException && error.name === "NotAllowedError"
    ? "Clipboard access wasn’t allowed. Try the Paste button and approve your browser’s Paste or Allow prompt, or add the saved picture with Photos."
    : error instanceof Error ? error.message : "That picture didn’t paste. Try again, or add it with Photos.";
}
