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
    <div className="relative overflow-hidden rounded-[36px] border border-white/70 bg-stone-950 text-white shadow-2xl shadow-orange-950/15">
      <img src={currentSlide.image} alt={currentSlide.title} className="absolute inset-0 h-full w-full object-cover opacity-45" />
      <div className="absolute inset-0 bg-gradient-to-br from-stone-950/90 via-stone-950/60 to-orange-900/25" />
      <div className="relative flex h-full min-h-[520px] flex-col justify-between p-7 sm:p-10">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.34em] text-white/80">
          <Sparkles className="h-3.5 w-3.5" />
          {currentSlide.eyebrow}
        </div>
        <div>
          <h1 className="max-w-3xl font-display text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl">{currentSlide.title}</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/80 sm:text-lg">{currentSlide.description}</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link to={currentSlide.ctaTo} className="btn-primary bg-white text-stone-950 hover:bg-stone-100">
              {currentSlide.ctaLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white/85">{currentSlide.accent}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {slides.map((slide, index) => (
            <button key={slide.title} type="button" className={`h-2.5 rounded-full transition-all ${currentIndex === index ? "w-14 bg-white" : "w-6 bg-white/35"}`} onClick={() => setCurrentIndex(index)} aria-label={`Ir al slide ${index + 1}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
