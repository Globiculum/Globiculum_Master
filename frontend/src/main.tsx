import { createRoot } from "react-dom/client";
import App from "./App.tsx";
// Fonts are served from this site, not Google Fonts, so a visit doesn't send
// the visitor's IP address to Google. Poppins: headings and UI; Carlito: body.
import "@fontsource/poppins/300.css";
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";
import "@fontsource/poppins/800.css";
import "@fontsource/carlito/400.css";
import "@fontsource/carlito/700.css";
import "@fontsource/carlito/400-italic.css";
import "@fontsource/carlito/700-italic.css";
import "./index.css";
import { installChildDataCleanup } from "./lib/childDataStorage";

installChildDataCleanup();

createRoot(document.getElementById("root")!).render(<App />);
