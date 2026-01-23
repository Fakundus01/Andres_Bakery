export default function Login() {
  return (
    <section className="section auth">
      <div className="section-header">
        <h2>Login</h2>
        <p>Acceso simple y sin autenticación real (demo).</p>
      </div>
      <form className="auth-form">
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