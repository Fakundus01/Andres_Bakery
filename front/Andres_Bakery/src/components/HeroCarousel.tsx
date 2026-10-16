import { useEffect, useEffectEvent, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";

import { heroFallback } from "../lib/constants";
import type { Slide } from "../lib/ui-types";

export function HeroCarousel({ slides }: { slides: Slide[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const tick = useEffectEvent(() => {
    setCurrentIndex((current) => (current + 1) % slides.length);
  });

  useEffect(() => {
    if (slides.length <= 1) {
      return;
    }
    const id = window.setInterval(() => tick(), 5200);
    return () => window.clearInterval(id);
  }, [slides.length, tick]);

  const currentSlide = slides[currentIndex] ?? heroFallback[0];

  return (
    <div className="pixel-panel flex min-h-[520px] flex-col overflow-hidden p-0">
      {/* La foto va limpia: el pixel lo pone el marco, no la comida. */}
      <div className="relative flex-1">
        <img src={currentSlide.image} alt={currentSlide.title} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute left-5 top-5 inline-flex items-center gap-2 border-[3px] border-borde bg-superficie px-3 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-tinta">
          <Sparkles className="h-3.5 w-3.5 text-acento" />
          {currentSlide.eyebrow}
        </div>
        <div className="absolute right-5 top-5 flex items-center gap-1.5 border-[3px] border-borde bg-superficie p-1.5">
          {slides.map((slide, index) => (
            <button
              key={slide.title}
              type="button"
              className={`h-3 transition-all ${currentIndex === index ? "w-8 bg-acento" : "w-3 bg-superficie-alt"}`}
              onClick={() => setCurrentIndex(index)}
              aria-label={`Ir al slide ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Caja de dialogo: fondo solido, nada de velos encima de la foto. */}
      <div className="border-t-[4px] border-borde bg-superficie p-6 sm:p-8">
        <h1 className="font-display text-4xl font-bold leading-tight text-tinta sm:text-5xl">{currentSlide.title}</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-tinta-suave">{currentSlide.description}</p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link to={currentSlide.ctaTo} className="btn-primary">
            {currentSlide.ctaLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <span className="border-[3px] border-borde bg-acento-suave px-4 py-2 text-sm font-bold text-tinta">{currentSlide.accent}</span>
        </div>
      </div>
    </div>
  );
}
