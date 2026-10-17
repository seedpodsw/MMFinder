import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import CookieNotice from "./CookieNotice";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
    <CookieNotice />
  </React.StrictMode>
);
