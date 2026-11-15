"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

/**
 * Efeitos sonoros opcionais, sintetizados na hora com Web Audio: são originais por construção,
 * sem arquivos licenciados. O contexto de áudio só nasce depois de um toque do usuário,
 * e tudo pode ser silenciado. Todo som tem um equivalente visual na interface.
 */
export type Sfx = "tap" | "join" | "start" | "confirm" | "tick" | "reveal" | "hit" | "miss" | "win";

type Note = [freq: number, at: number, dur: number, type?: OscillatorType, gain?: number];
const SFX: Record<Sfx, Note[]> = {
  tap: [[660, 0, 0.05, "triangle", 0.08]],
  join: [[523, 0, 0.09, "triangle"], [784, 0.08, 0.14, "triangle"]],
  start: [[392, 0, 0.1], [523, 0.09, 0.1], [659, 0.18, 0.18]],
  confirm: [[880, 0, 0.07, "triangle", 0.1]],
  tick: [[1200, 0, 0.03, "square", 0.04]],
  reveal: [[330, 0, 0.12], [494, 0.1, 0.12], [740, 0.2, 0.3, "triangle"]],
  hit: [[659, 0, 0.1, "triangle"], [988, 0.09, 0.22, "triangle"]],
  miss: [[300, 0, 0.16, "sine", 0.12], [220, 0.14, 0.24, "sine", 0.12]],
  win: [[523, 0, 0.12], [659, 0.11, 0.12], [784, 0.22, 0.12], [1047, 0.33, 0.36, "triangle"]],
};

interface SoundCtx {
  muted: boolean;
  toggle: () => void;
  play: (s: Sfx) => void;
}
const Ctx = createContext<SoundCtx>({ muted: true, toggle: () => {}, play: () => {} });
const KEY = "deresenha:muted";

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [muted, setMuted] = useState(false);
  const audio = useRef<AudioContext | null>(null);
  const unlocked = useRef(false);

  useEffect(() => {
    try {
      setMuted(localStorage.getItem(KEY) === "1");
    } catch {}
    const unlock = () => {
      unlocked.current = true;
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const play = useCallback(
    (s: Sfx) => {
      if (muted || !unlocked.current || typeof window === "undefined") return;
      try {
        audio.current ??= new AudioContext();
        const ac = audio.current;
        if (ac.state === "suspended") void ac.resume();
        const t0 = ac.currentTime;
        for (const [freq, at, dur, type = "sine", gain = 0.14] of SFX[s]) {
          const o = ac.createOscillator();
          const g = ac.createGain();
          o.type = type;
          o.frequency.value = freq;
          g.gain.setValueAtTime(0.0001, t0 + at);
          g.gain.exponentialRampToValueAtTime(gain, t0 + at + 0.012);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + dur);
          o.connect(g).connect(ac.destination);
          o.start(t0 + at);
          o.stop(t0 + at + dur + 0.02);
        }
      } catch {
        // Áudio indisponível: a interface já tem o feedback visual.
      }
    },
    [muted],
  );

  const toggle = useCallback(() => {
    setMuted((m) => {
      try {
        localStorage.setItem(KEY, m ? "0" : "1");
      } catch {}
      return !m;
    });
  }, []);

  const value = useMemo(() => ({ muted, toggle, play }), [muted, toggle, play]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useSound = () => useContext(Ctx);
