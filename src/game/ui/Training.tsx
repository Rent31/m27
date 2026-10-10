import { Canvas } from "@react-three/fiber";
import { useEffect } from "react";
import { useGame } from "../store";
import { TrainingWorld, TRAINING_STATIONS } from "../three/TrainingWorld";
import { ActivityModal } from "./Activities";
import { GameButton, KeyCap, MusicToggle } from "./Button";
import { Handbook } from "./Handbook";

export function Training() {
  const s = useGame();
  const { training, prompt, activity, handbook } = s;
  const done = TRAINING_STATIONS.filter((t) => training[t.kind]).length;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const st = useGame.getState();
      if (e.key === "Enter") {
        if (st.activity || st.handbook) return;
        e.preventDefault();
        if (st.prompt) st.openActivity({ kind: st.prompt.id as never, context: "training" });
      } else if (e.key === "Escape") {
        if (st.handbook) st.setHandbook(false);
        else if (st.activity) st.openActivity(null);
        else st.go("home");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const finish = (r: Record<string, unknown>) => { s.finishActivity(r); s.saveGame(); };

  return (
    <div className="fixed inset-0">
      <Canvas shadows camera={{ position: [0, 9, 12], fov: 50 }} dpr={[1, 1.75]}>
        <TrainingWorld />
      </Canvas>

      <div className="pointer-events-none absolute inset-0 flex flex-col p-3 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="panel max-w-xs px-4 py-3">
            <p className="font-mono text-[10px] tracking-[0.3em] text-secondary">EARTH TRAINING CENTER · SIMULATION</p>
            <p className="mt-1 font-display text-lg font-semibold">Training {done}/{TRAINING_STATIONS.length}</p>
            <ul className="mt-2 space-y-0.5 text-sm">
              {TRAINING_STATIONS.map((t) => (
                <li key={t.kind} className={training[t.kind] ? "text-success" : "text-muted-foreground"}>
                  {training[t.kind] ? "✓" : "○"} {t.name}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">Practice only — results here do not affect the lunar mission.</p>
          </div>
          <div className="pointer-events-auto flex flex-wrap justify-end gap-2">
            <MusicToggle />
            <GameButton variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => s.setHandbook(true)}>Handbook</GameButton>
            <GameButton variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => s.go("home")}>Skip · Return home</GameButton>
            <GameButton variant="primary" className="px-3 py-1.5 text-xs" onClick={() => s.startMission()}>Launch mission</GameButton>
          </div>
        </div>

        <div className="mt-auto flex flex-col items-center gap-2">
          {prompt && !activity && (
            <button className="panel pointer-events-auto flex items-center gap-3 px-5 py-3 font-display text-base anim-float" onClick={() => s.openActivity({ kind: prompt.id as never, context: "training" })}>
              <KeyCap>ENTER</KeyCap> {prompt.label}
            </button>
          )}
          <span className="panel hidden items-center gap-2 px-3 py-2 text-xs text-muted-foreground sm:flex">
            <KeyCap>WASD</KeyCap> move <KeyCap>SHIFT</KeyCap> run <KeyCap>ENTER</KeyCap> train <KeyCap>ESC</KeyCap> home
          </span>
        </div>
      </div>

      {activity && <ActivityModal activity={activity} onFinish={finish} onClose={() => s.openActivity(null)} />}
      {handbook && <Handbook onClose={() => s.setHandbook(false)} />}
    </div>
  );
}
