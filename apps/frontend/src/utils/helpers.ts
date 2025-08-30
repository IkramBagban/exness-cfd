// if the it's buy trade then we will calculate with sell price because to close that order user has to sell the asset.
// If it's a sell trade then we will calculate with buy price because to close that order user has to buy the asset.
export const calculatePnL = (order, currentPrices) => {
  console.log({ order, currentPrices });
  if (!currentPrices) return 0;
  const currentPrice =
    order.type === "buy" ? currentPrices.ask : currentPrices.bid;
  const diff =
    order.type === "buy"
      ? currentPrice - order.openPrice
      : order.openPrice - currentPrice;
  return diff * order.qty;
};
