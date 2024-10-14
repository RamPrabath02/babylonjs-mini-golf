// src/main.jsx

import React from "react";
import ReactDOM from "react-dom/client"; // Corrected the import
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
