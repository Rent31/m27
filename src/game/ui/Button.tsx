import { useSyncExternalStore, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { audio } from "../audio";

type Variant = "primary" | "secondary" | "ghost" | "danger";

export function GameButton({ variant = "secondary", className, onClick, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...rest}
      onClick={(e) => { audio.sfx("click"); onClick?.(e); }}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 font-display font-semibold tracking-wide transition-all duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        variant === "primary" && "bg-primary text-primary-foreground shadow-[0_6px_0_0_color-mix(in_oklab,var(--primary)_55%,black)] hover:-translate-y-0.5 hover:brightness-110",
        variant === "secondary" && "bg-secondary text-secondary-foreground shadow-[0_6px_0_0_color-mix(in_oklab,var(--secondary)_50%,black)] hover:-translate-y-0.5 hover:brightness-110",
        variant === "ghost" && "border border-border bg-card/70 text-foreground hover:bg-accent",
        variant === "danger" && "bg-destructive text-destructive-foreground hover:brightness-110",
        className,
      )}
    />
  );
}

export function useAudioSettings() {
  return useSyncExternalStore((cb) => audio.subscribe(cb), () => audio.settings, () => audio.settings);
}

export function MusicToggle({ className }: { className?: string }) {
  const s = useAudioSettings();
  return (
    <button
      onClick={() => { audio.unlock(); audio.toggleMusic(); }}
      className={cn("group inline-flex items-center gap-2 rounded-full border border-secondary/40 bg-card/70 px-3 py-1.5 font-mono text-xs font-bold text-foreground backdrop-blur transition hover:-translate-y-0.5 hover:border-secondary hover:shadow-[0_0_14px_-4px_var(--secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}
      aria-label="Toggle music"
      aria-pressed={s.music}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full transition", s.music ? "anim-dot bg-success" : "bg-muted-foreground")} />
      ♫ MUSIC {s.music ? "ON" : "OFF"}
    </button>
  );
}

export function KeyCap({ children }: { children: React.ReactNode }) {
  return <kbd className="inline-flex min-w-7 items-center justify-center rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] font-bold text-foreground shadow-[0_2px_0_0_var(--border)]">{children}</kbd>;
}
