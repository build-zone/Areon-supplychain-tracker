![Supply Chain Tracker dApp](https://github.com/build-zone/supplychain-tracker/blob/main/src/assets/supplychaintracker.png)

The Supply Chain Tracker is a decentralized application (dApp) built on the Concordium blockchain. It provides a secure and transparent way to manage products and orders within a supply chain, ensuring that all transactions are recorded immutably and can be audited. The app integrates with Concordium's verifier backend to verify account identities and ensure customers can only purchase items available in their location.

## Useful Resources

- [Website](https://supplychaintracker.netlify.app/) - Frontend to test the project.
- [Demo Video](#) - Watch a demonstration of the Supply Chain Tracker App in action.

## Features

- **Product Management:** Easily add and manage products with details like name, location, and price.
- **Order Management:** Place, approve, deliver, or cancel orders with real-time status updates.
- **Access Control:** Ensures only authorized users (e.g., contract owner) can perform sensitive actions like approving or delivering orders.
- **Location-based Availability:** Uses Concordium verifier backend to verify user identities and restrict product purchases to users in the appropriate locations.
- **Detailed Queries:** Retrieve detailed information about specific products, orders, and overall counts.

## Contract Structure

### Main Components

- **State:** Manages the list of products and orders, including their counts.
- **Product:** Represents an item with attributes such as ID, name, location, price, and status.
- **Order:** Represents an order with details like the ordering party, approval status, and delivery status.
- **Status:** Enum for tracking product and order statuses, including `Available`, `Ordered`, `Shipped`, `Delivered`, and `Cancelled`.

### Key Contract Functions
 
1. **Add Product (`add_product`):** Allows only the contract owner to add new products to the system.

2. **Order Product (`order_product`):** The app will verify the user's identity and location, ensuring that only eligible users can purchase the product.

3. **Approve Order (`approve_order`):** Enables the contract owner to approve an order, changing its status to `Shipped`.

4. **Deliver Order (`deliver_order`):** Marks an approved order as `Delivered` to the specified recipient.

5. **Cancel Order (`cancel_order`):** Allows the user who placed an order to cancel it if it hasn't been shipped yet.

7. **Query Functions:** 
   - `get_order_details`: Fetches details of a specific order.
   - `get_all_orders`: Retrieves all orders.
   - `get_product_details`: Fetches details of a specific product.
   - `get_all_products`: Lists all available products.
   - `get_product_count`: Gets the total number of products in the system.
   - `get_order_count`: Gets the total number of orders placed.

### License
This project is licensed under the MIT License - see the `LICENSE.md` file for details.
