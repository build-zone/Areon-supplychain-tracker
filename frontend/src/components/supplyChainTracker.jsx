import React, { useState, useEffect } from 'react';
import { Button, Input, Select, Spinner, useToast } from '@chakra-ui/react';

const initialProducts = [
  { id: 1, name: "Laptop", location: "USA", price: 1000, status: "Available" },
  { id: 2, name: "Smartphone", location: "China", price: 500, status: "Available" },
  { id: 3, name: "Tablet", location: "Japan", price: 300, status: "Available" },
];

const initialOrders = [
  { id: 1, productId: 1, orderedBy: "0x1234...5678", approvedBy: null, deliveredTo: null, price: 1000, status: "Ordered" },
  { id: 2, productId: 2, orderedBy: "0x2345...6789", approvedBy: "0x3456...7890", deliveredTo: null, price: 500, status: "Shipped" },
];

const SupplyChain = () => {
  const [products, setProducts] = useState(initialProducts);
  const [orders, setOrders] = useState(initialOrders);
  const [itemId, setItemId] = useState('');
  const [itemDetails, setItemDetails] = useState(null);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [loadingStates, setLoadingStates] = useState({
    search: false,
    order: false,
    create: false,
  });
  const [actionLoadingStates, setActionLoadingStates] = useState({});
  const toast = useToast();
  // New state for creating product
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductLocation, setNewProductLocation] = useState('');

  useEffect(() => {
    // Simulating initial data fetch
    setLoadingStates(prev => ({ ...prev, search: true }));
    setTimeout(() => {
      setLoadingStates(prev => ({ ...prev, search: false }));
    }, 1000);
  }, []);

  const getStatusText = (status) => {
    const statusMap = {
      "Ordered": "Ordered",
      "Approved": "Approved",
      "Shipped": "Shipped",
      "Delivered": "Delivered",
      "Cancelled": "Cancelled",
    };
    return statusMap[status] || "";
  };

  const displayPartialAddress = (address) => {
    if (address && address.length > 7) {
      return `${address.substring(0, 3)}...${address.substring(address.length - 4)}`;
    }
    return address || "";
  };

  const getItem = () => {
    setLoadingStates(prev => ({ ...prev, search: true }));
    setTimeout(() => {
      const foundOrder = orders.find(order => order.id === parseInt(itemId));
      if (foundOrder) {
        const product = products.find(p => p.id === foundOrder.productId);
        setItemDetails({
          id: foundOrder.id,
          name: product.name,
          status: foundOrder.status,
          orderedBy: foundOrder.orderedBy,
          approvedBy: foundOrder.approvedBy,
          deliveredTo: foundOrder.deliveredTo,
        });
      } else {
        setItemDetails(null);
        toast({
            
            description: `Order ID does not!`,
            status: "error",
          });
      }
      setLoadingStates(prev => ({ ...prev, search: false }));
    }, 500);
  };

  const orderItem = () => {
    setLoadingStates(prev => ({ ...prev, order: true }));
    setTimeout(() => {
      const selectedProduct = products.find(p => p.id === parseInt(selectedProductId));
      if (selectedProduct) {
        const newOrder = {
          id: orders.length + 1,
          productId: selectedProduct.id,
          orderedBy: "0x" + Math.random().toString(16).substr(2, 8) + "..." + Math.random().toString(16).substr(2, 8),
          approvedBy: null,
          deliveredTo: null,
          price: selectedProduct.price,
          status: "Ordered",
        };
        setOrders([...orders, newOrder]);
        setSelectedProductId('');
      }
      setLoadingStates(prev => ({ ...prev, order: false }));
      toast({
        description: `Order Successful`,
        status: "success",
      });
    }, 500);
  };

  const createProduct = () => {
    if (!newProductName.trim() || !newProductPrice.trim() || !newProductLocation.trim()) {
      toast({
        description: "All fields are required to create a new product.",
        status: "error",
      });
      return;
    }
    
    const price = parseFloat(newProductPrice);
    if (isNaN(price) || price <= 0) {
      toast({
        description: "Please enter a valid positive number for the price.",
        status: "error",
      });
      return;
    }

    setLoadingStates(prev => ({ ...prev, create: true }));
    setTimeout(() => {
      const newProduct = {
        id: products.length + 1,
        name: newProductName.trim(),
        location: newProductLocation.trim(),
        price: price,
        status: "Available",
      };
      setProducts([...products, newProduct]);
      console.log('New Product', products)
      setNewProductName('');
      setNewProductPrice('');
      setNewProductLocation('');
      setShowCreateProduct(false);
      setLoadingStates(prev => ({ ...prev, create: false }));
      toast({
        description: `${newProduct.name} has been added to the inventory.`,
        status: "success",
      });
    }, 500);
  };

  const isCreateButtonDisabled = () => {
    return !newProductName.trim() || !newProductPrice.trim() || !newProductLocation.trim() || 
           isNaN(parseFloat(newProductPrice)) || parseFloat(newProductPrice) <= 0;
  };

  const approveItem = (id) => {
    setActionLoadingStates(prev => ({ ...prev, [id]: { ...prev[id], approve: true } }));
    setTimeout(() => {
      setOrders(orders.map(order => 
        order.id === id ? { ...order, status: "Approved", approvedBy: "0x" + Math.random().toString(16).substr(2, 8) + "..." + Math.random().toString(16).substr(2, 8) } : order
      ));
      setActionLoadingStates(prev => ({ ...prev, [id]: { ...prev[id], approve: false } }));
      toast({
        title: "Product Approved",
        description: `Ready to be shipped!`,
        status: "success",
      });
    }, 500);
  };

  const shipItem = (id) => {
    setActionLoadingStates(prev => ({ ...prev, [id]: { ...prev[id], ship: true } }));
    setTimeout(() => {
      setOrders(orders.map(order => 
        order.id === id ? { ...order, status: "Shipped" } : order
      ));
      setActionLoadingStates(prev => ({ ...prev, [id]: { ...prev[id], ship: false } }));
      toast({
        description: `Product ready to be shipped!`,
        status: "success",
      });
    }, 500);
  };

  const cancelItem = (id) => {
    setActionLoadingStates(prev => ({ ...prev, [id]: { ...prev[id], cancel: true } }));
    setTimeout(() => {
      setOrders(orders.map(order => 
        order.id === id ? { ...order, status: "Cancelled" } : order
      ));
      setActionLoadingStates(prev => ({ ...prev, [id]: { ...prev[id], cancel: false } }));
      toast({
        description: `Product removed successfully!`,
        status: "error",
      });
    }, 500);
  };

  return (
    <div className="m-5 p-5 border rounded-lg shadow-md">
      <div className="mb-5 flex justify-between items-center">
        <div className="w-1/4">
          <Select
            value={showCreateProduct ? 'create' : 'order'}
            onChange={(e) => setShowCreateProduct(e.target.value === 'create')}
            >
            <option value="order">Order Product</option>
            <option value="create">Create Product</option>
            </Select>


        </div>
        {showCreateProduct ? (
          <div className="w-2/3 flex space-x-3">
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
            <Input
              value={newProductLocation}
              onChange={(e) => setNewProductLocation(e.target.value)}
              placeholder="Location"
              required
            />
            <Button
              onClick={createProduct}
              isLoading={loadingStates.create}
              loadingText="Creating"
              disabled={isCreateButtonDisabled()}
              className="px-6"
            >
              Create
            </Button>
          </div>
        ) : (
          <div className="w-2/4 flex space-x-3">
            <Select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              placeholder="Select a product"
            >
              {products.map(product => (
                <option key={product.id} value={product.id}>{product.name}</option>
              ))}
            </Select>
            <Button
              onClick={orderItem}
              isLoading={loadingStates.order}
              loadingText="Ordering"
              disabled={!selectedProductId}
            >
              Order
            </Button>
          </div>
        )}
      </div>
      <div className="mb-5 flex justify-between items-center">
        <div className="w-1/2 flex space-x-3">
          <Input
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
            placeholder="Enter Order ID ..."
            type="number"
          />
          <Button
            onClick={getItem}
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
          <h3 className="font-bold">Item Details:</h3>
          <p>ID: {itemDetails.id}</p>
          <p>Name: {itemDetails.name}</p>
          <p>Status: {getStatusText(itemDetails.status)}</p>
          <p>Ordered By: {displayPartialAddress(itemDetails.orderedBy)}</p>
          <p>Approved By: {displayPartialAddress(itemDetails.approvedBy)}</p>
          <p>Delivered To: {displayPartialAddress(itemDetails.deliveredTo)}</p>
        </div>
      )}

      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="border p-2">ID</th>
            <th className="border p-2">Name</th>
            <th className="border p-2">Location</th>
            <th className="border p-2">Price</th>
            <th className="border p-2">Status</th>
            <th className="border p-2">Ordered by</th>
            <th className="border p-2">Approved by</th>
            <th className="border p-2">Delivered to</th>
            <th className="border p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const product = products.find(p => p.id === order.productId);
            console.log(product, "check...")
            return (
              <tr key={order.id}>
                <td className="border p-2">{order.id}</td>
                <td className="border p-2">{product.name}</td>
                <td className="border p-2">{product.location}</td>
                <td className="border p-2">${order.price}</td>
                <td className="border p-2">{getStatusText(order.status)}</td>
                <td className="border p-2">{displayPartialAddress(order.orderedBy)}</td>
                <td className="border p-2">{displayPartialAddress(order.approvedBy)}</td>
                <td className="border p-2">{displayPartialAddress(order.deliveredTo)}</td>
                <td className="border p-2">
                  {order.status === "Ordered" && (
                    <>
                      <Button size="sm" colorScheme="red" onClick={() => cancelItem(order.id)} isLoading={actionLoadingStates[order.id]?.cancel}>Cancel</Button>
                      <Button size="sm" colorScheme="green" onClick={() => approveItem(order.id)} isLoading={actionLoadingStates[order.id]?.approve} ml={2}>Approve</Button>
                    </>
                  )}
                  {order.status === "Approved" && (
                    <Button size="sm" colorScheme="blue" onClick={() => shipItem(order.id)} isLoading={actionLoadingStates[order.id]?.ship}>Ship Product</Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default SupplyChain;