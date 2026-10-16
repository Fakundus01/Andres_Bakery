import { HashRouter } from "react-router-dom";

import { AuthProvider } from "./contexts/AuthContext";
import { CartProvider } from "./contexts/CartContext";
import { AppShell } from "./layout/AppShell";

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <CartProvider>
          <AppShell />
        </CartProvider>
      </AuthProvider>
    </HashRouter>
  );
}
