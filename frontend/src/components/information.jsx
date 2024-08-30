export default function Information() {
  return (
    <>
      <div className="container mx-auto px-4 md:px-5">
        <div className="md:flex md:space-x-10 items-center">
          <div
            className="p-5 md:p-0 w-full md:w-1/2"
            data-aos="fade-down"
            data-aos-easing="ease-out-cubic"
            data-aos-duration="2000"
          >
            <h1 className="text-3xl sm:text-5xl font-bold py-5">
              Decentralised Supply Chain Tracking
            </h1>
            <p className="text-gray-500 py-2">
              A decentralized application (dApp) built on top of the Concordium
              blockchain. This platform is designed to help users order and
              track the status of their orders in a supply chain.
            </p>
          </div>
          <div
            className="w-full md:w-1/2"
            data-aos="zoom-in"
            data-aos-easing="ease-out-cubic"
          >
            <img
              src="/img1.avif"
              alt=""
              className="rounded object-cover h-full w-full max-h-[350px] md:max-w-1/2"
            />
          </div>
        </div>
      </div>
    </>
  );
}
