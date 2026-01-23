export default function Navbar() {
  return (
    <header className="navbar">
      <div className="navbar-brand">
        <span className="logo-pixel">AB</span>
        <div>
          <h1>Andres Bakery</h1>
          <p>Recetas dulces y saladas con magia de granja</p>
        </div>
      </div>
      <nav className="navbar-links">
        <a href="#/home">Home</a>
        <a href="#/sobre-nosotros">Sobre nosotros</a>
        <a href="#/contactanos">Contactanos</a>
        <a href="#/login">Login</a>
        <a href="#/signup">Sign up</a>
      </nav>
    </header>
  );
}