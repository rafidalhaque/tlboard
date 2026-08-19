import type { TLAssetStore } from "tldraw";

// pairs with apps/server/src/routes/assets.ts — PUT the raw file, get back a served URL
export const assetStore: TLAssetStore = {
  async upload(_asset, file) {
    const ext = file.name.split(".").pop() || "bin";
    const id = `${crypto.randomUUID()}.${ext}`;
    const res = await fetch(`/api/assets/${id}`, { method: "PUT", credentials: "include", body: file });
    if (!res.ok) throw new Error("asset upload failed");
    return { src: `/api/assets/${id}` };
  },
};
