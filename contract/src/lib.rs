use concordium_std::*;
use core::fmt::Debug;

// Type aliases for better readability
type ProductId = u64;
type OrderId = u64;

// Structs
#[derive(Serialize, SchemaType, Clone)]
pub struct State {
    products: StateMap<ProductId, Product>,
    orders: StateMap<OrderId, Order>,
    product_count: u64,
    order_count: u64,
}

#[derive(Serialize, SchemaType, Clone, Copy, Debug, PartialEq)]
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
fn add_product(
    ctx: &ReceiveContext,
    host: &mut Host<State>,
) -> ReceiveResult<()> {
    ensure!(
        ctx.sender().matches_account(&ctx.owner()),
         "Only the owner can add products"
    );


    let params: (String, String, Amount) = ctx.parameter_cursor().get()?;
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
    ctx: &ReceiveContext,
    host: &mut Host<State>,
) -> ReceiveResult<()> {
    let product_id: ProductId = ctx.parameter_cursor().get()?;
    let amount: Amount = ctx.amount(); // Get the payment amount

    let state = host.state_mut();

    let product = state.products.get(&product_id).ok_or(ContractError::CustomError(0))?;
    ensure!(product.status == Status::Available, "Product is not available");
    ensure!(amount >= product.price, "Insufficient payment");

    state.order_count += 1;
    let new_order_id = state.order_count;

    let order = Order {
        id: new_order_id,
        product_id,
        ordered_by: ctx.sender(),
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
fn approve_order(
    ctx: &ReceiveContext,
    host: &mut Host<State>,
) -> ReceiveResult<()> {
    let owner = ctx.owner();
    let sender = ctx.sender();

    ensure!(sender == owner, "Only the owner can approve orders");

    let order_id: OrderId = ctx.parameter_cursor().get()?;
    let state = host.state_mut();

    let mut order = state.orders.get(&order_id).ok_or(ContractError::CustomError(1))?.clone();
    ensure!(order.status == Status::Ordered, "Order must be in Ordered state");

    order.status = Status::Shipped;
    order.approved_by = Some(sender);

    state.orders.insert(order_id, order);

    Ok(())
}

#[receive(contract = "supply_chain_tracker", name = "deliver_order", mutable)]
fn deliver_order(
    ctx: &ReceiveContext,
    host: &mut Host<State>,
) -> ReceiveResult<()> {
    let owner = ctx.owner();
    let sender = ctx.sender();

    ensure!(sender == owner, "Only the owner can deliver orders");

    let order_id: OrderId = ctx.parameter_cursor().get()?;
    let state = host.state_mut();

    let mut order = state.orders.get(&order_id).ok_or(ContractError::CustomError(1))?.clone();
    ensure!(order.status == Status::Shipped, "Order must be in Shipped state");

    order.status = Status::Delivered;
    order.delivered_to = Some(order.ordered_by);

    state.orders.insert(order_id, order);

    Ok(())
}

#[receive(contract = "supply_chain_tracker", name = "cancel_order", mutable)]
fn cancel_order(
    ctx: &ReceiveContext,
    host: &mut Host<State>,
) -> ReceiveResult<()> {
    let order_id: OrderId = ctx.parameter_cursor().get()?;
    let state = host.state_mut();

    let mut order = state.orders.get(&order_id).ok_or(ContractError::CustomError(1))?.clone();
    ensure!(order.ordered_by == ctx.sender(), "Only the person who ordered can cancel");
    ensure!(order.status == Status::Ordered, "Order can only be cancelled if it is in the Ordered state");

    order.status = Status::Cancelled;
    state.orders.insert(order_id, order);

    // Update product status
    let mut product = state.products.get(&order.product_id).ok_or(ContractError::CustomError(0))?.clone();
    product.status = Status::Available;
    state.products.insert(order.product_id, product);

    Ok(())
}

#[receive(contract = "supply_chain_tracker", name = "get_order_details")]
fn get_order_details(
    ctx: &ReceiveContext,
    host: &Host<State>,
) -> ReceiveResult<(OrderId, String, Amount, Option<AccountAddress>, AccountAddress, Option<AccountAddress>, Status)> {
    let order_id: OrderId = ctx.parameter_cursor().get()?;
    let state = host.state();

    let order = state.orders.get(&order_id).ok_or(ContractError::CustomError(1))?;
    let product = state.products.get(&order.product_id).ok_or(ContractError::CustomError(0))?;

    Ok((
        order.id,
        product.name.clone(),
        product.price,
        order.delivered_to,
        order.ordered_by,
        order.approved_by,
        order.status,
    ))
}

#[receive(contract = "supply_chain_tracker", name = "get_all_orders")]
fn get_all_orders(
    _ctx: &ReceiveContext,
    host: &Host<State>,
) -> ReceiveResult<Vec<(OrderId, String, String, Amount, Option<AccountAddress>, AccountAddress, Option<AccountAddress>, Status)>> {
    let state = host.state();
    let mut all_orders = Vec::new();

    for (_, order) in state.orders.iter() {
        let product = state.products.get(&order.product_id).ok_or(ContractError::CustomError(0))?;
        all_orders.push((
            order.id,
            product.name.clone(),
            product.location.clone(),
            product.price,
            order.delivered_to,
            order.ordered_by,
            order.approved_by,
            order.status,
        ));
    }

    Ok(all_orders)
}

#[receive(contract = "supply_chain_tracker", name = "get_product_details")]
fn get_product_details(
    ctx: &ReceiveContext,
    host: &Host<State>,
) -> ReceiveResult<Product> {
    let product_id: ProductId = ctx.parameter_cursor().get()?;
    let state = host.state();

    state.products.get(&product_id)
        .cloned()
        .ok_or(ContractError::CustomError(2))
}

#[receive(contract = "supply_chain_tracker", name = "get_all_products")]
fn get_all_products(
    _ctx: &ReceiveContext,
    host: &Host<State>,
) -> ReceiveResult<Vec<Product>> {
    let state = host.state();
    Ok(state.products.iter().map(|(_, product)| product.clone()).collect())
}

#[receive(contract = "supply_chain_tracker", name = "get_product_count")]
fn get_product_count(
    _ctx: &ReceiveContext,
    host: &Host<State>,
) -> ReceiveResult<u64> {
    Ok(host.state().product_count)
}

#[receive(contract = "supply_chain_tracker", name = "get_order_count")]
fn get_order_count(
    _ctx: &ReceiveContext,
    host: &Host<State>,
) -> ReceiveResult<u64> {
    Ok(host.state().order_count)
}
