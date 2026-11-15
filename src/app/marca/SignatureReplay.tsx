"use client";

import { useState } from "react";
import { Signature } from "@/brand/Signature";

export function SignatureReplay() {
  const [n, setN] = useState(0);
  return (
    <div className="card grid place-items-center gap-[18px] rounded-[28px] px-5 py-7">
      <Signature key={n} play="always" className="block h-auto w-full max-w-[560px]" />
      <button className="btn btn-small" onClick={() => setN((v) => v + 1)}>
        Ver de novo
      </button>
    </div>
  );
}
