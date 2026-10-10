import { useEffect } from "react";
import { audio, type SceneName } from "./audio";
import { installInput } from "./input";
import { useGame } from "./store";
import { Home } from "./ui/Home";
import { Training } from "./ui/Training";
import { LunarMission } from "./ui/LunarMission";
import { Report } from "./ui/Report";
import { MusicToggle } from "./ui/Button";

const SCENE: Record<string, SceneName> = { home: "home", select: "home", mars: "home", training: "training", lunar: "lunar", report: "home" };

export function Game() {
  const screen = useGame((s) => s.screen);
  useEffect(() => {
    installInput();
    const unlock = () => audio.unlock();
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => { window.removeEventListener("pointerdown", unlock); window.removeEventListener("keydown", unlock); };
  }, []);
  useEffect(() => { audio.setScene(SCENE[screen]); }, [screen]);

  return (
    <main className="fixed inset-0 select-none bg-background text-foreground">
      <div key={screen} className="anim-screen-in fixed inset-0">
        {(screen === "home" || screen === "select" || screen === "mars") && <Home />}
        {screen === "training" && <Training />}
        {screen === "lunar" && <LunarMission />}
        {screen === "report" && <Report />}
      </div>
      {(screen === "home" || screen === "report") && <MusicToggle className="fixed right-4 top-4 z-30" />}
    </main>
  );
}
