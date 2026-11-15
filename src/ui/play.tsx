"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Piece, type Mood } from "@/brand/Piece";
import { Monogram } from "@/brand/Monogram";
import { RuleError, standings, type Player, type Rng } from "@/engine/core";
import { useSound } from "./sound";
import { phaseVariants, springy } from "./motion";

/* ---------- motor: estado + ações com erro amigável ---------- */

export function useEngine<S, A>(init: () => S, reduce: (s: S, a: A, rng: Rng) => S) {
  const [state, setState] = useState<S>(init);
  const [error, setError] = useState<string | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const dispatch = useCallback(
    (a: A) => {
      try {
        const next = reduce(stateRef.current, a, Math.random);
        stateRef.current = next;
        setState(next);
        setError(null);
        return true;
      } catch (e) {
        if (e instanceof RuleError) {
          setError(e.message);
          return false;
        }
        throw e;
      }
    },
    [reduce],
  );
  return { state, dispatch, error, clearError: () => setError(null) };
}

/* ---------- tom da tela (claro / feltro escuro) ---------- */

export function useTone(tone: "noite" | null) {
  useEffect(() => {
    if (tone) document.body.dataset.tone = tone;
    else delete document.body.dataset.tone;
    return () => {
      delete document.body.dataset.tone;
    };
  }, [tone]);
}

/* ---------- palco de fases: troca animada entre etapas da rodada ---------- */

export function PhaseStage({ phaseKey, children }: { phaseKey: string; children: React.ReactNode }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    window.scrollTo({ top: 0 });
    const h = ref.current?.querySelector("h1, h2");
    if (h instanceof HTMLElement) {
      h.tabIndex = -1;
      h.focus({ preventScroll: true });
    }
  }, [phaseKey]);
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={phaseKey} ref={ref} variants={phaseVariants(!!reduce)} initial="initial" animate="animate" exit="exit" className="grid gap-5">
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/* ---------- peças de interface ---------- */

export function ErrorNote({ message }: { message: string | null }) {
  return (
    <p role="alert" className="min-h-[1px] text-[15px] font-semibold text-[var(--color-erro)]">
      {message}
    </p>
  );
}

export function Progress({ round, total, label = "Rodada" }: { round: number; total: number; label?: string }) {
  return (
    <div className="flex items-center gap-2.5 text-sm font-bold text-[var(--fg-2)]">
      <span>
        {label} {round} de {total}
      </span>
      <div className="flex flex-1 gap-1.5" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <i key={i} className={`h-2 flex-1 rounded-full ${i < round ? "bg-[var(--color-gema)]" : "bg-[var(--line)]"}`} />
        ))}
      </div>
    </div>
  );
}

export function PromptCard({ tag, text, flip = false }: { tag: string; text: string; flip?: boolean }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="card grid gap-2.5 rounded-[28px] px-[22px] py-6"
      initial={flip && !reduce ? { opacity: 0, rotateX: -70, y: -10 } : false}
      animate={{ opacity: 1, rotateX: 0, y: 0 }}
      transition={springy}
      style={{ transformPerspective: 700 }}
    >
      <span className="text-sm font-bold text-[var(--fg-2)]">{tag}</span>
      <p className="prompt-text">{text}</p>
    </motion.div>
  );
}

export function Who({ player, mood = "neutral", caption, size = 60 }: { player: Player; mood?: Mood; caption: string; size?: number }) {
  return (
    <div className="flex items-center gap-3.5">
      <Piece kind={player.piece} mood={mood} size={size} alive />
      <div>
        <span className="muted">{caption}</span>
        <br />
        <b className="font-display text-[26px] leading-tight font-black">{player.name}</b>
      </div>
    </div>
  );
}

export function Stepper({ label, value, min, max, onChange, suffix = "" }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void; suffix?: string }) {
  const id = useId();
  return (
    <div className="grid gap-2.5">
      <span className="label" id={id}>
        {label}
      </span>
      <div className="flex items-center gap-1.5" role="group" aria-labelledby={id}>
        <button className="btn btn-ghost btn-small" onClick={() => onChange(value - 1)} disabled={value <= min} aria-label={`Diminuir ${label.toLowerCase()}`}>
          −
        </button>
        <output aria-live="polite" className="num min-w-14 text-center text-3xl leading-none">
          {value}
          {suffix}
        </output>
        <button className="btn btn-ghost btn-small" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={`Aumentar ${label.toLowerCase()}`}>
          +
        </button>
      </div>
    </div>
  );
}

export function Toggle({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-[15.5px]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="relative h-8 w-[52px] flex-none cursor-pointer appearance-none rounded-full bg-[var(--color-linha)] transition-colors after:absolute after:top-1 after:left-1 after:size-6 after:rounded-full after:bg-white after:transition-transform after:duration-300 after:ease-[var(--ease-spring)] checked:bg-[var(--color-feltro)] checked:after:translate-x-5"
      />
      <span>{children}</span>
    </label>
  );
}

export function ChipGroup<T extends string | number>({
  label,
  options,
  value,
  onToggle,
  multi = false,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T[];
  onToggle: (v: T) => void;
  multi?: boolean;
}) {
  const id = useId();
  return (
    <div className="grid gap-2.5">
      <span className="label" id={id}>
        {label}
      </span>
      <div className="flex flex-wrap gap-2" role="group" aria-labelledby={id}>
        {options.map((o) => (
          <button key={String(o.value)} className="chip" aria-pressed={value.includes(o.value)} onClick={() => onToggle(o.value)} data-multi={multi || undefined}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- cronômetro em anel ---------- */

export function Timer({ seconds, running = true, onDone, size = 132 }: { seconds: number; running?: boolean; onDone?: () => void; size?: number }) {
  const [left, setLeft] = useState(seconds);
  const [frac, setFrac] = useState(0);
  const done = useRef(onDone);
  done.current = onDone;
  const { play } = useSound();
  useEffect(() => {
    if (!running) return;
    const t0 = performance.now();
    let last = seconds;
    const id = window.setInterval(() => {
      const e = (performance.now() - t0) / 1000;
      const l = Math.max(0, Math.ceil(seconds - e));
      setFrac(Math.min(1, e / seconds));
      if (l !== last) {
        last = l;
        setLeft(l);
        if (l <= 5 && l > 0) play("tick");
        if (l === 0) {
          window.clearInterval(id);
          play("miss");
          done.current?.();
        }
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [seconds, running, play]);
  const C = 2 * Math.PI * 44;
  const low = left <= 5 && left > 0;
  return (
    <div className="relative mx-auto grid place-items-center" style={{ width: size, height: size }} role="timer" aria-label={left === 0 ? "Tempo esgotado" : `${left} segundos`}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
        <circle cx="50" cy="50" r="44" fill="none" strokeWidth="9" stroke="var(--line)" />
        <circle
          cx="50"
          cy="50"
          r="44"
          fill="none"
          strokeWidth="9"
          strokeLinecap="round"
          stroke={low ? "var(--color-erro)" : "var(--color-feltro)"}
          strokeDasharray={C}
          strokeDashoffset={C * frac}
          style={{ transition: "stroke-dashoffset .1s linear, stroke .2s" }}
        />
      </svg>
      <span className={`num ${left === 0 ? "text-[26px]" : "text-[40px]"} leading-none ${low ? "text-[var(--color-erro)] [animation:ticklow_1s_steps(1)_infinite]" : ""}`} aria-hidden="true">
        {left === 0 ? "Tempo!" : left}
      </span>
    </div>
  );
}

/* ---------- teclado de notas ---------- */

export function NumberPad({ min = 0, max = 10, value, onPick, label }: { min?: number; max?: number; value?: number; onPick: (n: number) => void; label: string }) {
  const nums = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <div className="grid grid-cols-6 gap-2" role="group" aria-label={label}>
      {nums.map((n) => (
        <button
          key={n}
          className={`btn ${value === n ? "btn-gema" : "btn-ghost"} min-h-[60px] rounded-2xl p-0 text-[26px] ${n === max && nums.length % 6 === 5 ? "col-span-2" : ""}`}
          aria-pressed={value === n}
          onClick={() => onPick(n)}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

/* ---------- segurar para ver (segredo no modo compartilhado) ---------- */

export function HoldToReveal({ secret, onPeek, srText }: { secret: React.ReactNode; onPeek: () => void; srText: string }) {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  const on = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setOpen(true);
    onPeek();
  };
  const off = () => setOpen(false);
  return (
    <div className="grid w-full justify-items-center gap-[18px]">
      <div className="aspect-[5/6] w-[min(68vw,240px)]" style={{ perspective: 900 }}>
        <motion.div className="relative size-full" style={{ transformStyle: "preserve-3d" }} animate={{ rotateY: open ? 180 : 0 }} transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 26 }}>
          <div className="absolute inset-0 grid place-items-center rounded-[28px] bg-[var(--color-noite-2)] text-[#2C7A62] shadow-[inset_0_0_0_3px_#1E5A48] [backface-visibility:hidden]">
            <Monogram tone="flat" className="h-auto w-[46%]" />
          </div>
          <div
            className="absolute inset-0 grid place-items-center rounded-[28px] bg-[var(--color-gema)] p-4 text-center text-[var(--color-tinta)] shadow-[0_6px_0_var(--color-gema-d)] [backface-visibility:hidden]"
            style={{ transform: "rotateY(180deg)" }}
            aria-hidden="true"
          >
            {open ? secret : null}
          </div>
        </motion.div>
      </div>
      <p className="sr-only" aria-live="assertive">
        {open ? srText : ""}
      </p>
      <button
        className="btn btn-gema is-hold max-w-[420px] touch-none select-none [-webkit-touch-callout:none]"
        aria-pressed={open}
        onPointerDown={on}
        onPointerUp={off}
        onPointerLeave={off}
        onPointerCancel={off}
        onBlur={off}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if ((e.key === " " || e.key === "Enter") && !e.repeat) on(e);
        }}
        onKeyUp={(e) => {
          if (e.key === " " || e.key === "Enter") off();
        }}
      >
        Segure para ver
      </button>
    </div>
  );
}

/* ---------- passar o celular ---------- */

export function PassPhone({ player, title, note, cta, onReady }: { player: Player; title?: string; note?: string; cta?: string; onReady: () => void }) {
  return (
    <div className="grid justify-items-center gap-5 pt-6 text-center">
      <Piece kind={player.piece} mood="wow" size={96} alive />
      <h1 className="text-[clamp(28px,7vw,40px)]">{title ?? `Passe o celular para ${player.name}`}</h1>
      <p className="muted max-w-[32ch]">{note ?? "Só essa pessoa deve olhar a próxima tela."}</p>
      <div className="w-full max-w-[420px]">
        <button className="btn btn-gema" onClick={onReady}>
          {cta ?? `Sou ${player.name}`}
        </button>
      </div>
    </div>
  );
}

/* ---------- placar e pódio ---------- */

export function Scoreboard({ players, scores, unit = "" }: { players: Player[]; scores: Record<string, number>; unit?: string }) {
  const rows = standings(players, scores);
  const max = Math.max(1, ...rows.map((r) => r.score));
  const reduce = useReducedMotion();
  return (
    <ol className="grid gap-2.5">
      {rows.map((r, k) => (
        <li key={r.player.id} className="card grid grid-cols-[28px_auto_1fr_auto] items-center gap-2.5 rounded-[20px] py-2 pr-4 pl-3">
          <span className="num text-xl text-[var(--fg-2)]">{r.position}</span>
          <Piece kind={r.player.piece} mood={k === 0 && r.score > 0 ? "happy" : "neutral"} size={38} />
          <div>
            <b>{r.player.name}</b>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-[var(--color-sup-2)]">
              <motion.i
                className="block h-full rounded-full bg-[var(--color-feltro)]"
                initial={{ width: reduce ? `${(r.score / max) * 100}%` : 0 }}
                animate={{ width: `${(r.score / max) * 100}%` }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.1 + k * 0.06 }}
              />
            </div>
          </div>
          <span className="num text-2xl">
            {r.score}
            {unit}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function Podium({ entries, unit = "pts" }: { entries: { id: string; name: string; piece: Player["piece"]; score: number }[]; unit?: string }) {
  const sorted = [...entries].sort((a, b) => b.score - a.score);
  const reduce = useReducedMotion();
  const order = [sorted[1], sorted[0], sorted[2]];
  const H = [96, 132, 72];
  const C = ["var(--color-ceu)", "var(--color-gema)", "var(--color-chiclete)"];
  const place = [2, 1, 3];
  return (
    <div className="grid grid-cols-3 items-end gap-2.5">
      {order.map((p, k) =>
        p ? (
          <div key={p.id} className="grid justify-items-center gap-2 text-center">
            <motion.div
              initial={reduce ? false : { y: -60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 380, damping: 16, delay: 0.25 + (2 - place[k]!) * 0.18 }}
            >
              <Piece kind={p.piece} mood={k === 1 ? "happy" : "neutral"} size={k === 1 ? 72 : 54} alive />
            </motion.div>
            <b className="font-display max-w-full truncate text-base font-extrabold">{p.name}</b>
            <span className="text-sm font-semibold text-[var(--fg-2)]">
              {p.score} {unit}
            </span>
            <motion.div
              className="num grid w-full place-items-center rounded-t-[18px] rounded-b-lg text-3xl text-[var(--color-tinta)]"
              style={{ background: C[k], transformOrigin: "bottom" }}
              initial={reduce ? false : { scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.1 * k }}
            >
              <span style={{ height: H[k], display: "grid", placeItems: "center" }}>{place[k]}</span>
            </motion.div>
          </div>
        ) : (
          <div key={k} />
        ),
      )}
    </div>
  );
}

/* ---------- folha inferior (confirmações) ---------- */

export function Sheet({ open, onClose, title, children, piece }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; piece?: React.ReactNode }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => ref.current?.querySelector<HTMLElement>("button")?.focus(), 50);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div className="absolute inset-0 bg-[rgba(10,30,24,.45)]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-labelledby={id}
            className="absolute inset-x-0 bottom-0 mx-auto grid max-w-[520px] gap-3.5 rounded-t-[28px] bg-white px-5 pt-[26px] pb-[calc(20px+env(safe-area-inset-bottom))] text-[var(--color-tinta)]"
            initial={reduce ? { opacity: 0 } : { y: "100%" }}
            animate={reduce ? { opacity: 1 } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : { y: "100%" }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <h2 id={id} className="flex items-center gap-3">
              {piece}
              {title}
            </h2>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ---------- suspense de número (revelação) ---------- */

export function useSuspenseNumber(final: string, active: boolean, onLand?: () => void) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState<string>(reduce ? final : "?");
  const [landed, setLanded] = useState(!!reduce);
  const land = useRef(onLand);
  land.current = onLand;
  useEffect(() => {
    if (!active) return;
    if (reduce) {
      setShown(final);
      setLanded(true);
      land.current?.();
      return;
    }
    const steps = [55, 55, 60, 65, 75, 90, 110, 140, 180, 240, 320];
    let i = 0;
    let prev = "";
    let t: number;
    const spin = () => {
      if (i >= steps.length) {
        setShown(final);
        setLanded(true);
        land.current?.();
        return;
      }
      let n: string;
      do n = String(Math.floor(Math.random() * 11));
      while (n === prev || n === final);
      prev = n;
      setShown(n);
      t = window.setTimeout(spin, steps[i++]);
    };
    spin();
    return () => window.clearTimeout(t);
  }, [final, active, reduce]);
  return { shown, landed };
}
