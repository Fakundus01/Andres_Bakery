import { useContext } from "react";

import { ThemeContext } from "./ThemeProvider";

export function useTheme() {
  const contexto = useContext(ThemeContext);
  if (!contexto) {
    throw new Error("useTheme necesita estar dentro de <ThemeProvider>");
  }
  return contexto;
}
