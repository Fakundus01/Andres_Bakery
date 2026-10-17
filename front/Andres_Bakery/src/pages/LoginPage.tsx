import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { AuthLayout, ErrorBanner, Field } from "../components/ui";
import { useAuth } from "../contexts/AuthContext";
import { getErrorMessage } from "../lib/format";

export function LoginPage() {
  const navigate = useNavigate();
  const { isLoggedIn, isLoading, login, user, sesionVencida } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  if (isLoggedIn) {
    return <Navigate to={user?.is_admin ? "/admin" : "/tienda"} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    try {
      await login(form);
      navigate("/tienda");
    } catch (reason: unknown) {
      setError(getErrorMessage(reason));
    }
  };

  return (
    <AuthLayout eyebrow="Acceso" title="Ingresá para comprar, seguir pedidos o administrar la tienda" description="La cuenta habilita historial de compras, checkout y dashboard para la admin." alternate={<Link to="/registro" className="font-semibold text-tinta underline">Crear cuenta</Link>}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Field label="Email"><input className="field" type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} required /></Field>
        <Field label="Contraseña"><input className="field" type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} required /></Field>
        {sesionVencida && !error ? (
          <p className="border-[3px] border-borde bg-alerta-suave px-4 py-3 text-sm leading-6 text-tinta">
            Tu sesión venció por tiempo. Volvé a entrar y seguís donde estabas.
          </p>
        ) : null}
        {error ? <ErrorBanner message={error} /> : null}
        <button className="btn-primary w-full justify-center" type="submit" disabled={isLoading}>{isLoading ? "Ingresando..." : "Ingresar"}</button>
      </form>
    </AuthLayout>
  );
}
