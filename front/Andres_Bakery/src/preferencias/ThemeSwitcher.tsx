import { TEMAS } from "./PreferencesProvider";
import { usePreferences } from "./usePreferences";

export function ThemeSwitcher({ className = "" }: { className?: string }) {
  const { tema, setPreferencia } = usePreferences();

  return (
    <div
      className={`flex items-center gap-1 border-[3px] border-borde bg-superficie-alt p-1 ${className}`}
      role="group"
      aria-label="Elegir estación"
    >
      {TEMAS.map((opcion) => (
        <button
          key={opcion.id}
          type="button"
          onClick={() => setPreferencia("tema", opcion.id)}
          aria-pressed={tema === opcion.id}
          title={opcion.label}
          className={`px-2 py-1 text-base leading-none transition ${
            tema === opcion.id ? "bg-acento" : "hover:bg-superficie"
          }`}
        >
          <span aria-hidden="true">{opcion.icono}</span>
          <span className="sr-only">{opcion.label}</span>
        </button>
      ))}
    </div>
  );
}
