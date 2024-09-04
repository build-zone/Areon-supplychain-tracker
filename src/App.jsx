import SupplyChain from "./components/supplyChainTracker";
import Navbar from "./components/navbar";
import Information from "./components/information";
import Footer from "./components/footer";

export default function App() {
  return (
    <div className="h-screen w-screen">
      <Navbar />
      <div className=" h-[100%] mx-auto pt-32 flex flex-col justify-between">
        <div>
          <div>
            <Information />
          </div>
          <div>
            <SupplyChain />
          </div>
        </div>
        <Footer />
      </div>
    </div>
  );
}
