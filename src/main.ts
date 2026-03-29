import { bootstrapGame } from "./app/GameShell";
import { loadUiFont } from "./ui/fonts";

import "./styles/index.css";

void loadUiFont()
  .then(() => bootstrapGame())
  .catch((error) => {
    console.error("Failed to bootstrap PIXI game demo:", error);
  });
