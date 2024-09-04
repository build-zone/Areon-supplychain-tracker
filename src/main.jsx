import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

import { ChakraProvider } from "@chakra-ui/react";
import ConnectWalletProvider from "./providers/ConnectWallet.jsx";
import { Toaster } from "react-hot-toast";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ChakraProvider>
      <ConnectWalletProvider>
        <App />
        <Toaster position="bottom-right" />
      </ConnectWalletProvider>
    </ChakraProvider>
  </React.StrictMode>
);
