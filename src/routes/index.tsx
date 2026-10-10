import { createFileRoute } from "@tanstack/react-router";
import { Game } from "@/game/Game";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "MISSION27 — Train on Earth. Survive the Moon." },
      { name: "description", content: "A playful 3D lunar outpost game: train on Earth, then manage a Moon base for 27 mission hours." },
      { property: "og:title", content: "MISSION27 — Train on Earth. Survive the Moon." },
      { property: "og:description", content: "Become an astronaut, run a lunar outpost, and learn space engineering by doing." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Game,
});
