import { HashRouter } from "react-router-dom";

import { AuthProvider } from "./contexts/AuthContext";
import { CartProvider } from "./contexts/CartContext";
import { AppShell } from "./layout/AppShell";
import { PreferencesProvider } from "./preferencias/PreferencesProvider";

export default function App() {
  return (
    <PreferencesProvider>
      <HashRouter>
        <AuthProvider>
          <CartProvider>
            <AppShell />
          </CartProvider>
        </AuthProvider>
      </HashRouter>
    </PreferencesProvider>
  );
}
