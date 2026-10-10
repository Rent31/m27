import { Canvas } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { audio } from "../audio";
import { useGame } from "../store";
import { HomeBackdrop, type HomeFx } from "../three/HomeBackdrop";
import { Handbook } from "./Handbook";

const RM_KEY = "mission27-reduced-motion";


function useClock() {
  const [t, setT] = useState(() => new Date());
  useEffect(() => { const id = setInterval(() => setT(new Date()), 1000); return () => clearInterval(id); }, []);
  return t.toISOString().slice(11, 19);
}

export function Home() {
  const { go, continueMission, resetSave, hasSave, custom } = useGame();
  const [book, setBook] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [note, setNote] = useState("");
  const [hover, setHover] = useState<"start" | "train" | null>(null);
  const [bubble, setBubble] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const lite = typeof window !== "undefined" && window.innerWidth < 768;
  const [reduced, setReduced] = useState(() => {
    const saved = localStorage.getItem(RM_KEY);
    if (saved !== null) return saved === "1";
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  });
  const fx = useRef<HomeFx>({ motion: reduced ? 0 : 1, warp: 0, focus: 0, lite });
  const tilt = useRef<HTMLDivElement>(null);
  const clock = useClock();

  useEffect(() => {
    fx.current.motion = reduced ? 0 : 1;
    localStorage.setItem(RM_KEY, reduced ? "1" : "0");
    document.documentElement.classList.toggle("reduce-motion", reduced);
  }, [reduced]);
  useEffect(() => { fx.current.focus = hover ? -1 : 0; }, [hover]);
  useEffect(() => {
    if (!bubble) return;
    const id = setTimeout(() => setBubble(false), 3500);
    return () => clearTimeout(id);
  }, [bubble]);

  const travel = (fn: () => void) => {
    if (leaving) return;
    setLeaving(true);
    fx.current.warp = reduced ? 0 : 1;
    setTimeout(fn, reduced ? 120 : 520);
  };

  const onMove = (e: React.PointerEvent) => {
    if (reduced || !tilt.current) return;
    const x = e.clientX / window.innerWidth - 0.5;
    const y = e.clientY / window.innerHeight - 0.5;
    tilt.current.style.transform = `translate3d(${x * -8}px, ${y * -6}px, 0)`;
  };

  return (
    <div className="fixed inset-0 overflow-hidden" onPointerMove={onMove}>
      <Canvas camera={{ position: [0, 0.6, 8], fov: 50 }} dpr={lite ? [1, 1.25] : [1, 1.75]}>
        <HomeBackdrop accent={custom.accent} fx={fx} onPoke={() => setBubble(true)} bubble={bubble} />
      </Canvas>

      {/* vignette */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_45%,transparent_30%,color-mix(in_oklab,var(--background)_85%,transparent)_100%)]" />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-full bg-gradient-to-r from-background/70 via-background/20 to-transparent sm:w-1/2" />

      {/* HUD decorations */}
      <div className="pointer-events-none absolute inset-0 hidden font-mono text-[10px] tracking-[0.25em] text-muted-foreground/70 md:block">
        <div className="absolute left-6 top-6 flex items-center gap-2"><span className="anim-dot h-1.5 w-1.5 rounded-full bg-success" /> SYSTEM ONLINE · UTC {clock}</div>
        <div className="absolute bottom-16 right-6 text-right">ORBIT 384,400 KM · Δv NOMINAL</div>
      </div>

      {/* top-right controls */}
      <div className="absolute right-40 top-4 z-20 flex items-center gap-2">
        <button
          onClick={() => setReduced((r) => !r)}
          aria-pressed={reduced}
          className="rounded-full border border-border bg-card/70 px-3 py-1.5 font-mono text-[11px] font-bold text-muted-foreground backdrop-blur transition hover:border-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {reduced ? "◼ MOTION REDUCED" : "◇ REDUCE MOTION"}
        </button>
      </div>

      {/* astronaut speech bubble: sits left of the helmet, below the status panel, never over the buttons */}
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "pointer-events-none absolute z-20 w-max max-w-[min(220px,60vw)] rounded-2xl border border-secondary/40 bg-card/85 px-3.5 py-2.5 font-display text-sm shadow-[0_0_24px_-8px_var(--secondary)] backdrop-blur-md transition-all duration-300",
          "right-4 top-[14%] rounded-tr-sm lg:right-[36%] lg:top-[34%] lg:rounded-tr-2xl lg:rounded-br-sm",
          bubble ? "scale-100 opacity-100" : "scale-90 opacity-0",
        )}
      >
        <span className="block font-mono text-[9px] tracking-[0.25em] text-secondary">MAYA · COMMS</span>
        Ready for your mission, Commander? 🚀
      </div>

      {/* main UI */}
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-center px-5 pb-24 pt-16 sm:px-14 lg:px-20">
        <div ref={tilt} className="pointer-events-auto max-w-xl transition-transform duration-300 ease-out">
          <p className="anim-fade-up mb-4 font-mono text-[10px] uppercase tracking-[0.32em] text-secondary/90 sm:text-[11px]">
            A lunar outpost simulator · NASA Space Apps Challenge 2026
          </p>
          <h1 className="anim-fade-up relative font-logo text-5xl font-semibold leading-[0.95] tracking-[0.06em] sm:text-7xl lg:text-8xl" style={{ animationDelay: "80ms" }}>
            <span className="logo-glow"><span className="text-foreground">MISSION</span><span className="font-medium text-primary">27</span></span>
            <span aria-hidden className="logo-sweep pointer-events-none absolute inset-0 text-transparent">MISSION27</span>
          </h1>
          <p className="anim-fade-up mt-5 font-display text-xl font-medium tracking-wide text-foreground sm:text-2xl" style={{ animationDelay: "160ms" }}>
            Train on Earth. <span className="text-secondary">Survive the Moon.</span>
          </p>

          <div className="anim-fade-up mt-9 flex flex-col gap-3 sm:flex-row sm:gap-4" style={{ animationDelay: "240ms" }}>
            <LaunchButton
              tone="primary" icon="🚀" label="START MISSION" sub="LUNAR OUTPOST" detail="Mission 27-hour simulation"
              active={hover === "start"} onHover={(h) => setHover(h ? "start" : null)}
              onClick={() => travel(() => useGame.getState().startMission())}
            />
            <LaunchButton
              tone="secondary" icon="🌍" label="TRAIN ON EARTH" sub="TRAINING CENTER" detail="Master the systems before launch"
              active={hover === "train"} onHover={(h) => setHover(h ? "train" : null)}
              onClick={() => travel(() => go("training"))}
            />
          </div>

          <div className="anim-fade-up mt-5 flex flex-wrap gap-2" style={{ animationDelay: "320ms" }}>
            <SmallControl onClick={() => setBook(true)}>📘 Handbook</SmallControl>
            <SmallControl
              disabled={!hasSave}
              title={hasSave ? "Resume your saved mission" : "No saved mission found"}
              onClick={() => travel(() => { if (!continueMission()) { setLeaving(false); fx.current.warp = 0; setNote("No saved mission found."); } })}
            >▶ Continue Saved Mission</SmallControl>
            <SmallControl onClick={() => (hasSave ? setConfirm(true) : setNote("No saved mission found."))}>↻ Reset Save</SmallControl>
          </div>
          {note && <p className="mt-3 text-sm text-warning" role="status">{note}</p>}
          <p className="mt-4 hidden text-xs text-muted-foreground sm:block">Tip: click the astronaut to say hi 👋</p>
        </div>
      </div>

      {/* mission status panel */}
      <div className="anim-fade-up absolute right-5 top-16 z-10 hidden w-52 rounded-2xl border border-secondary/25 bg-card/55 p-4 backdrop-blur-md lg:block xl:right-8" style={{ animationDelay: "400ms" }}>
        <p className="mb-2 font-mono text-[10px] font-bold tracking-[0.3em] text-secondary">MISSION STATUS</p>
        {["Systems Ready", "Training Available", "Lunar Mission Ready"].map((s, i) => (
          <div key={s} className="flex items-center gap-2 py-1 text-sm">
            <span className="anim-dot h-2 w-2 rounded-full bg-success" style={{ animationDelay: `${i * 300}ms` }} />
            <span>{s}</span>
            <span className="ml-auto font-mono text-[10px] text-success">OK</span>
          </div>
        ))}
        <div className="mt-2 h-px bg-gradient-to-r from-secondary/50 to-transparent" />
        <p className="mt-2 font-mono text-[10px] text-muted-foreground">{hasSave ? "SAVE FILE DETECTED" : "NO SAVE FILE"}</p>
      </div>


      {/* disclaimer */}
      <div className="absolute inset-x-0 bottom-0 z-10 border-t border-border/60 bg-background/70 py-2 text-center text-[11px] text-muted-foreground backdrop-blur">
        Independent educational project. Not affiliated with or endorsed by NASA.
      </div>

      {/* transition overlay */}
      <div className={cn("pointer-events-none absolute inset-0 z-40 bg-background transition-opacity duration-500", leaving ? "opacity-100" : "opacity-0")}>
        {leaving && <div className="absolute inset-0 flex items-center justify-center font-mono text-xs tracking-[0.4em] text-secondary anim-dot">ENGAGING…</div>}
      </div>

      {book && <Handbook onClose={() => setBook(false)} />}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4" role="dialog" aria-modal="true">
          <div className="panel max-w-sm p-6 text-center">
            <h3 className="text-xl font-bold">Reset your saved mission?</h3>
            <p className="mt-2 text-sm text-muted-foreground">Mission progress and training records will be erased.</p>
            <div className="mt-5 flex justify-center gap-3">
              <SmallControl onClick={() => setConfirm(false)}>Cancel</SmallControl>
              <button className="rounded-lg bg-destructive px-4 py-2 font-display text-sm font-semibold text-destructive-foreground hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => { audio.sfx("click"); resetSave(); setConfirm(false); setNote("Save reset."); }}>Reset</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LaunchButton({ tone, icon, label, sub, detail, active, onHover, onClick }: {
  tone: "primary" | "secondary"; icon: string; label: string; sub: string; detail: string; active: boolean;
  onHover: (h: boolean) => void; onClick: () => void;
}) {
  const p = tone === "primary";
  return (
    <button
      onMouseEnter={() => { onHover(true); audio.sfx("beep"); }}
      onMouseLeave={() => onHover(false)}
      onFocus={() => onHover(true)}
      onBlur={() => onHover(false)}
      onClick={() => { audio.sfx("click"); onClick(); }}
      className={cn(
        "group relative min-w-[210px] overflow-hidden rounded-full border px-6 py-3 text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        p
          ? "border-primary/70 bg-gradient-to-br from-primary to-[color-mix(in_oklab,var(--primary)_75%,var(--destructive))] text-primary-foreground shadow-[0_10px_30px_-10px_var(--primary)] hover:shadow-[0_0_0_2px_color-mix(in_oklab,var(--primary)_60%,transparent),0_14px_40px_-10px_var(--primary)]"
          : "border-secondary/60 bg-gradient-to-br from-secondary to-[color-mix(in_oklab,var(--secondary)_70%,var(--primary-foreground))] text-secondary-foreground shadow-[0_10px_30px_-10px_var(--secondary)] hover:shadow-[0_0_0_2px_color-mix(in_oklab,var(--secondary)_60%,transparent),0_14px_40px_-10px_var(--secondary)]",
      )}
    >
      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-foreground/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
      <span className="relative flex items-center gap-3 font-display text-lg font-semibold tracking-[0.08em]">{icon} {label}</span>
      <span className={cn("relative grid transition-all duration-300", active ? "mt-0.5 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
        <span className="overflow-hidden">
          <span className="block font-mono text-[10px] font-bold tracking-[0.25em] opacity-80">{sub}</span>
          <span className="block text-xs opacity-90">{detail}</span>
        </span>
      </span>
    </button>
  );
}

function SmallControl({ className, disabled, onClick, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      aria-disabled={disabled}
      onClick={(e) => { if (disabled) return; audio.sfx("click"); onClick?.(e); }}
      className={cn(
        "rounded-full border border-border/70 bg-card/40 px-3 py-1.5 font-display text-xs font-medium text-muted-foreground hover:text-foreground backdrop-blur-md transition hover:-translate-y-0.5 hover:border-secondary/60 hover:bg-card/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        disabled && "cursor-not-allowed opacity-40 hover:translate-y-0 hover:border-border",
        className,
      )}
    />
  );
}
