import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (event) => {
    event.preventDefault();
    login();
    navigate("/home");
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
          <input type="email" placeholder="tu@email.com" />
        </label>
        <label>
          Contraseña
          <input type="password" placeholder="******" />
        </label>
        <button type="submit" className="primary">
          Entrar
        </button>
      </form>
    </section>
  );
}