/* eslint-disable react/prop-types */
"use client";
import { TESTNET, WithWalletConnector } from "@concordium/react-components";
import { BROWSER_WALLET } from "../../config";
import WalletProvider from "./WalletProvider";
const ConnectWalletProvider = ({ children }) => {
  return (
    <WithWalletConnector
      network={TESTNET}
      setActiveConnectorType={BROWSER_WALLET}
    >
      {(walletProps) => (
        <WalletProvider walletProps={walletProps}>{children}</WalletProvider>
      )}
    </WithWalletConnector>
  );
};

export default ConnectWalletProvider;
