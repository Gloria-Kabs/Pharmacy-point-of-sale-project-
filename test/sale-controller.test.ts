import { describe, expect, it } from 'vitest';
import { PendingCharge, Product, SaleError } from '../src/domain.js';
import { SaleController } from '../src/sale-controller.js';
import { InMemoryAuditLogService, InMemoryBillingService, InMemoryInventoryService, InMemoryPaymentService, InMemoryReceiptService } from '../src/services.js';

const setup = (declinedMethods: ('cash' | 'card' | 'mobile_money' | 'insurance' | 'split')[] = [], charges: PendingCharge[] = []) => {
  const inventory = new InMemoryInventoryService(new Map<string, Product>([['p1', { productId: 'p1', name: 'Soap', unitPriceCents: 1550, stock: 4 }]]));
  const billing = new InMemoryBillingService(charges);
  const payment = new InMemoryPaymentService(declinedMethods);
  const receipts = new InMemoryReceiptService();
  const controller = new SaleController(inventory, billing, payment, receipts, new InMemoryAuditLogService());
  return { controller, inventory, billing, payment, receipts };
};

describe('SaleController', () => {
  it('processes an OTC-only card sale and issues a receipt', () => {
    const { controller, inventory } = setup();
    const result = controller.createSale({ customerId: null, otcItems: [{ productId: 'p1', quantity: 2 }], includePendingCharges: false, paymentMethod: 'card' });
    expect(result).toMatchObject({ otcSubtotal: 31, grandTotal: 31, status: 'PAID' });
    expect(result.receiptId).toBeTruthy();
    expect(inventory.getStock('p1')).toBe(2);
  });

  it('combines OTC items with pending charges', () => {
    const charges: PendingCharge[] = [{ chargeId: 'c1', customerId: 'customer-1', description: 'Rx balance', amountCents: 1200, createdAt: new Date().toISOString() }];
    const { controller, billing } = setup([], charges);
    const result = controller.createSale({ customerId: 'customer-1', otcItems: [{ productId: 'p1', quantity: 1 }], includePendingCharges: true, paymentMethod: 'card' });
    expect(result).toMatchObject({ otcSubtotal: 15.5, pendingChargesTotal: 12, grandTotal: 27.5 });
    expect(billing.getPendingCharges('customer-1')).toHaveLength(0);
  });

  it('does not mutate stock or charges when payment fails', () => {
    const charges: PendingCharge[] = [{ chargeId: 'c1', customerId: 'customer-1', description: 'Rx balance', amountCents: 1200, createdAt: new Date().toISOString() }];
    const { controller, inventory, billing } = setup(['card'], charges);
    expect(() => controller.createSale({ customerId: 'customer-1', otcItems: [{ productId: 'p1', quantity: 1 }], includePendingCharges: true, paymentMethod: 'card' })).toThrow('Payment was declined');
    expect(inventory.getStock('p1')).toBe(4);
    expect(billing.getPendingCharges('customer-1')[0].amountCents).toBe(1200);
  });

  it('applies partial cash payment to the pending balance', () => {
    const charges: PendingCharge[] = [{ chargeId: 'c1', customerId: 'customer-1', description: 'Rx balance', amountCents: 1200, createdAt: new Date().toISOString() }];
    const { controller, billing } = setup([], charges);
    const result = controller.createSale({ customerId: 'customer-1', otcItems: [], includePendingCharges: true, paymentMethod: 'cash', amountTendered: 5 });
    expect(result.status).toBe('PARTIALLY_PAID');
    expect(billing.getPendingCharges('customer-1')[0].amountCents).toBe(700);
  });

  it('allows settling pending charges without OTC items', () => {
    const charges: PendingCharge[] = [{ chargeId: 'c1', customerId: 'customer-1', description: 'Rx balance', amountCents: 1200, createdAt: new Date().toISOString() }];
    const { controller } = setup([], charges);
    expect(controller.createSale({ customerId: 'customer-1', otcItems: [], includePendingCharges: true, paymentMethod: 'cash', amountTendered: 12 }).status).toBe('PAID');
  });

  it('rejects insufficient stock before payment', () => {
    const { controller } = setup();
    expect(() => controller.createSale({ customerId: null, otcItems: [{ productId: 'p1', quantity: 5 }], includePendingCharges: false, paymentMethod: 'card' })).toThrow(SaleError);
  });
});