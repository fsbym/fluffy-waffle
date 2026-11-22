"use client";

import { useEffect, useState } from "react";

const MAX_SIDE = 1600;

/** 在浏览器里把照片缩小、转成 JPEG，减少上传体积；失败时原样上传，交给服务器校验。 */
async function shrink(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    return blob ?? file;
  } catch {
    return file;
  }
}

export default function PhotoInput({ onChange, label = "照片证据", hint = "必填：店内告示、菜单、收据或 App 截图" }: { onChange: (photo: Blob | null) => void; label?: string; hint?: string }) {
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  return (
    <label className="photo">
      <span>{label}<em>（{hint}）</em></span>
      <div className="drop">
        {/* eslint-disable-next-line @next/next/no-img-element -- 本地预览的 blob: 地址，不适用 next/image */}
        {preview ? <img src={preview} alt="已选择的照片" /> : <span className="placeholder">📷 拍照或选择图片</span>}
        <input
          type="file"
          accept="image/*"
          required
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) { setPreview(null); onChange(null); return; }
            const blob = await shrink(file);
            setPreview(URL.createObjectURL(blob));
            onChange(blob);
          }}
        />
      </div>
      <style jsx>{`
        .photo { display: flex; flex-direction: column; gap: 5px; color: var(--ink-2); font-size: 12px; }
        em { font-style: normal; color: var(--muted); }
        .drop { position: relative; height: 120px; display: grid; place-items: center; overflow: hidden; border: 1.5px dashed var(--line-strong); border-radius: 12px; background: var(--bg); cursor: pointer; }
        .drop:hover { border-color: var(--brand); }
        .drop img { width: 100%; height: 100%; object-fit: contain; }
        .placeholder { color: var(--muted); font-size: 14px; }
        input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
      `}</style>
    </label>
  );
}
