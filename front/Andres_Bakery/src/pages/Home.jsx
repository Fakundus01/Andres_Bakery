import { useRef } from "react";

const slides = [
  {
    title: "Torta de frutos del bosque",
    text: "Suave, esponjosa y con crema pastelera.",
    image:
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80",
    alt: "Torta con frutas",
  },
  {
    title: "Bowl de avena y miel",
    text: "Perfecto para mañanas tranquilas.",
    image:
      "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&w=900&q=80",
    alt: "Desayuno saludable",
  },
  {
    title: "Galletas de vainilla",
    text: "Con chips de chocolate artesanal.",
    image:
      "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=900&q=80",
    alt: "Galletas",
  },
];

export default function Home() {
  const sliderRef = useRef(null);

  const handleSlide = (direction) => {
    const track = sliderRef.current;
    if (!track) return;
    const scrollAmount = 324;
    track.scrollBy({
      left: direction === "next" ? scrollAmount : -scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <div className="page">
      <section className="hero">
        <div className="hero-text">
          <h2>Una cocina pastel con vibes de Stardew Valley</h2>
          <p>
            Bienvenidos a la página de recetas de nuestro emprendimiento.
            Descubrí sabores caseros, ingredientes frescos y un toque de
            nostalgia pixel.
          </p>
          <div className="hero-actions">
            <button className="primary" type="button">
              Ver recetas del día
            </button>
            <button className="secondary" type="button">
              Hacer un pedido
            </button>
          </div>
        </div>
        <div className="hero-card">
          <h3>Receta destacada</h3>
          <p>Panqueques de arándanos con miel de flores silvestres.</p>
          <ul>
            <li>⏱️ 25 min</li>
            <li>🍯 Nivel: Fácil</li>
            <li>🌾 Ingredientes locales</li>
          </ul>
        </div>
      </section>

      <section className="slider" aria-label="Galería de recetas">
        <div className="slider-track" ref={sliderRef}>
          {slides.map((slide) => (
            <article className="slide" key={slide.title}>
              <img src={slide.image} alt={slide.alt} />
              <div className="slide-info">
                <h4>{slide.title}</h4>
                <p>{slide.text}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="slider-controls">
          <button
            className="control"
            type="button"
            onClick={() => handleSlide("prev")}
          >
            ⟵
          </button>
          <button
            className="control"
            type="button"
            onClick={() => handleSlide("next")}
          >
            ⟶
          </button>
        </div>
      </section>

      <section className="section payment">
        <div className="section-header">
          <h2>Opciones de pago</h2>
          <p>Podés pagar en efectivo o usando Mercado Pago.</p>
        </div>
        <div className="payment-grid">
          <div className="payment-card">
            <h3>💵 Efectivo</h3>
            <p>Pagá al momento de la entrega o al retirar tu pedido.</p>
          </div>
          <div className="payment-card">
            <h3>💙 Mercado Pago</h3>
            <p>Alias de nuestra admin:</p>
            <div className="alias">ALIAS.MP.ADMIN</div>
          </div>
        </div>
      </section>
    </div>
  );
}