import { useWallet } from "../providers/WalletProvider";
import Button from "./button";

export default function Navbar() {
  const { account, connect, isConnecting } = useWallet();

  //   console.log(account);
  return (
    <>
      <div className="fixed bg-white w-full border-b p-5 z-50">
        <div className="md:max-w-7xl mx-auto">
          <div className="flex justify-between items-center space-x-5 md:space-x-10">
            <div className="flex space-x-2 md:space-x-3 items-center font-extrabold">
              <img
                src="/logo.png"
                alt=""
                className="rounded-full object-cover h-12 w-12"
              />
              <span className="text-2xl md:text-4xl text-emerald-900">
                Supply Chain Tracker
              </span>
            </div>
            <div className="flex space-x-5">
              {account ? (
                <div>
                  {/* <p>Connected: {account} </p> */}
                  <p>Connected </p>
                </div>
              ) : (
                <Button
                  title="Connect Wallet"
                  bgColor="bg-[#064E3B]"
                  disabled={isConnecting}
                  onClick={connect}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
