import { startTransition, useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import { useAuth } from "../../contexts/AuthContext";
import {
  ingredientsApi,
  metricsApi,
  optionGroupsApi,
  ordersApi,
  productsApi,
  siteApi,
  tagsApi,
  usersApi,
} from "../../lib/api";
import { getErrorMessage } from "../../lib/format";
import { guardadosDelPanel } from "./guardadosDelPanel";
import type { Order, PerfilAndrea, Product, ResumenMetricas, Tag, User } from "../../lib/types";
import type { ProductForm, TagForm } from "../../lib/ui-types";
import { accionesDeIngredientes } from "./accionesDeIngredientes";
import { accionesDeOpciones } from "./accionesDeOpciones";
import {
  formularioDeEtiquetaVacio,
  formularioDeProductoVacio,
  perfilVacio,
} from "./valoresIniciales";
import { useIngredientesDelPanel } from "./useIngredientesDelPanel";
import { useOpcionesDelPanel } from "./useOpcionesDelPanel";

export {
  formularioDeEtiquetaVacio,
  formularioDeProductoVacio,
} from "./valoresIniciales";

/** Todo el estado del panel, fuera de la pantalla.
 *
 *  Vive acá y no en `AdminPage` porque el panel pasó de 5 a 7 pestañas y el
 *  archivo se iba de 300 líneas (R05). La pantalla arma el layout; esto sabe
 *  pedir, guardar y recargar.
 */
export function usePanelDeAdmin() {
  const { token, user, isLoggedIn } = useAuth();
  const esAdmin = Boolean(isLoggedIn && user?.is_admin);

  const [cargando, setCargando] = useState(true);
  const [cargandoMetricas, setCargandoMetricas] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  const [productos, setProductos] = useState<Product[]>([]);
  const [etiquetas, setEtiquetas] = useState<Tag[]>([]);
  const [ordenes, setOrdenes] = useState<Order[]>([]);
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [historia, setHistoria] = useState("");
  const [perfil, setPerfil] = useState<PerfilAndrea>(perfilVacio);
  const [resumen, setResumen] = useState<ResumenMetricas | null>(null);
  const [dias, setDias] = useState(30);

  const [productoEditado, setProductoEditado] = useState<number | null>(null);
  const [etiquetaEditada, setEtiquetaEditada] = useState<number | null>(null);
  const [formProducto, setFormProducto] = useState<ProductForm>(formularioDeProductoVacio);
  const [formEtiqueta, setFormEtiqueta] = useState<TagForm>(formularioDeEtiquetaVacio);

  const { renombrar, borrar, ...ingredientes } = useIngredientesDelPanel({
    token,
    productos,
    avisarError: (motivo: unknown) => setError(getErrorMessage(motivo)),
  });
  const { recibirIngredientes } = ingredientes;

  const {
    crearEtiquetaDeTortas,
    crearGrupo,
    renombrarGrupo,
    cambiarObligatoriedad,
    borrarGrupo,
    crearOpcion,
    renombrarOpcion,
    borrarOpcion,
    ...opciones
  } = useOpcionesDelPanel({ token, productos, etiquetas });
  const { recibirGruposDeOpciones } = opciones;

  const cargar = useCallback(async () => {
    if (!token) {
      return;
    }
    setCargando(true);
    setError("");
    try {
      const [
        productosData,
        etiquetasData,
        ingredientesData,
        ordenesData,
        usuariosData,
        historiaData,
        perfilData,
        gruposData,
      ] = await Promise.all([
        productsApi.list(),
        tagsApi.list(),
        ingredientsApi.list(),
        ordersApi.list(token),
        usersApi.list(token),
        siteApi.getAbout(),
        siteApi.getProfile(),
        optionGroupsApi.list(),
      ]);
      setProductos(productosData);
      setEtiquetas(etiquetasData);
      recibirIngredientes(ingredientesData);
      setOrdenes(ordenesData);
      setUsuarios(usuariosData);
      setHistoria(historiaData.content || "");
      setPerfil(perfilData);
      recibirGruposDeOpciones(gruposData);
    } catch (reason: unknown) {
      setError(getErrorMessage(reason));
    } finally {
      setCargando(false);
    }
  }, [token, recibirIngredientes, recibirGruposDeOpciones]);

  const cargarMetricas = useCallback(
    async (cuantosDias: number) => {
      if (!token) {
        return;
      }
      setCargandoMetricas(true);
      try {
        setResumen(await metricsApi.resumen(cuantosDias, token));
      } catch (reason: unknown) {
        setError(getErrorMessage(reason));
      } finally {
        setCargandoMetricas(false);
      }
    },
    [token],
  );

  useEffect(() => {
    if (esAdmin) {
      void cargar();
    }
  }, [esAdmin, cargar]);

  useEffect(() => {
    if (esAdmin) {
      void cargarMetricas(dias);
    }
  }, [esAdmin, dias, cargarMetricas]);

  const recargar = () =>
    startTransition(() => {
      void cargar();
      void cargarMetricas(dias);
    });

  /** Devuelve si salió bien: es lo que deja **cerrar el pop-up solo cuando se
   *  guardó**. Cerrarlo siempre perdía lo tipeado si el back decía no (lo
   *  marcó el reviewer de T19). */
  const conAviso = async (trabajo: () => Promise<void>, mensaje: string): Promise<boolean> => {
    setAviso("");
    try {
      await trabajo();
      setAviso(mensaje);
      recargar();
      return true;
    } catch (reason: unknown) {
      setError(getErrorMessage(reason));
      return false;
    }
  };

  /** Lo borrado se va de la copia del formulario (ver `accionesDeIngredientes`). */
  const olvidarDelFormulario = (campo: "ingredient_ids" | "option_group_ids") => (id: number) =>
    setFormProducto((actual) => ({
      ...actual,
      [campo]: actual[campo].filter((elegido) => elegido !== id),
    }));

  const accionesSobreIngredientes = accionesDeIngredientes(
    { renombrar, borrar },
    conAviso,
    olvidarDelFormulario("ingredient_ids"),
  );

  const accionesSobreOpciones = accionesDeOpciones(
    {
      crearEtiquetaDeTortas,
      crearGrupo,
      renombrarGrupo,
      cambiarObligatoriedad,
      borrarGrupo,
      crearOpcion,
      renombrarOpcion,
      borrarOpcion,
    },
    conAviso,
    olvidarDelFormulario("option_group_ids"),
  );

  const resetProducto = () => {
    setProductoEditado(null);
    setFormProducto(formularioDeProductoVacio);
  };

  const resetEtiqueta = () => {
    setEtiquetaEditada(null);
    setFormEtiqueta(formularioDeEtiquetaVacio);
  };

  const { guardarProducto, guardarEtiqueta } = guardadosDelPanel({
    token,
    conAviso,
    setError,
    producto: { editado: productoEditado, form: formProducto, reset: resetProducto },
    etiqueta: { editada: etiquetaEditada, form: formEtiqueta, reset: resetEtiqueta },
  });

  const metricasDeLaCarta = useMemo(
    () => ({ sinPrecio: productos.filter((producto) => producto.price === 0).length }),
    [productos],
  );

  return {
    token,
    user,
    isLoggedIn,
    esAdmin,
    cargando,
    cargandoMetricas,
    error,
    aviso,
    productos,
    etiquetas,
    ...ingredientes,
    ...accionesSobreIngredientes,
    ...opciones,
    ...accionesSobreOpciones,
    ordenes,
    usuarios,
    historia,
    setHistoria,
    perfil,
    setPerfil,
    resumen,
    dias,
    setDias,
    metricasDeLaCarta,
    productoEditado,
    setProductoEditado,
    etiquetaEditada,
    setEtiquetaEditada,
    formProducto,
    setFormProducto,
    formEtiqueta,
    setFormEtiqueta,
    resetProducto,
    resetEtiqueta,
    guardarProducto,
    guardarEtiqueta,
    guardarHistoria: () =>
      void conAviso(() => siteApi.updateAbout(historia, token).then(() => undefined), "Contenido del sitio actualizado."),
    guardarPerfil: () =>
      void conAviso(() => siteApi.updateProfile(perfil, token).then(() => undefined), "Tu perfil quedó guardado."),
    borrarProducto: (id: number) =>
      void conAviso(() => productsApi.remove(id, token).then(() => undefined), "Producto eliminado."),
    borrarEtiqueta: (id: number) =>
      void conAviso(
        () => tagsApi.remove(id, token).then(() => undefined),
        "Etiqueta eliminada. Los productos que la tenían siguen igual.",
      ),
    cambiarEstadoDePedido: (id: number, estado: string) =>
      void conAviso(
        () => ordersApi.updateStatus(id, estado, token).then(() => undefined),
        `Pedido #${id} actualizado a ${estado}.`,
      ),
  };
}
