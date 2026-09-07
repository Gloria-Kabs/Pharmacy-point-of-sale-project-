import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCustomer, findCustomer, recordCustomerSpend } from './customer.js';
import * as storage from './storage.js';

vi.mock('./storage.js');

describe('Customer Management Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create and store a valid customer', async () => {
    storage.loadCustomers.mockResolvedValue([]);
    storage.saveCustomers.mockResolvedValue(true);

    const customerData = {
      name: 'John Smith',
      phone: '555-1234',
      email: 'john@example.com',
    };

    const created = await createCustomer(customerData);
    expect(created.name).toBe('John Smith');
    expect(created.customerId).toBeDefined();
    expect(storage.saveCustomers).toHaveBeenCalled();
  });

  it('should throw validation error for invalid email', async () => {
    await expect(
      createCustomer({ name: 'John', email: 'invalid-email-format' })
    ).rejects.toThrow(/Validation failed/);
  });

  it('should search customer by phone number', async () => {
    const mockData = [
      { customerId: 'CUST-123', name: 'Alice', phone: '555-9999', allergies: [], notes: '' },
    ];
    storage.loadCustomers.mockResolvedValue(mockData);

    const result = await findCustomer('555-9999');
    expect(result).not.toBeNull();
    expect(result.name).toBe('Alice');
  });

  it('should update spending and loyalty points', async () => {
    const mockData = [
      { customerId: 'CUST-123', name: 'Alice', totalSpent: 50.0, loyaltyPoints: 50 },
    ];
    storage.loadCustomers.mockResolvedValue(mockData);
    storage.saveCustomers.mockResolvedValue(true);

    const updated = await recordCustomerSpend('CUST-123', 25.75);
    expect(updated.totalSpent).toBe(75.75);
    expect(updated.loyaltyPoints).toBe(75);
  });
});