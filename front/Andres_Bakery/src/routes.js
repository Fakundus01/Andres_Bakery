import Home from "./pages/Home.jsx";
import Recipes from "./pages/Recipes.jsx";
import Orders from "./pages/Orders.jsx";
import Admin from "./pages/Admin.jsx";
import About from "./pages/About.jsx";
import Contact from "./pages/Contact.jsx";
import Login from "./auth/Login.jsx";
import Signup from "./auth/Signup.jsx";

export const routes = {
  "": Home,
  "#/home": Home,
  "#/recetas": Recipes,
  "#/pedidos": Orders,
  "#/admin": Admin,
  "#/sobre-nosotros": About,
  "#/contactanos": Contact,
  "#/login": Login,
  "#/signup": Signup,
};