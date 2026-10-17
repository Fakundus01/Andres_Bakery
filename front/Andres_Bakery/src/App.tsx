import { HashRouter } from "react-router-dom";

import { AuthProvider } from "./contexts/AuthContext";
import { CartProvider } from "./contexts/CartContext";
import { SiteConfigProvider } from "./contexts/SiteConfigContext";
import { AppShell } from "./layout/AppShell";
import { PreferencesProvider } from "./preferencias/PreferencesProvider";

export default function App() {
  return (
    <PreferencesProvider>
      <HashRouter>
        <AuthProvider>
          <SiteConfigProvider>
            <CartProvider>
              <AppShell />
            </CartProvider>
          </SiteConfigProvider>
        </AuthProvider>
      </HashRouter>
    </PreferencesProvider>
  );
}
