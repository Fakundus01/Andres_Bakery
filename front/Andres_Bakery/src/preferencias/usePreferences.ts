import { useContext } from "react";

import { PreferencesContext } from "./PreferencesProvider";

export function usePreferences() {
  const contexto = useContext(PreferencesContext);
  if (!contexto) {
    throw new Error("usePreferences necesita estar dentro de <PreferencesProvider>");
  }
  return contexto;
}
