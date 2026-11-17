"use client";
import { useRef, type PointerEvent } from "react";
export async function readImage(file: File): Promise<string> {
  if (!["image/png", "image/jpeg"].includes(file.type) || file.size > 500_000) {
    throw new Error("Choose a PNG or JPEG smaller than 500 KB.");
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read that image."));
    reader.readAsDataURL(file);
  });
}

export function Signature({ value, onChange, onError }: { value: string; onChange: (v: string) => void; onError: (v: string) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const stroked = useRef(false);
  function point(e: PointerEvent<HTMLCanvasElement>) {
    const bounds = e.currentTarget.getBoundingClientRect();
    return { x: (e.clientX - bounds.left) * 600 / bounds.width, y: (e.clientY - bounds.top) * 160 / bounds.height };
  }
  function start(e: PointerEvent<HTMLCanvasElement>) {
    drawing.current = true; stroked.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
    const ctx = e.currentTarget.getContext("2d")!;
    const p = point(e);
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineWidth = 2.5; ctx.lineCap = "round";
  }
  function move(e: PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = e.currentTarget.getContext("2d")!;
    stroked.current = true;
    const p = point(e); ctx.lineTo(p.x, p.y); ctx.stroke();
  }
  function finish() {
    if (!drawing.current) return;
    drawing.current = false;
    if (canvas.current && stroked.current) onChange(canvas.current.toDataURL("image/png"));
  }
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold text-slate-700">Your signature</legend>
      <p className="text-xs text-slate-500">Draw with your finger or mouse, or upload your signature below.</p>
      <canvas ref={canvas} width={600} height={160} aria-label="Draw your signature" onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} className="w-full rounded-xl border border-slate-300 bg-white" style={{ touchAction: "none" }} />
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <button type="button" onClick={() => { canvas.current?.getContext("2d")?.clearRect(0, 0, 600, 160); onChange(""); }} className="text-teal-700 underline">Clear signature</button>
        <label>Upload signature<input type="file" accept="image/png,image/jpeg" className="mt-1 block w-full text-xs" onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) try { onChange(await readImage(file)); } catch (err) { onError((err as Error).message); }
        }} /></label>
      </div>
      {value && <p className="text-xs text-emerald-700">Signature ready to include in the certificate.</p>}
    </fieldset>
  );
}

