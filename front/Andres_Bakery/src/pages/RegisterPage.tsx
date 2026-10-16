import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { AuthLayout, ErrorBanner, Field } from "../components/ui";
import { useAuth } from "../contexts/AuthContext";
import { getErrorMessage } from "../lib/format";

export function RegisterPage() {
  const navigate = useNavigate();
  const { isLoggedIn, isLoading, register, user } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");

  if (isLoggedIn) {
    return <Navigate to={user?.is_admin ? "/admin" : "/tienda"} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    try {
      await register(form);
      navigate("/tienda");
    } catch (reason: unknown) {
      setError(getErrorMessage(reason));
    }
  };

  return (
    <AuthLayout eyebrow="Cuenta nueva" title="Creá tu cuenta para comprar y recibir confirmaciones" description="El registro conecta carrito, historial y mails de confirmación de compra en un mismo recorrido." alternate={<Link to="/ingresar" className="font-semibold text-tinta underline">Ya tengo cuenta</Link>}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Field label="Nombre"><input className="field" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required /></Field>
        <Field label="Email"><input className="field" type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} required /></Field>
        <Field label="Contraseña"><input className="field" type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} required /></Field>
        {error ? <ErrorBanner message={error} /> : null}
        <button className="btn-primary w-full justify-center" type="submit" disabled={isLoading}>{isLoading ? "Creando cuenta..." : "Crear cuenta"}</button>
      </form>
    </AuthLayout>
  );
}
