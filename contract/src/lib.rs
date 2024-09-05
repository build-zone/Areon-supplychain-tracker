use concordium_std::*;
use core::fmt::Debug;

// Type aliases for better readability
type ProductId = u64;
type OrderId = u64;

// Structs
#[derive(Serialize, SchemaType, Clone)]
pub struct State {
    products: Vec<Product>,
    orders: Vec<Order>,
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
    location: Vec<Location>,
    price: Amount,
    status: Status,
}

#[derive(Serialize, SchemaType, Clone, Debug)]

pub struct Location {
    value: String,
    label: String,
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
    product_location: Vec<Location>,
    price: Amount,
    delivered_to: Option<AccountAddress>,
    ordered_by: AccountAddress,
    approved_by: Option<AccountAddress>,
    status: Status,
}
#[derive(Serialize, SchemaType)]
pub struct AddProductParams {
    name: String,
    location: Vec<Location>,
    price: u64,
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
    InvalidSenderAddress,
}

// Contract implementation

#[init(contract = "supply_chain_tracker")]
fn init(_ctx: &InitContext, _state_builder: &mut StateBuilder) -> InitResult<State> {
    Ok(State {
        products: Vec::new(),
        orders: Vec::new(),
        product_count: 0,
        order_count: 0,
    })
}

#[receive(
    contract = "supply_chain_tracker",
    name = "add_product",
    parameter = "AddProductParams",
    mutable
)]
fn add_product(ctx: &ReceiveContext, host: &mut Host<State>) -> Result<(), CustomContractError> {
    ensure!(
        ctx.sender().matches_account(&ctx.owner()),
        CustomContractError::Unauthorized
    );

    let params: AddProductParams = ctx
        .parameter_cursor()
        .get()
        .map_err(|_| CustomContractError::InvalidParameter)?;

    let state = host.state_mut();
    state.product_count += 1;
    let new_product_id = state.product_count;

    let product = Product {
        id: new_product_id,
        name: params.name,
        location: params.location,
        price: Amount::from_micro_ccd(params.price),
        status: Status::Available,
    };

    state.products.push(product);

    Ok(())
}

#[receive(
    contract = "supply_chain_tracker",
    name = "order_product",
    payable,
    parameter = "ProductId",
    mutable
)]
fn order_product(
    ctx: &ReceiveContext,
    host: &mut Host<State>,
    amount: Amount,
) -> Result<(), CustomContractError> {
    let product_id: ProductId = ctx
        .parameter_cursor()
        .get()
        .map_err(|_| CustomContractError::InvalidParameter)?;
    let state = host.state_mut();

    // Convert sender to AccountAddress
    let ordered_by = match ctx.sender() {
        Address::Account(account_address) => account_address,
        _ => return Err(CustomContractError::InvalidSenderAddress),
    };

    let product = state
        .products
        .iter()
        .find(|p| p.id == product_id)
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

    state.orders.push(order);

    // Update product status
    let product = state
        .products
        .iter_mut()
        .find(|p| p.id == product_id)
        .ok_or(CustomContractError::ProductNotFound)?;
    product.status = Status::Ordered;

    Ok(())
}

#[receive(
    contract = "supply_chain_tracker",
    name = "approve_order",
    parameter = "OrderId",
    mutable
)]
fn approve_order(ctx: &ReceiveContext, host: &mut Host<State>) -> Result<(), CustomContractError> {
    let owner = ctx.owner();
    let sender = ctx.sender();

    // Convert `sender` to `AccountAddress`
    let sender_account_address = match sender {
        Address::Account(account_address) => account_address,
        _ => return Err(CustomContractError::InvalidSenderAddress),
    };

    // ensure!(
    //     sender_account_address == owner,
    //     CustomContractError::Unauthorized
    // );

    ensure!(
        sender.matches_account(&owner),
        CustomContractError::Unauthorized
    );

    let order_id: OrderId = ctx
        .parameter_cursor()
        .get()
        .map_err(|_| CustomContractError::InvalidParameter)?;
    let state = host.state_mut();

    let order = state
        .orders
        .iter_mut()
        .find(|o| o.id == order_id)
        .ok_or(CustomContractError::OrderNotFound)?;
    ensure!(
        order.status == Status::Ordered,
        CustomContractError::InvalidOrderState
    );

    order.status = Status::Shipped;
    order.approved_by = Some(sender_account_address);

    Ok(())
}

#[receive(
    contract = "supply_chain_tracker",
    name = "deliver_order",
    parameter = "OrderId",
    mutable
)]
fn deliver_order(ctx: &ReceiveContext, host: &mut Host<State>) -> Result<(), CustomContractError> {
    let owner = ctx.owner();
    let sender = ctx.sender();

    ensure!(
        sender.matches_account(&owner),
        CustomContractError::Unauthorized
    );

    let order_id: OrderId = ctx
        .parameter_cursor()
        .get()
        .map_err(|_| CustomContractError::InvalidParameter)?;
    let state = host.state_mut();

    let order = state
        .orders
        .iter_mut()
        .find(|o| o.id == order_id)
        .ok_or(CustomContractError::OrderNotFound)?;
    ensure!(
        order.status == Status::Shipped,
        CustomContractError::InvalidOrderState
    );

    order.status = Status::Delivered;
    order.delivered_to = Some(order.ordered_by);

    Ok(())
}

#[receive(
    contract = "supply_chain_tracker",
    name = "cancel_order",
    parameter = "OrderId",
    mutable
)]
fn cancel_order(ctx: &ReceiveContext, host: &mut Host<State>) -> Result<(), CustomContractError> {
    let order_id: OrderId = ctx
        .parameter_cursor()
        .get()
        .map_err(|_| CustomContractError::InvalidParameter)?;
    let state = host.state_mut();

    // Convert `ctx.sender()` to `AccountAddress`
    let sender_account_address = match ctx.sender() {
        Address::Account(account_address) => account_address,
        _ => return Err(CustomContractError::InvalidSenderAddress),
    };

    let order = state
        .orders
        .iter_mut()
        .find(|o| o.id == order_id)
        .ok_or(CustomContractError::OrderNotFound)?;
    ensure!(
        order.ordered_by == sender_account_address,
        CustomContractError::Unauthorized
    );
    ensure!(
        order.status == Status::Ordered,
        CustomContractError::InvalidOrderState
    );

    order.status = Status::Cancelled;

    // Update product status
    let product = state
        .products
        .iter_mut()
        .find(|p| p.id == order.product_id)
        .ok_or(CustomContractError::ProductNotFound)?;
    product.status = Status::Available;

    Ok(())
}

#[receive(
    contract = "supply_chain_tracker",
    name = "get_order_details",
    parameter = "OrderId",
    return_value = "OrderDetails"
)]
fn get_order_details(
    ctx: &ReceiveContext,
    host: &Host<State>,
) -> Result<OrderDetails, CustomContractError> {
    let order_id: OrderId = ctx
        .parameter_cursor()
        .get()
        .map_err(|_| CustomContractError::InvalidParameter)?;
    let state = host.state();

    let order = state
        .orders
        .iter()
        .find(|o| o.id == order_id)
        .ok_or(CustomContractError::OrderNotFound)?;
    let product = state
        .products
        .iter()
        .find(|p| p.id == order.product_id)
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

#[receive(
    contract = "supply_chain_tracker",
    name = "get_all_orders",
    return_value = "Vec<OrderDetails>"
)]
fn get_all_orders(
    _ctx: &ReceiveContext,
    host: &Host<State>,
) -> Result<Vec<OrderDetails>, CustomContractError> {
    let state = host.state();
    let mut all_orders = Vec::new();

    for order in &state.orders {
        let product = state
            .products
            .iter()
            .find(|p| p.id == order.product_id)
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

#[receive(
    contract = "supply_chain_tracker",
    name = "get_product_details",
    return_value = "Product",
    parameter = "ProductId"
)]
fn get_product_details(
    ctx: &ReceiveContext,
    host: &Host<State>,
) -> Result<Product, CustomContractError> {
    let product_id: ProductId = ctx
        .parameter_cursor()
        .get()
        .map_err(|_| CustomContractError::InvalidParameter)?;
    let state = host.state();

    let product = state
        .products
        .iter()
        .find(|p| p.id == product_id)
        .cloned()
        .ok_or(CustomContractError::ProductNotFound)?;

    Ok(product)
}

#[receive(
    contract = "supply_chain_tracker",
    name = "get_all_products",
    return_value = "Vec<Product>"
)]
fn get_all_products(_ctx: &ReceiveContext, host: &Host<State>) -> ReceiveResult<Vec<Product>> {
    let state = host.state();
    Ok(state.products.clone())
}

#[receive(
    contract = "supply_chain_tracker",
    name = "get_product_count",
    return_value = "u64"
)]
fn get_product_count(_ctx: &ReceiveContext, host: &Host<State>) -> ReceiveResult<u64> {
    Ok(host.state().product_count)
}

// #[receive(
//     contract = "supply_chain_tracker",
//     name = "get_order_count",
//     return_value = "u64"
// )]
// fn get_order_count(_ctx: &ReceiveContext, host: &Host<State>) -> ReceiveResult<u64> {
//     Ok(host.state().order_count)
// }
