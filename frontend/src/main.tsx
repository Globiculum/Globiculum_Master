import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installChildDataCleanup } from "./lib/childDataStorage";

installChildDataCleanup();

createRoot(document.getElementById("root")!).render(<App />);
