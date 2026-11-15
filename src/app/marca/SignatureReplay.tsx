"use client";

import { useEffect, useRef } from "react";
import { playSignature, SignatureSVG } from "@/brand/Signature";

export function SignatureReplay() {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (ref.current) playSignature(ref.current);
  }, []);
  return (
    <div className="card grid place-items-center gap-[18px] rounded-[28px] px-5 py-7">
      <SignatureSVG ref={ref} className="block h-auto w-full max-w-[560px] text-[var(--color-tinta)]" />
      <button className="btn btn-small" onClick={() => ref.current && playSignature(ref.current)}>
        Ver de novo
      </button>
    </div>
  );
}
