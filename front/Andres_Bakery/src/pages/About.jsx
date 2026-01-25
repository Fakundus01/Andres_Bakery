import { useEffect, useState } from "react";

import { SiteApi } from "../../api/siteApi.js";

export default function About() {
  const [content, setContent] = useState("");

  useEffect(() => {
    SiteApi.getAbout()
      .then((data) => {
        setContent(data.content || "");
      })
      .catch(() => {
        setContent(
          "Somos un emprendimiento familiar que cocina con ingredientes frescos y recetas con amor de hogar."
        );
      });
  }, []);

  return (
    <section className="section info">
      <div className="section-header">
        <h2>Sobre nosotros</h2>
        <p>{content}</p>
      </div>
      <div className="info-cards">
        <div className="info-card">
          <h3>🌾 Ingredientes locales</h3>
          <p>Trabajamos con productores cercanos para cuidar la calidad.</p>
        </div>
        <div className="info-card">
          <h3>🧺 Producción artesanal</h3>
          <p>Cada receta se prepara a mano y con tiempos cuidados.</p>
        </div>
        <div className="info-card">
          <h3>💌 Atención cálida</h3>
          <p>Te acompañamos para elegir tu pedido ideal.</p>
        </div>
      </div>
    </section>
  );
}
