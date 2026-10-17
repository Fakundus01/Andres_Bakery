import { useEffect, useState, type FormEvent } from "react";
import { ChevronDown, HelpCircle, Mail, MessageCircle, X } from "lucide-react";

import { useAuth } from "../contexts/AuthContext";
import { useSiteConfig } from "../contexts/SiteConfigContext";
import { contactApi } from "../lib/api";
import { linkWhatsApp, PREGUNTAS_FRECUENTES } from "../lib/contacto";
import { getErrorMessage } from "../lib/format";

/** Reemplaza al "Soporte guiado" (ADR-013). No finge una conversación:
 *  nadie está del otro lado en tiempo real. Preguntas frecuentes y dos salidas. */
export function AyudaPanel() {
  const { user } = useAuth();
  const { config } = useSiteConfig();
  const [abierto, setAbierto] = useState(false);
  const [mostrarMail, setMostrarMail] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState("");

  useEffect(() => {
    setForm((actual) => ({
      ...actual,
      name: user?.name ?? actual.name,
      email: user?.email ?? actual.email,
    }));
  }, [user?.email, user?.name]);

  useEffect(() => {
    if (!abierto) {
      return;
    }
    const alApretar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        setAbierto(false);
      }
    };
    window.addEventListener("keydown", alApretar);
    return () => window.removeEventListener("keydown", alApretar);
  }, [abierto]);

  const enviarMail = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setEnviando(true);
    setResultado("");
    try {
      await contactApi.send({
        name: form.name || "Cliente web",
        email: form.email,
        message: form.message,
      });
      setForm((actual) => ({ ...actual, message: "" }));
      setResultado("Listo, tu consulta salió. Andrea la recibe por mail.");
    } catch (reason: unknown) {
      setResultado(getErrorMessage(reason));
    } finally {
      setEnviando(false);
    }
  };

  const whatsapp = linkWhatsApp(config?.whatsapp_phone, "¡Hola Andrea! Te escribo desde la web.");

  return (
    <div className="fixed bottom-6 left-6 z-40 w-[min(340px,calc(100vw-48px))]">
      {abierto ? (
        <div className="pixel-panel mb-3 max-h-[min(70vh,540px)] overflow-y-auto p-0">
          <div className="flex items-center justify-between border-b-[3px] border-borde bg-superficie-alt px-4 py-3">
            <p className="font-display text-xl font-bold text-tinta">Ayuda</p>
            <button type="button" className="btn-secondary p-2" onClick={() => setAbierto(false)} aria-label="Cerrar ayuda">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2 p-4">
            {PREGUNTAS_FRECUENTES.map((item) => (
              <details key={item.pregunta} className="border-[3px] border-borde bg-superficie-alt">
                <summary className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2.5 text-sm font-bold text-tinta">
                  {item.pregunta}
                  <ChevronDown className="h-4 w-4 shrink-0" />
                </summary>
                <p className="border-t-[3px] border-borde bg-superficie px-3 py-3 text-sm leading-6 text-tinta-suave">
                  {item.respuesta}
                </p>
              </details>
            ))}
          </div>

          <div className="space-y-3 border-t-[3px] border-borde p-4">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-tinta-tenue">¿No está tu pregunta?</p>

            {whatsapp ? (
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="btn-primary w-full justify-center">
                <MessageCircle className="h-4 w-4" />
                Escribir por WhatsApp
              </a>
            ) : (
              <p className="border-[3px] border-dashed border-borde bg-superficie-alt px-3 py-2.5 text-xs leading-5 text-tinta-suave">
                Falta cargar el número de WhatsApp (<code>WHATSAPP_PHONE</code> en el .env del back). Hasta
                entonces el botón no aparece: mejor eso que un link que no lleva a ningún lado.
              </p>
            )}

            <button type="button" className="btn-secondary w-full justify-center" onClick={() => setMostrarMail((valor) => !valor)}>
              <Mail className="h-4 w-4" />
              {mostrarMail ? "Cerrar el mail" : "Escribir por mail"}
            </button>

            {mostrarMail ? (
              <form className="space-y-2" onSubmit={enviarMail}>
                <input
                  className="field"
                  placeholder="Tu nombre"
                  value={form.name}
                  onChange={(evento) => setForm((actual) => ({ ...actual, name: evento.target.value }))}
                />
                <input
                  className="field"
                  type="email"
                  placeholder="Tu email"
                  value={form.email}
                  onChange={(evento) => setForm((actual) => ({ ...actual, email: evento.target.value }))}
                  required
                />
                <textarea
                  className="field min-h-24"
                  placeholder="Tu consulta"
                  value={form.message}
                  onChange={(evento) => setForm((actual) => ({ ...actual, message: evento.target.value }))}
                  required
                />
                <button className="btn-primary w-full justify-center" type="submit" disabled={enviando}>
                  {enviando ? "Enviando..." : "Enviar consulta"}
                </button>
              </form>
            ) : null}

            {resultado ? <p className="text-xs leading-5 text-tinta-suave">{resultado}</p> : null}
          </div>
        </div>
      ) : null}

      <button type="button" className="btn-secondary" onClick={() => setAbierto((valor) => !valor)}>
        <HelpCircle className="h-4 w-4 text-acento" />
        Ayuda
      </button>
    </div>
  );
}
