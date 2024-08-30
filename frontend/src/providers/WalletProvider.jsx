/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react/prop-types */
// import React from 'react'

import {
  useConnect,
  useConnection,
  useGrpcClient,
} from "@concordium/react-components";
import { createContext, useContext, useEffect, useState } from "react";
import { BROWSER_WALLET, DEFAULT_CONTRACT_INDEX } from "../../config";
import { initContract } from "../utils";

const WalletContext = createContext();

const WalletProvider = ({ children, walletProps }) => {
  const [contract, setContract] = useState(null);

  const {
    setActiveConnectorType,
    activeConnector,
    connectedAccounts,
    genesisHashes,
    network,
  } = walletProps;

  const rpc = useGrpcClient(network);

  useEffect(() => {
    setActiveConnectorType(BROWSER_WALLET);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { connection, setConnection, account } = useConnection(
    connectedAccounts,
    genesisHashes
  );

  const { connect, isConnecting } = useConnect(activeConnector, setConnection);

  useEffect(() => {
    const getContract = async () => {
      const contractValue =
        rpc && (await initContract(rpc, DEFAULT_CONTRACT_INDEX));
      setContract(contractValue);
    };
    getContract();
  }, [rpc]);

  return (
    <WalletContext.Provider
      value={{
        walletProps,
        rpc,
        connection,
        connect,
        isConnecting,
        account,
        contract,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export default WalletProvider;

export const useWallet = () => {
  return useContext(WalletContext);
};
