import { useEffect, useState, type FormEvent } from "react";
import { MessageCircle, Send, X } from "lucide-react";

import { useAuth } from "../contexts/AuthContext";
import { contactApi } from "../lib/api";
import { supportReplies } from "../lib/constants";
import { getErrorMessage } from "../lib/format";
import type { ChatMessage } from "../lib/ui-types";

export function SupportChat() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "bot", text: "Hola, soy el asistente de Andres Bakery. Puedo ayudarte con envíos en Villa Maipú, pagos o pedidos personalizados." }]);
  const [form, setForm] = useState({ name: user?.name ?? "", email: user?.email ?? "", message: "" });
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    setForm((current) => ({ ...current, name: user?.name ?? current.name, email: user?.email ?? current.email }));
  }, [user?.email, user?.name]);

  const addReply = (label: string, answer: string) => {
    setMessages((current) => [...current, { role: "user", text: label }, { role: "bot", text: answer }]);
  };

  const handleSend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSending(true);
    setFeedback("");
    try {
      await contactApi.send({ name: form.name || "Cliente web", email: form.email || "sin-email@local.dev", message: form.message });
      setMessages((current) => [...current, { role: "user", text: form.message }, { role: "bot", text: "Mensaje enviado. La admin lo va a recibir por mail para darte seguimiento." }]);
      setForm((current) => ({ ...current, message: "" }));
      setFeedback("Consulta enviada correctamente.");
    } catch (reason: unknown) {
      setFeedback(getErrorMessage(reason));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed bottom-6 left-6 z-50 w-[min(380px,calc(100vw-32px))]">
      {isOpen ? (
        <div className="pixel-panel overflow-hidden">
          <div className="flex items-center justify-between bg-tinta px-5 py-4 text-crema">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-crema/60">Soporte</p>
              <h3 className="mt-1 font-display text-2xl font-semibold">Chat guiado</h3>
            </div>
            <button type="button" onClick={() => setIsOpen(false)}><X className="h-5 w-5" /></button>
          </div>
          <div className="max-h-80 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`max-w-[88%] px-4 py-3 text-sm leading-6 ${message.role === "bot" ? "bg-superficie-alt text-tinta-suave" : "ml-auto bg-tinta text-crema"}`}>
                {message.text}
              </div>
            ))}
          </div>
          <div className="border-t-[3px] border-borde px-4 py-4">
            <div className="flex flex-wrap gap-2">
              {supportReplies.map((reply) => (
                <button key={reply.label} className="btn-secondary text-xs" type="button" onClick={() => addReply(reply.label, reply.answer)}>{reply.label}</button>
              ))}
            </div>
            <form className="mt-4 space-y-3" onSubmit={handleSend}>
              <input className="field" placeholder="Tu nombre" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
              <input className="field" placeholder="Tu email" type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
              <textarea className="field min-h-24" placeholder="Escribí tu consulta" value={form.message} onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))} required />
              {feedback ? <p className="text-xs text-tinta-tenue">{feedback}</p> : null}
              <button className="btn-primary w-full justify-center" type="submit" disabled={sending}><Send className="h-4 w-4" />{sending ? "Enviando..." : "Enviar consulta"}</button>
            </form>
          </div>
        </div>
      ) : null}
      <button type="button" className="btn-secondary" onClick={() => setIsOpen((value) => !value)}>
        <MessageCircle className="h-4 w-4 text-acento" />
        Soporte guiado
      </button>
    </div>
  );
}
