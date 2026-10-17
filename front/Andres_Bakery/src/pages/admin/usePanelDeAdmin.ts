import { startTransition, useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import { useAuth } from "../../contexts/AuthContext";
import { metricsApi, ordersApi, productsApi, siteApi, tagsApi, usersApi } from "../../lib/api";
import { getErrorMessage } from "../../lib/format";
import type { Order, PerfilAndrea, Product, ResumenMetricas, Tag, User } from "../../lib/types";
import type { ProductForm, TagForm } from "../../lib/ui-types";

export const formularioDeProductoVacio: ProductForm = {
  name: "",
  description: "",
  steps: "",
  prep_note: "",
  price: "",
  unit_label: "unidad",
  min_qty: "1",
  qty_step: "1",
  category: "general",
  image_url: "",
  available: true,
  allows_pickup: true,
  allows_delivery: true,
  tag_ids: [],
};

export const formularioDeEtiquetaVacio: TagForm = { name: "", color_token: "acento", sort_order: "0" };

const perfilVacio: PerfilAndrea = {
  role: "",
  tagline: "",
  photo_url: "",
  location: "",
  socials: [],
  cv: {
    published: false,
    headline: "",
    summary: "",
    contact_email: "",
    file_url: "",
    skills: [],
    experience: [],
    education: [],
  },
};

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

  const cargar = useCallback(async () => {
    if (!token) {
      return;
    }
    setCargando(true);
    setError("");
    try {
      const [productosData, etiquetasData, ordenesData, usuariosData, historiaData, perfilData] =
        await Promise.all([
          productsApi.list(),
          tagsApi.list(),
          ordersApi.list(token),
          usersApi.list(token),
          siteApi.getAbout(),
          siteApi.getProfile(),
        ]);
      setProductos(productosData);
      setEtiquetas(etiquetasData);
      setOrdenes(ordenesData);
      setUsuarios(usuariosData);
      setHistoria(historiaData.content || "");
      setPerfil(perfilData);
    } catch (reason: unknown) {
      setError(getErrorMessage(reason));
    } finally {
      setCargando(false);
    }
  }, [token]);

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

  const conAviso = async (trabajo: () => Promise<void>, mensaje: string) => {
    setAviso("");
    try {
      await trabajo();
      setAviso(mensaje);
      recargar();
    } catch (reason: unknown) {
      setError(getErrorMessage(reason));
    }
  };

  const resetProducto = () => {
    setProductoEditado(null);
    setFormProducto(formularioDeProductoVacio);
  };

  const resetEtiqueta = () => {
    setEtiquetaEditada(null);
    setFormEtiqueta(formularioDeEtiquetaVacio);
  };

  const guardarProducto = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    void conAviso(async () => {
      const payload = {
        ...formProducto,
        price: Number(formProducto.price),
        min_qty: Number(formProducto.min_qty || 1),
        qty_step: Number(formProducto.qty_step || 1),
      };
      if (productoEditado) {
        await productsApi.update(productoEditado, payload, token);
      } else {
        await productsApi.create(payload, token);
      }
      resetProducto();
    }, "Producto guardado correctamente.");
  };

  const guardarEtiqueta = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    void conAviso(async () => {
      const payload = {
        name: formEtiqueta.name,
        color_token: formEtiqueta.color_token,
        sort_order: Number(formEtiqueta.sort_order || 0),
      };
      if (etiquetaEditada) {
        await tagsApi.update(etiquetaEditada, payload, token);
      } else {
        await tagsApi.create(payload, token);
      }
      resetEtiqueta();
    }, "Etiqueta guardada.");
  };

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
