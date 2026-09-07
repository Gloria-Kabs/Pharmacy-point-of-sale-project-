import { describe, it, expect } from 'vitest';
import {
  generateSalesReport,
  generateLowStockReport,
  generateTopCustomersReport,
} from './reports.js';

describe('Reporting & Analytics Module', () => {
  const mockSales = [
    { total: 100.0, tax: 8.0 },
    { total: 50.0, tax: 4.0 },
  ];

  const mockInventory = [
    { id: 'MED01', name: 'Aspirin', stock: 5 },
    { id: 'MED02', name: 'Ibuprofen', stock: 25 },
  ];

  const mockCustomers = [
    { customerId: 'C1', name: 'Alice', totalSpent: 200.0 },
    { customerId: 'C2', name: 'Bob', totalSpent: 500.0 },
  ];

  it('should calculate sales summary metrics correctly', () => {
    const report = generateSalesReport(mockSales);
    expect(report.totalTransactions).toBe(2);
    expect(report.totalRevenue).toBe(150.0);
    expect(report.totalTax).toBe(12.0);
    expect(report.avgOrderValue).toBe(75.0);
  });

  it('should return items equal to or below the low stock threshold', () => {
    const lowStock = generateLowStockReport(mockInventory, 10);
    expect(lowStock).toHaveLength(1);
    expect(lowStock[0].name).toBe('Aspirin');
  });

  it('should rank customers in descending order of spending', () => {
    const top = generateTopCustomersReport(mockCustomers, 1);
    expect(top).toHaveLength(1);
    expect(top[0].name).toBe('Bob');
  });
});