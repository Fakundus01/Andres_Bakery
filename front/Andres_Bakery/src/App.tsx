import { HashRouter } from "react-router-dom";

import { AuthProvider } from "./contexts/AuthContext";
import { AvisosProvider } from "./contexts/AvisosContext";
import { CartProvider } from "./contexts/CartContext";
import { SiteConfigProvider } from "./contexts/SiteConfigContext";
import { RegionDeAvisos } from "./components/RegionDeAvisos";
import { AppShell } from "./layout/AppShell";
import { PreferencesProvider } from "./preferencias/PreferencesProvider";

export default function App() {
  return (
    <PreferencesProvider>
      <HashRouter>
        {/* Adentro del router porque el aviso del carrito lleva un `Link`, y
            por encima de los demás contextos para que cualquiera pueda avisar. */}
        <AvisosProvider>
          <AuthProvider>
            <SiteConfigProvider>
              <CartProvider>
                <AppShell />
                <RegionDeAvisos />
              </CartProvider>
            </SiteConfigProvider>
          </AuthProvider>
        </AvisosProvider>
      </HashRouter>
    </PreferencesProvider>
  );
}
