use concordium_std::*;
use core::fmt::Debug;

// Type aliases for better readability
type ProductId = u64;
type OrderId = u64;

// Structs
#[derive(Serialize, SchemaType, Clone)]
pub struct State {
    products: StateMap<ProductId, Product, S>,
    orders: StateMap<OrderId, Order, S>,
    product_count: u64,
    order_count: u64,
}

#[derive(Serialize, SchemaType, Clone, Copy, Debug, PartialEq, Reject)]
pub enum Status {
    Available,
    Ordered,
    Shipped,
    Delivered,
    Cancelled,
}

#[derive(Serialize, SchemaType, Clone, Debug)]
pub struct Product {
    id: ProductId,
    name: String,
    location: String,
    price: Amount,
    status: Status,
}

#[derive(Serialize, SchemaType, Clone, Debug)]
pub struct Order {
    id: OrderId,
    product_id: ProductId,
    ordered_by: AccountAddress,
    approved_by: Option<AccountAddress>,
    delivered_to: Option<AccountAddress>,
    price: Amount,
    status: Status,
}

#[derive(Serialize, SchemaType, Clone, Debug)]
pub struct OrderDetails {
    order_id: OrderId,
    product_name: String,
    product_location: String,
    price: Amount,
    delivered_to: Option<AccountAddress>,
    ordered_by: AccountAddress,
    approved_by: Option<AccountAddress>,
    status: Status,
}

// Custom errors
#[derive(Debug, PartialEq, Eq, Reject, Serialize, SchemaType)]
pub enum CustomContractError {
    ProductNotFound,
    OrderNotFound,
    Unauthorized,
    InvalidOrderState,
    InsufficientPayment,
    InvalidParameter,
    InvalidSenderAddress
}

// Contract implementation

#[init(contract = "supply_chain_tracker")]
fn init(_ctx: &InitContext, state_builder: &mut StateBuilder) -> InitResult<State> {
    Ok(State {
        products: state_builder.new_map(),
        orders: state_builder.new_map(),
        product_count: 0,
        order_count: 0,
    })
}

#[receive(contract = "supply_chain_tracker", name = "add_product", mutable)]
fn add_product(ctx: &ReceiveContext, host: &mut Host<State>) -> Result<(), CustomContractError> {
    ensure!(
        ctx.sender().matches_account(&ctx.owner()),
        CustomContractError::Unauthorized
    );

    let params: (String, String, Amount) = ctx.parameter_cursor().get().map_err(|_| CustomContractError::InvalidParameter)?;
    let (name, location, price) = params;

    let state = host.state_mut();
    state.product_count += 1;
    let new_product_id = state.product_count;

    let product = Product {
        id: new_product_id,
        name,
        location,
        price,
        status: Status::Available,
    };

    state.products.insert(new_product_id, product);

    Ok(())
}

#[receive(contract = "supply_chain_tracker", name = "order_product", payable, mutable)]
fn order_product(
    ctx: &impl HasReceiveContext,
    host: &mut Host<State>,
    amount: Amount,
) -> Result<(), CustomContractError> {
    let product_id: ProductId = ctx.parameter_cursor().get().map_err(|_| CustomContractError::InvalidParameter)?;
    let state = host.state_mut();

    // Convert sender to AccountAddress
    let ordered_by = match ctx.sender() {
        Address::Account(account_address) => account_address,
        _ => return Err(CustomContractError::InvalidSenderAddress),
    };

    let product = state
        .products
        .get(&product_id)
        .ok_or(CustomContractError::ProductNotFound)?;
    ensure!(
        product.status == Status::Available,
        CustomContractError::InvalidOrderState
    );
    ensure!(
        amount >= product.price,
        CustomContractError::InsufficientPayment
    );

    state.order_count += 1;
    let new_order_id = state.order_count;

    let order = Order {
        id: new_order_id,
        product_id,
        ordered_by,
        approved_by: None,
        delivered_to: None,
        price: product.price,
        status: Status::Ordered,
    };

    state.orders.insert(new_order_id, order);

    // Update product status
    let mut product = product.clone();
    product.status = Status::Ordered;
    state.products.insert(product_id, product);

    Ok(())
}



#[receive(contract = "supply_chain_tracker", name = "approve_order", mutable)]
fn approve_order(ctx: &ReceiveContext, host: &mut Host<State>) -> Result<(), CustomContractError> {
    let owner = ctx.owner();
    let sender = ctx.sender();

    ensure!(
        sender.matches_account(&owner),
        CustomContractError::Unauthorized
    );

    let order_id: OrderId = ctx.parameter_cursor().get().map_err(|_| CustomContractError::InvalidParameter)?;
    let state = host.state_mut();

    let mut order = state
        .orders
        .get(&order_id)
        .ok_or(CustomContractError::OrderNotFound)?
        .clone();
    ensure!(
        order.status == Status::Ordered,
        CustomContractError::InvalidOrderState
    );

    order.status = Status::Shipped;
    order.approved_by = Some(sender);

    state.orders.insert(order_id, order);

    Ok(())
}

#[receive(contract = "supply_chain_tracker", name = "deliver_order", mutable)]
fn deliver_order(ctx: &ReceiveContext, host: &mut Host<State>) -> Result<(), CustomContractError> {
    let owner = ctx.owner();
    let sender = ctx.sender();

    ensure!(
        sender.matches_account(&owner),
        CustomContractError::Unauthorized
    );

    let order_id: OrderId = ctx.parameter_cursor().get().map_err(|_| CustomContractError::InvalidParameter)?;
    let state = host.state_mut();

    let mut order = state
        .orders
        .get(&order_id)
        .ok_or(CustomContractError::OrderNotFound)?
        .clone();
    ensure!(
        order.status == Status::Shipped,
        CustomContractError::InvalidOrderState
    );

    order.status = Status::Delivered;
    order.delivered_to = Some(order.ordered_by);

    state.orders.insert(order_id, order);

    Ok(())
}

#[receive(contract = "supply_chain_tracker", name = "cancel_order", mutable)]
fn cancel_order(ctx: &ReceiveContext, host: &mut Host<State>) -> Result<(), CustomContractError> {
    let order_id: OrderId = ctx.parameter_cursor().get().map_err(|_| CustomContractError::InvalidParameter)?;
    let state = host.state_mut();

    let mut order = state
        .orders
        .get(&order_id)
        .ok_or(CustomContractError::OrderNotFound)?
        .clone();
    ensure!(
        order.ordered_by == ctx.sender(),
        CustomContractError::Unauthorized
    );
    ensure!(
        order.status == Status::Ordered,
        CustomContractError::InvalidOrderState
    );

    order.status = Status::Cancelled;
    state.orders.insert(order_id, order);

    // Update product status
    let mut product = state
        .products
        .get(&order.product_id)
        .ok_or(CustomContractError::ProductNotFound)?
        .clone();
    product.status = Status::Available;
    state.products.insert(order.product_id, product);

    Ok(())
}

#[receive(contract = "supply_chain_tracker", name = "get_order_details")]
fn get_order_details(
    ctx: &ReceiveContext,
    host: &Host<State>,
) -> Result<OrderDetails, CustomContractError> {
    let order_id: OrderId = ctx.parameter_cursor().get().map_err(|_| CustomContractError::InvalidParameter)?;
    let state = host.state();

    let order = state
        .orders
        .get(&order_id)
        .ok_or(CustomContractError::OrderNotFound)?;
    let product = state
        .products
        .get(&order.product_id)
        .ok_or(CustomContractError::ProductNotFound)?;

    Ok(OrderDetails {
        order_id: order.id,
        product_name: product.name.clone(),
        product_location: product.location.clone(),
        price: product.price,
        delivered_to: order.delivered_to,
        ordered_by: order.ordered_by,
        approved_by: order.approved_by,
        status: order.status,
    })
}


#[receive(contract = "supply_chain_tracker", name = "get_all_orders")]
fn get_all_orders(
    _ctx: &ReceiveContext,
    host: &Host<State>,
) -> Result<Vec<OrderDetails>, CustomContractError> {
    let state = host.state();
    let mut all_orders = Vec::new();

    for (_, order) in state.orders.iter() {
        let product = state
            .products
            .get(&order.product_id)
            .ok_or(CustomContractError::ProductNotFound)?;
        all_orders.push(OrderDetails {
            order_id: order.id,
            product_name: product.name.clone(),
            product_location: product.location.clone(),
            price: product.price,
            delivered_to: order.delivered_to,
            ordered_by: order.ordered_by,
            approved_by: order.approved_by,
            status: order.status,
        });
    }

    Ok(all_orders)
}

#[receive(contract = "supply_chain_tracker", name = "get_product_details")]
fn get_product_details(
    ctx: &ReceiveContext,
    host: &Host<State>,
) -> Result<Product, CustomContractError> {
    let product_id: ProductId = ctx.parameter_cursor().get().map_err(|_| CustomContractError::InvalidParameter)?;
    let state = host.state();

    state
        .products
        .get(&product_id)
        .cloned()
        .ok_or(CustomContractError::ProductNotFound)
}

#[receive(contract = "supply_chain_tracker", name = "get_all_products")]
fn get_all_products(_ctx: &ReceiveContext, host: &Host<State>) -> ReceiveResult<Vec<Product>> {
    let state = host.state();
    Ok(state.products.iter().map(|(_, product)| product.clone()).collect())
}

#[receive(contract = "supply_chain_tracker", name = "get_product_count")]
fn get_product_count(_ctx: &ReceiveContext, host: &Host<State>) -> ReceiveResult<u64> {
    Ok(host.state().product_count)
}

#[receive(contract = "supply_chain_tracker", name = "get_order_count")]
fn get_order_count(_ctx: &ReceiveContext, host: &Host<State>) -> ReceiveResult<u64> {
    Ok(host.state().order_count)
}