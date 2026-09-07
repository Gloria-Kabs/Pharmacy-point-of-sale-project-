import { Customer } from './customer.js';
import { loadCustomers, saveCustomers } from './storage.js';

export async function getAllCustomers() {
  const rawData = await loadCustomers();
  return rawData.map((c) => new Customer(c));
}

export async function createCustomer(data) {
  const customer = new Customer(data);
  const { valid, errors } = customer.validate();

  if (!valid) {
    throw new Error(`Validation failed: ${errors.join(' ')}`);
  }

  const rawCustomers = await loadCustomers();
  if (customer.phone) {
    const duplicate = rawCustomers.find((c) => c.phone === customer.phone);
    if (duplicate) {
      throw new Error(`Customer with phone number ${customer.phone} already exists.`);
    }
  }

  rawCustomers.push(customer.toObject());
  await saveCustomers(rawCustomers);
  return customer;
}

export async function findCustomer(query) {
  const customers = await getAllCustomers();
  const q = query.trim().toLowerCase();

  return (
    customers.find(
      (c) =>
        c.customerId.toLowerCase() === q ||
        c.phone.toLowerCase() === q ||
        c.name.toLowerCase().includes(q)
    ) || null
  );
}

export async function recordCustomerSpend(customerId, amountSpent) {
  const rawCustomers = await loadCustomers();
  const customer = rawCustomers.find((c) => c.customerId === customerId);

  if (customer) {
    customer.totalSpent = Number(((customer.totalSpent || 0) + amountSpent).toFixed(2));
    customer.loyaltyPoints = (customer.loyaltyPoints || 0) + Math.floor(amountSpent);
    await saveCustomers(rawCustomers);
  }

  return customer;
}