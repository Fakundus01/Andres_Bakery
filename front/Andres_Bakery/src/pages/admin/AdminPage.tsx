import { useState } from "react";
import { Navigate } from "react-router-dom";

import { ErrorBanner, LoadingPanel, SectionHeading } from "../../components/ui";
import { useSiteConfig } from "../../contexts/SiteConfigContext";
import type { DashboardTab } from "../../lib/ui-types";
import { OpcionesTab } from "./OpcionesTab";
import { OrdersTab } from "./OrdersTab";
import { OverviewTab } from "./OverviewTab";
import { PerfilTab } from "./PerfilTab";
import { ProductsTab } from "./ProductsTab";
import { StoryTab } from "./StoryTab";
import { TagsTab } from "./TagsTab";
import { usePanelDeAdmin } from "./usePanelDeAdmin";

const PESTANAS: Array<{ key: DashboardTab; label: string }> = [
  { key: "overview", label: "Resumen" },
  { key: "products", label: "La carta" },
  { key: "tags", label: "Etiquetas" },
  { key: "opciones", label: "Gustos" },
  { key: "orders", label: "Pedidos" },
  { key: "perfil", label: "Tu perfil" },
  { key: "story", label: "Tu historia" },
];

export function AdminPage() {
  const panel = usePanelDeAdmin();
  const { config } = useSiteConfig();
  const [pestana, setPestana] = useState<DashboardTab>("overview");

  if (!panel.isLoggedIn) {
    return <Navigate to="/ingresar" replace />;
  }
  if (!panel.user?.is_admin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-8 pb-10">
      <SectionHeading
        eyebrow="Tu panel"
        title="Todo lo que vendés, desde una sola pantalla"
        description="Cargá la carta con su foto, mirá cómo viene la semana, escribí tu historia y mostrá tus redes."
      />

      <div className="flex flex-wrap gap-3">
        {PESTANAS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={pestana === tab.key ? "btn-primary" : "btn-secondary"}
            onClick={() => setPestana(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {panel.cargando ? <LoadingPanel label="Cargando el panel" /> : null}
      {panel.error ? <ErrorBanner message={panel.error} /> : null}
      {panel.aviso ? (
        <div className="pixel-panel-plano bg-exito-suave px-5 py-4 text-sm text-tinta">{panel.aviso}</div>
      ) : null}

      {pestana === "overview" ? (
        <OverviewTab
          resumen={panel.resumen}
          dias={panel.dias}
          onDias={panel.setDias}
          cargando={panel.cargandoMetricas}
          ordenes={panel.ordenes}
        />
      ) : null}

      {pestana === "products" ? (
        <ProductsTab
          products={panel.productos}
          tags={panel.etiquetas}
          gruposDeOpciones={panel.gruposDeOpciones}
          ingredientes={panel.ingredientes}
          usosDeIngredientes={panel.usosDeIngredientes}
          onCrearIngrediente={panel.crearIngrediente}
          onRenombrarIngrediente={panel.renombrarIngrediente}
          onBorrarIngrediente={panel.borrarIngrediente}
          productForm={panel.formProducto}
          setProductForm={panel.setFormProducto}
          editingProductId={panel.productoEditado}
          setEditingProductId={panel.setProductoEditado}
          onSubmit={panel.guardarProducto}
          onReset={panel.resetProducto}
          onDelete={panel.borrarProducto}
          token={panel.token}
          iaPrendida={Boolean(config?.ai_enabled)}
        />
      ) : null}

      {pestana === "tags" ? (
        <TagsTab
          tags={panel.etiquetas}
          products={panel.productos}
          tagForm={panel.formEtiqueta}
          setTagForm={panel.setFormEtiqueta}
          editingTagId={panel.etiquetaEditada}
          setEditingTagId={panel.setEtiquetaEditada}
          onSubmit={panel.guardarEtiqueta}
          onReset={panel.resetEtiqueta}
          onDelete={panel.borrarEtiqueta}
        />
      ) : null}

      {pestana === "opciones" ? (
        <OpcionesTab
          grupos={panel.gruposDeOpciones}
          usos={panel.usosDeGrupos}
          buscarGrupo={panel.buscarGrupo}
          etiquetaLista={panel.etiquetaDeTortasLista}
          onCrearEtiqueta={panel.crearEtiquetaDeTortas}
          onCrearGrupo={panel.crearGrupoDeOpciones}
          onRenombrarGrupo={panel.renombrarGrupoDeOpciones}
          onObligatoriedad={panel.cambiarObligatoriedadDelGrupo}
          onBorrarGrupo={panel.borrarGrupoDeOpciones}
          onCrearOpcion={panel.crearOpcionDelGrupo}
          onRenombrarOpcion={panel.renombrarOpcionDelGrupo}
          onBorrarOpcion={panel.borrarOpcionDelGrupo}
        />
      ) : null}

      {pestana === "orders" ? (
        <OrdersTab orders={panel.ordenes} onUpdateStatus={panel.cambiarEstadoDePedido} />
      ) : null}

      {pestana === "perfil" ? (
        <PerfilTab
          perfil={panel.perfil}
          setPerfil={panel.setPerfil}
          onGuardar={panel.guardarPerfil}
          token={panel.token}
        />
      ) : null}

      {pestana === "story" ? (
        <StoryTab aboutContent={panel.historia} setAboutContent={panel.setHistoria} onSave={panel.guardarHistoria} />
      ) : null}
    </div>
  );
}
