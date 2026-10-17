import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { authApi, EVENTO_SESION_VENCIDA, type DetalleSesionVencida } from "../lib/api";
import {
  SIN_SESION,
  guardarSesion,
  leerSesionGuardada,
  olvidarSesion,
  type SesionGuardada,
} from "../lib/sesionGuardada";
import type { User } from "../lib/types";

interface AuthContextValue {
  token: string;
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (payload: { email: string; password: string }) => Promise<void>;
  register: (payload: { name: string; email: string; password: string }) => Promise<void>;
  logout: () => void;
  /** True cuando la última sesión no se cerró a mano: se venció. Lo usa la
   *  pantalla de ingreso para explicar por qué estás de nuevo acá. */
  sesionVencida: boolean;
  olvidarAvisoDeVencimiento: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<SesionGuardada>(leerSesionGuardada);
  const [isLoading, setIsLoading] = useState(false);
  const [sesionVencida, setSesionVencida] = useState(false);

  useEffect(() => {
    if (!auth.token || auth.user) {
      return;
    }

    setIsLoading(true);
    authApi
      .me(auth.token)
      .then((user) => {
        const next = { token: auth.token, user };
        guardarSesion(next);
        setAuth(next);
      })
      .catch(() => {
        olvidarSesion();
        setAuth(SIN_SESION);
      })
      .finally(() => setIsLoading(false));
  }, [auth.token, auth.user]);

  const setSession = (token: string, user: User) => {
    setSesionVencida(false);
    const next = { token, user };
    guardarSesion(next);
    setAuth(next);
  };

  const login = async (payload: { email: string; password: string }) => {
    setIsLoading(true);
    try {
      const session = await authApi.login(payload);
      const user = await authApi.me(session.access_token);
      setSession(session.access_token, user);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: { name: string; email: string; password: string }) => {
    setIsLoading(true);
    try {
      const session = await authApi.register(payload);
      const user = await authApi.me(session.access_token);
      setSession(session.access_token, user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    // A mano no es vencimiento: no hay nada que explicarle a nadie después.
    setSesionVencida(false);
    olvidarSesion();
    setAuth(SIN_SESION);
  };

  // Si el back rechaza nuestro token, la sesión ya no existe: se cierra acá y
  // la pantalla pasa sola a "Ingresar", en vez de quedar fingiendo que anda.
  //
  // Se compara **cuál** token rechazaron: una respuesta lenta de la sesión
  // anterior no puede cerrar la que acaba de abrirse. Sin esta comparación,
  // alguien con conexión lenta que vuelve a entrar mientras viaja un 401 viejo
  // entra bien y la aplicación lo echa sola un segundo después.
  useEffect(() => {
    const alVencer = (evento: Event) => {
      const rechazado = (evento as CustomEvent<DetalleSesionVencida>).detail?.token;
      if (rechazado && rechazado !== auth.token) {
        return;
      }
      olvidarSesion();
      setAuth(SIN_SESION);
      setSesionVencida(true);
    };
    window.addEventListener(EVENTO_SESION_VENCIDA, alVencer);
    return () => window.removeEventListener(EVENTO_SESION_VENCIDA, alVencer);
  }, [auth.token]);

  const value = useMemo<AuthContextValue>(
    () => ({
      token: auth.token,
      user: auth.user,
      isLoggedIn: Boolean(auth.token),
      isLoading,
      login,
      register,
      logout,
      sesionVencida,
      olvidarAvisoDeVencimiento: () => setSesionVencida(false),
    }),
    [auth.token, auth.user, isLoading, sesionVencida],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
