import SupplyChain from './components/supplyChainTracker';
import Navbar from './components/navbar';
import Information from './components/information';
import Footer from './components/footer';

export default function App() {

  return (
    <>
      <Navbar />
      <div className="md:max-w-7xl mx-auto pt-32">
        <div>
          <Information />
        </div>
        <div>
          <SupplyChain />
        </div>
      </div>
      <Footer />
    </>
  );
}
