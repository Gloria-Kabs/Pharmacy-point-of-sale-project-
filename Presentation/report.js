export function generateSalesReport(salesHistory = []) {
  const totalTransactions = salesHistory.length;
  const totalRevenue = salesHistory.reduce((sum, txn) => sum + txn.total, 0);
  const totalTax = salesHistory.reduce((sum, txn) => sum + (txn.tax || 0), 0);
  const avgOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  return {
    totalTransactions,
    totalRevenue: Number(totalRevenue.toFixed(2)),
    totalTax: Number(totalTax.toFixed(2)),
    avgOrderValue: Number(avgOrderValue.toFixed(2)),
  };
}

export function generateLowStockReport(inventory = [], threshold = 15) {
  return inventory.filter((item) => item.stock <= threshold);
}

export function generateTopCustomersReport(customers = [], limit = 5) {
  return [...customers]
    .sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0))
    .slice(0, limit);
}