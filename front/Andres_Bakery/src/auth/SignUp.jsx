export default function Signup() {
  return (
    <section className="section auth">
      <div className="section-header">
        <h2>Sign up</h2>
        <p>Registro simple para acceder a recetas y pedidos.</p>
      </div>
      <form className="auth-form">
        <label>
          Nombre
          <input type="text" placeholder="Nombre y apellido" />
        </label>
        <label>
          Email
          <input type="email" placeholder="tu@email.com" />
        </label>
        <label>
          Contraseña
          <input type="password" placeholder="******" />
        </label>
        <button type="submit" className="secondary">
          Crear cuenta
        </button>
      </form>
    </section>
  );
}