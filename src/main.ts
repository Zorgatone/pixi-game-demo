import { bootstrapGame } from "./app/GameShell";

import "./styles/index.css";

void bootstrapGame().catch((error) => {
  console.error("Failed to bootstrap PIXI game demo:", error);
});
