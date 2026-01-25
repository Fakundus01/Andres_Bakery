import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { AuthApi } from "../../api/authApi.js";
import { useAuth } from "../auth/AuthContext.jsx";

export default function Login() {
  const { setSession } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("idle");  

   const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setStatus("loading");

    try {
      const response = await AuthApi.login(email, password);
      const token = response.access_token;
      const profile = await AuthApi.me(token);
      setSession(token, profile);
      navigate("/home");
    } catch (err) {
      setError(err.message);
    } finally {
      setStatus("idle");
    }
  };

  return (
    <section className="section auth">
      <div className="section-header">
        <h2>Login</h2>
        <p>Acceso simple y sin autenticación real (demo).</p>
      </div>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Email
          <input
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            placeholder="******"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        <button type="submit" className="primary" disabled={status === "loading"}>
          {status === "loading" ? "Ingresando..." : "Entrar"}
        </button>
        {error && <p>{error}</p>}
      </form>
    </section>
  );
}