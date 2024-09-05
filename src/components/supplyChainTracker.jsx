import { useState, useEffect, useCallback, useMemo } from "react";
import { Button, Input, Select } from "@chakra-ui/react";
import { useWallet } from "../providers/WalletProvider";
import { moduleSchemaFromBase64 } from "@concordium/react-components";
import {
  ContractAddress,
  ReceiveName,
  AccountTransactionType,
  EntrypointName,
  Energy,
  CcdAmount,
  AccountAddress,
  SchemaVersion,
  ContractName,
  deserializeReceiveReturnValue,
} from "@concordium/web-sdk";
import { Buffer } from "buffer/";
import {
  CONTRACT_NAME,
  MAX_CONTRACT_EXECUTION_ENERGY,
  VERIFIER_URL,
} from "../../config";

import toast from "react-hot-toast";
import { detectConcordiumProvider } from "@concordium/browser-wallet-api-helpers";
import { authorize, getChallenge } from "../utils";
import { countries } from "countries-list";
import ReactSelect from "react-select";

const SupplyChain = () => {
  const [products, setProducts] = useState();
  const [orders, setOrders] = useState();
  const [itemId, setItemId] = useState("");
  const [itemDetails, setItemDetails] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loadingStates, setLoadingStates] = useState({
    search: false,
    order: false,
    create: false,
  });
  const [actionLoadingStates, setActionLoadingStates] = useState({});
  // const toast = useToast();
  // New state for creating product
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("");
  const [newProductLocation, setNewProductLocation] = useState();

  const { rpc, contract, connection, account } = useWallet();

  const getStatusText = (statusObject) => {
    const statusMap = {
      Ordered: "Ordered",
      Approved: "Approved",
      Shipped: "Shipped",
      Delivered: "Delivered",
      Cancelled: "Cancelled",
    };

    // Extract the key from the passed object
    const statusKey = Object.keys(statusObject)[0];

    // Return the corresponding value from the map or an empty string if not found
    return statusMap[statusKey] || "";
  };

  const displayPartialAddress = (address) => {
    if (address && address.length > 7) {
      return `${address.substring(0, 3)}...${address.substring(
        address.length - 4
      )}`;
    } else if (address && Object.keys(address) == `None`) {
      return "";
    } else if (address && Object.keys(address) == `Some`) {
      let val = address.Some[0];
      return `${val.substring(0, 3)}...${val.substring(val.length - 4)}`;
    }
  };

  const getItem = () => {
    const item = orders.find(
      (order) => Number(order.order_id) === Number(itemId)
    );
    setItemDetails(item);
    console.log(item);
  };

  const isCreateButtonDisabled = () => {
    return (
      !newProductName.trim() ||
      !newProductPrice.trim() ||
      // !newProductLocation.trim() ||
      isNaN(parseFloat(newProductPrice)) ||
      parseFloat(newProductPrice) <= 0
    );
  };

  const createProduct = async () => {
    if (
      !newProductName.trim() ||
      !newProductPrice.trim() ||
      // !newProductLocation.trim()
      newProductLocation.length === 0
    ) {
      toast.error("All fields are required to create a new product");
      return;
    }
    const loading = toast.loading("Creating product...");
    try {
      const schema = await rpc?.getEmbeddedSchema(contract?.sourceModule);

      // convert schema to base64……..
      const schemaToBase64 = btoa(
        new Uint8Array(schema).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ""
        )
      );

      // create params……..
      const params = {
        parameters: {
          name: newProductName,
          location: newProductLocation,
          price: Number(newProductPrice),
        },
        schema: moduleSchemaFromBase64(schemaToBase64),
      };

      const transaction = await connection?.signAndSendTransaction(
        account,
        AccountTransactionType.Update,
        {
          amount: CcdAmount.fromCcd(0),
          address: ContractAddress.create(contract.index, 0),
          receiveName: ReceiveName.create(
            contract.name,
            EntrypointName.fromString("add_product")
          ),
          maxContractExecutionEnergy: Energy.create(
            MAX_CONTRACT_EXECUTION_ENERGY
          ),
        },
        params
      );
      transaction &&
        toast.success("Product successfully created", {
          id: loading,
        });
      setTimeout(async () => {
        await getProducts();
      }, 10000);
      return transaction;
    } catch (error) {
      toast.error("Error creating product", {
        id: loading,
      });
      console.error(error);
    }
  };

  const getProducts = async () => {
    toast.dismiss();
    const loading = toast.loading("Getting products...");

    const receiveName = "get_all_products";

    try {
      if (contract) {
        const result = await rpc?.invokeContract({
          contract: contract && ContractAddress?.create(contract?.index, 0),
          method:
            contract &&
            ReceiveName?.create(
              contract?.name,
              EntrypointName?.fromString(receiveName)
            ),
          invoker: account && AccountAddress?.fromJSON(account),
        });
        console.log(result.returnValue);
        const buffer = Buffer?.from(result?.returnValue?.buffer).buffer;
        const contract_schema = await rpc?.getEmbeddedSchema(
          contract?.sourceModule
        );
        const newschema = Buffer?.from(contract_schema).buffer;

        console.log(newschema);
        const name = ContractName?.fromString(CONTRACT_NAME);
        const entry_point = EntrypointName?.fromString(receiveName);
        console.log(contract_schema);

        const values = await deserializeReceiveReturnValue(
          buffer,
          contract_schema,
          name,
          entry_point,
          SchemaVersion?.V1
        );
        console.log("values", values);
        setProducts(values);
        values &&
          toast.success("Fetched Products", {
            id: loading,
          });

        return values;
      }
    } catch (err) {
      console.error("Error fetching products:", err);
      toast.error("Error fetching products", {
        id: loading,
      });
    }
  };

  const orderItem = async (product) => {
    const loading = toast.loading("Ordering product");

    console.log(product);

    try {
      const schema = await rpc?.getEmbeddedSchema(contract?.sourceModule);

      // convert schema to base64……..
      const schemaToBase64 = btoa(
        new Uint8Array(schema).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ""
        )
      );

      // create params……..
      const params = {
        parameters: Number(product?.id),
        schema: moduleSchemaFromBase64(schemaToBase64),
      };

      const transaction = await connection?.signAndSendTransaction(
        account,
        AccountTransactionType.Update,
        {
          amount: CcdAmount.fromCcd(Number(product.price)),
          address: ContractAddress.create(contract.index, 0),
          receiveName: ReceiveName.create(
            contract.name,
            EntrypointName.fromString("order_product")
          ),
          maxContractExecutionEnergy: Energy.create(
            MAX_CONTRACT_EXECUTION_ENERGY
          ),
        },
        params
      );
      transaction &&
        toast.success("Order Successfull", {
          id: loading,
        });
      setTimeout(async () => {
        await getAllOrders();
      }, 10000);
      return transaction;
    } catch (error) {
      toast.error("Error ordering product", {
        id: loading,
      });
      console.error(error);
    }
  };

  const cancelOrder = async (id) => {
    const loading = toast.loading("Cancelling order...");

    setActionLoadingStates((prev) => ({
      ...prev,
      [id]: { ...prev[id], cancel: true },
    }));

    try {
      const schema = await rpc?.getEmbeddedSchema(contract?.sourceModule);

      // convert schema to base64……..
      const schemaToBase64 = btoa(
        new Uint8Array(schema).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ""
        )
      );

      // create params……..
      const params = {
        parameters: Number(id),
        schema: moduleSchemaFromBase64(schemaToBase64),
      };

      const transaction = await connection?.signAndSendTransaction(
        account,
        AccountTransactionType.Update,
        {
          amount: CcdAmount.fromCcd(0),
          address: ContractAddress.create(contract.index, 0),
          receiveName: ReceiveName.create(
            contract.name,
            EntrypointName.fromString("cancel_order")
          ),
          maxContractExecutionEnergy: Energy.create(
            MAX_CONTRACT_EXECUTION_ENERGY
          ),
        },
        params
      );
      transaction &&
        toast.success("Order Cancelled", {
          id: loading,
        });
      setActionLoadingStates((prev) => ({
        ...prev,
        [id]: { ...prev[id], cancel: false },
      }));
      setTimeout(async () => {
        await getAllOrders();
      }, 10000);
      return transaction;
    } catch (error) {
      setActionLoadingStates((prev) => ({
        ...prev,
        [id]: { ...prev[id], cancel: false },
      }));
      toast.error("Error cancelling order", {
        id: loading,
      });
      console.error(error);
    }
  };

  const approveOrder = async (id) => {
    const loading = toast.loading("Getting order approved...");

    setActionLoadingStates((prev) => ({
      ...prev,
      [id]: { ...prev[id], approve: true },
    }));

    try {
      const schema = await rpc?.getEmbeddedSchema(contract?.sourceModule);

      // convert schema to base64……..
      const schemaToBase64 = btoa(
        new Uint8Array(schema).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ""
        )
      );

      // create params……..
      const params = {
        parameters: Number(id),
        schema: moduleSchemaFromBase64(schemaToBase64),
      };

      const transaction = await connection?.signAndSendTransaction(
        account,
        AccountTransactionType.Update,
        {
          amount: CcdAmount.fromCcd(0),
          address: ContractAddress.create(contract.index, 0),
          receiveName: ReceiveName.create(
            contract.name,
            EntrypointName.fromString("approve_order")
          ),
          maxContractExecutionEnergy: Energy.create(
            MAX_CONTRACT_EXECUTION_ENERGY
          ),
        },
        params
      );
      transaction &&
        toast.success("Order Approved", {
          id: loading,
        });
      setActionLoadingStates((prev) => ({
        ...prev,
        [id]: { ...prev[id], approve: false },
      }));
      setTimeout(async () => {
        await getAllOrders();
      }, 10000);
      return transaction;
    } catch (error) {
      setActionLoadingStates((prev) => ({
        ...prev,
        [id]: { ...prev[id], approve: false },
      }));
      toast.error("Error approving order", {
        id: loading,
      });
      console.error(error);
    }
  };
  const deliverOrder = async (id) => {
    const loading = toast.loading("Delivering order...");

    setActionLoadingStates((prev) => ({
      ...prev,
      [id]: { ...prev[id], deliver: true },
    }));

    try {
      const schema = await rpc?.getEmbeddedSchema(contract?.sourceModule);

      // convert schema to base64……..
      const schemaToBase64 = btoa(
        new Uint8Array(schema).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ""
        )
      );

      // create params……..
      const params = {
        parameters: Number(id),
        schema: moduleSchemaFromBase64(schemaToBase64),
      };

      const transaction = await connection?.signAndSendTransaction(
        account,
        AccountTransactionType.Update,
        {
          amount: CcdAmount.fromCcd(0),
          address: ContractAddress.create(contract.index, 0),
          receiveName: ReceiveName.create(
            contract.name,
            EntrypointName.fromString("deliver_order")
          ),
          maxContractExecutionEnergy: Energy.create(
            MAX_CONTRACT_EXECUTION_ENERGY
          ),
        },
        params
      );
      transaction &&
        toast.success("Order Delivered", {
          id: loading,
        });
      setActionLoadingStates((prev) => ({
        ...prev,
        [id]: { ...prev[id], deliver: false },
      }));
      setTimeout(async () => {
        await getAllOrders();
      }, 10000);
      return transaction;
    } catch (error) {
      setActionLoadingStates((prev) => ({
        ...prev,
        [id]: { ...prev[id], deliver: false },
      }));
      toast.error("Error approving order", {
        id: loading,
      });
      console.error(error);
    }
  };

  const getAllOrders = async () => {
    // toast.dismiss();
    const loading = toast.loading("Getting orders...");

    const receiveName = "get_all_orders";

    try {
      if (contract) {
        const result = await rpc?.invokeContract({
          contract: contract && ContractAddress?.create(contract?.index, 0),
          method:
            contract &&
            ReceiveName?.create(
              contract?.name,
              EntrypointName?.fromString(receiveName)
            ),
          invoker: account && AccountAddress?.fromJSON(account),
        });
        console.log(result.returnValue);
        const buffer = Buffer?.from(result?.returnValue?.buffer).buffer;
        const contract_schema = await rpc?.getEmbeddedSchema(
          contract?.sourceModule
        );
        const newschema = Buffer?.from(contract_schema).buffer;

        console.log(newschema);
        const name = ContractName?.fromString(CONTRACT_NAME);
        const entry_point = EntrypointName?.fromString(receiveName);

        const values = await deserializeReceiveReturnValue(
          buffer,
          contract_schema,
          name,
          entry_point,
          SchemaVersion?.V1
        );
        console.log("values", values);
        setOrders(values);
        values &&
          toast.success("Fetched Orders", {
            id: loading,
          });
        return values;
      }
    } catch (err) {
      console.error("Error fetching orders:", err);
      toast.error("Error fetching orders", {
        id: loading,
      });
    }
  };

  const handleAuthorize = useCallback(
    async (product) => {
      const locationSet = product.location.map((item) => item.value);
      const loading = toast.loading("Confirming Identity...");
      try {
        const statement = [
          {
            type: "AttributeInSet",
            attributeTag: "nationality",
            set: locationSet,
          },
          {
            type: "AttributeInRange",
            attributeTag: "dob",
            lower: "18000101",
            upper: "20060902",
          },
        ];

        if (!account) {
          throw new Error("No account available");
        }

        const provider = await detectConcordiumProvider();
        const challenge = await getChallenge(VERIFIER_URL, account);
        const proof = await provider.requestIdProof(
          account,
          statement,
          challenge
        );

        const newAuthToken = await authorize(
          VERIFIER_URL,
          challenge,
          proof,
          statement
        );

        console.log(newAuthToken);
        if (newAuthToken) {
          toast.success("Identity confirmed", {
            id: loading,
          });
          await orderItem(product);
        } else {
          toast.error("Failed to get authorization token");
        }
      } catch (error) {
        console.error("Authorization failed:", error);
        toast.error("Authorization failed: ", {
          id: loading,
        });
      }
      console.log(product);
    },
    [account]
  );

  useEffect(() => {
    if (rpc && contract && account) {
      getProducts();
      getAllOrders();
    }
  }, [rpc, contract, account]);

  const countryOptions = useMemo(
    () =>
      Object.entries(countries)
        .map(([code, country]) => ({
          value: code,
          label: country.name,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    []
  );

  console.log(newProductLocation);

  return (
    <div className="m-5 p-5 border rounded-lg shadow-md ">
      <div className="mb-5 flex flex-col sm:flex-row gap-2  justify-between items-center w-full">
        <div className="sm:w-1/4 w-[100%]">
          <Select
            value={showCreateProduct ? "create" : "order"}
            onChange={(e) => setShowCreateProduct(e.target.value === "create")}
            // options={creatorOrderOption}
          >
            <option value="order">Order Product</option>
            <option value="create">Create Product</option>
          </Select>
        </div>
        {showCreateProduct ? (
          <div className="w-full sm:w-2/3 flex flex-col sm:flex-row gap-3 justify-between items-center">
            <Input
              value={newProductName}
              onChange={(e) => setNewProductName(e.target.value)}
              placeholder="Product name"
              required
            />
            <Input
              value={newProductPrice}
              onChange={(e) => setNewProductPrice(e.target.value)}
              placeholder="Price"
              type="number"
              required
            />
            <ReactSelect
              options={countryOptions}
              value={newProductLocation}
              isMulti
              onChange={(selectedOption) => {
                setNewProductLocation(selectedOption);
              }}
              placeholder="Select Country"
              required
              className="sm:w-[100%]"
            />
            <Button
              onClick={createProduct}
              isLoading={loadingStates.create}
              loadingText="Creating"
              disabled={isCreateButtonDisabled()}
              className="px-6 sm:w-[50%] "
            >
              Create
            </Button>
          </div>
        ) : (
          <div className="sm:w-2/4 flex space-x-3">
            <Select
              // value={selectedProduct}
              onChange={(e) => {
                console.log(e.target.value);
                setSelectedProduct(
                  products?.find(
                    (product) => Number(product.id) === Number(e.target.value)
                  )
                );
              }}
              placeholder="Select a product"
            >
              {products &&
                products?.map((product) => (
                  <option key={product?.id} value={Number(product?.id)}>
                    {product?.name}
                  </option>
                ))}
            </Select>

            <Button
              // onClick={() => orderItem(selectedProduct)}
              onClick={() => handleAuthorize(selectedProduct)}
              // onClick={() => console.log(selectedProduct)}
              isLoading={loadingStates.order}
              loadingText="Ordering"
              disabled={!selectedProduct}
            >
              Order
            </Button>
          </div>
        )}
      </div>
      <div className="mb-5 flex justify-between items-center">
        <div className="sm:w-1/2 flex space-x-3">
          <Input
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
            placeholder="Enter Order ID ..."
            type="number"
          />
          <Button
            onClick={() => getItem(itemId)}
            isLoading={loadingStates.search}
            loadingText="Searching"
            disabled={itemId === ""}
          >
            Search
          </Button>
        </div>
      </div>

      {itemDetails && (
        <div className="mb-5 p-4 border rounded">
          <h3 className="font-bold text-lg">Item Details:</h3>
          <p>
            <span className="font-bold">ID</span>:{" "}
            {Number(itemDetails.order_id)}
          </p>
          <p>
            <span className="font-bold">Name</span>: {itemDetails.product_name}
          </p>
          <p>
            <span className="font-bold">Location</span>:{" "}
            {/* {itemDetails.product_name} */}
            {itemDetails?.product_location.map((item, index, array) => (
              <span key={item.value}>
                {item.label}
                {index < array.length - 1 && ", "}
              </span>
            ))}
          </p>
          <p>
            <span className="font-bold">Status</span>:{" "}
            {getStatusText(itemDetails.status)}
          </p>
          <p>
            <span className="font-bold">Ordered By</span>:{" "}
            {displayPartialAddress(itemDetails.ordered_by)}
          </p>
          <p>
            <span className="font-bold">Approved By</span>:{" "}
            {displayPartialAddress(itemDetails.approved_by)}
          </p>
          <p>
            <span className="font-bold">Delivered To</span>:{" "}
            {displayPartialAddress(itemDetails.delivered_to)}
          </p>
        </div>
      )}
      <div className="w-full overflow-x-scroll">
        <table className="w-full border-collapse ">
          <thead>
            <tr>
              <th className="border p-2">ID</th>
              <th className="border p-2">Name</th>
              <th className="border p-2">Location</th>
              <th className="border p-2">Price(CCD)</th>
              <th className="border p-2">Status</th>
              <th className="border p-2">Ordered by</th>
              <th className="border p-2">Approved by</th>
              <th className="border p-2">Delivered to</th>
              <th className="border p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders?.map((order) => {
              const product = products?.find((p) => p.id === order.productId);
              console.log(product, "check...");
              return (
                <tr key={order.order_id}>
                  <td className="border p-2">{Number(order?.order_id)}</td>
                  <td className="border p-2">{order?.product_name}</td>
                  <td className="border p-2">
                    {order?.product_location.map((item, index, array) => (
                      <span key={item.value}>
                        {item.label}
                        {index < array.length - 1 && ", "}
                      </span>
                    ))}
                  </td>
                  <td className="border p-2"> {order?.price}</td>
                  <td className="border p-2">{getStatusText(order?.status)}</td>
                  <td className="border p-2">
                    {displayPartialAddress(order.ordered_by)}
                  </td>
                  <td className="border p-2">
                    {displayPartialAddress(order.approved_by)}
                  </td>
                  <td className="border p-2">
                    {displayPartialAddress(order.delivered_to)}
                  </td>
                  <td className="p-2 border">
                    <div className="flex items-center justify-center">
                      {getStatusText(order.status) === "Ordered" && (
                        <>
                          <Button
                            size="sm"
                            colorScheme="red"
                            onClick={() => cancelOrder(order.order_id)}
                            isLoading={
                              actionLoadingStates[order.order_id]?.cancel
                            }
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            colorScheme="green"
                            onClick={() => approveOrder(order.order_id)}
                            isLoading={actionLoadingStates[order.id]?.approve}
                            ml={2}
                          >
                            Approve
                          </Button>
                        </>
                      )}
                      {getStatusText(order.status) === "Shipped" && (
                        <Button
                          size="sm"
                          colorScheme="blue"
                          onClick={() => deliverOrder(order.order_id)}
                          isLoading={actionLoadingStates[order.id]?.deliver}
                        >
                          Deliver Product
                        </Button>
                      )}
                      {getStatusText(order.status) === "Delivered" && (
                        <div>
                          <p>Product delivered!</p>
                        </div>
                      )}
                      {getStatusText(order.status) === "Cancelled" && (
                        <div>
                          <p>Order cancelled!</p>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SupplyChain;
