import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import '@rainbow-me/rainbowkit/styles.css';
import { ChakraProvider } from '@chakra-ui/react'
import {
  getDefaultWallets,
  RainbowKitProvider,
} from '@rainbow-me/rainbowkit';
import { configureChains, createConfig, WagmiConfig } from 'wagmi';
import { OasisSapphireTestnet } from './Chain'
import { jsonRpcProvider } from '@wagmi/core/providers/jsonRpc'

const { chains, publicClient } = configureChains(
  [OasisSapphireTestnet],
  [
    jsonRpcProvider({
      rpc: (chain) => ({ http: chain.rpcUrls.default.http[0] 
      }),
    }),
  ]
);

const { connectors } = getDefaultWallets({
  appName: 'Oasis Supply Chain Tracker',
  projectId: import.meta.env.VITE_OASIS_PROJECT_ID,
  chains
});

const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient
})



ReactDOM.createRoot(document.getElementById('root')).render(
  <WagmiConfig config={wagmiConfig}>
    <RainbowKitProvider chains={chains}>
      <React.StrictMode>
      <ChakraProvider>
        <App />
        </ChakraProvider>
      </React.StrictMode>,
    </RainbowKitProvider>
  </WagmiConfig>
)



