import { randomUUID } from 'node:crypto';
import { PaymentMethod, PaymentResult, PendingCharge, Product, SaleError } from './domain.js';

export interface InventoryService {
  validateItems(items: { productId: string; quantity: number }[]): void;
  priceItems(items: { productId: string; quantity: number }[]): number;
  deduct(items: { productId: string; quantity: number }[]): void;
  restore(items: { productId: string; quantity: number }[]): void;
  getStock(productId: string): number;
}

export class InMemoryInventoryService implements InventoryService {
  constructor(private readonly products: Map<string, Product>) {}

  validateItems(items: { productId: string; quantity: number }[]): void {
    const requested = new Map<string, number>();
    for (const item of items) {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new SaleError('INVALID_QUANTITY', `Quantity for item ${item.productId} must be a positive integer`);
      }
      requested.set(item.productId, (requested.get(item.productId) ?? 0) + item.quantity);
    }
    for (const [productId, quantity] of requested) {
      const product = this.products.get(productId);
      if (!product) throw new SaleError('PRODUCT_NOT_FOUND', `Item ${productId} was not found`, 404);
      if (product.stock < quantity) throw new SaleError('INSUFFICIENT_STOCK', `Item ${productId} out of stock`, 409);
    }
  }

  priceItems(items: { productId: string; quantity: number }[]): number {
    return items.reduce((total, item) => total + (this.products.get(item.productId)?.unitPriceCents ?? 0) * item.quantity, 0);
  }

  deduct(items: { productId: string; quantity: number }[]): void {
    this.validateItems(items);
    for (const item of items) this.products.get(item.productId)!.stock -= item.quantity;
  }

  restore(items: { productId: string; quantity: number }[]): void {
    for (const item of items) {
      const product = this.products.get(item.productId);
      if (product) product.stock += item.quantity;
    }
  }

  getStock(productId: string): number {
    return this.products.get(productId)?.stock ?? 0;
  }
}

export interface BillingService {
  getPendingCharges(customerId: string): PendingCharge[];
  applyPayment(customerId: string, amountCents: number): void;
  restorePayment(customerId: string, charges: PendingCharge[]): void;
}

export class InMemoryBillingService implements BillingService {
  constructor(private readonly charges: PendingCharge[]) {}

  getPendingCharges(customerId: string): PendingCharge[] {
    return this.charges.filter((charge) => charge.customerId === customerId && charge.amountCents > 0).map((charge) => ({ ...charge }));
  }

  applyPayment(customerId: string, amountCents: number): void {
    let remaining = amountCents;
    for (const charge of this.charges.filter((entry) => entry.customerId === customerId && entry.amountCents > 0)) {
      const applied = Math.min(charge.amountCents, remaining);
      charge.amountCents -= applied;
      remaining -= applied;
      if (remaining === 0) break;
    }
  }

  restorePayment(customerId: string, charges: PendingCharge[]): void {
    for (const original of charges) {
      const current = this.charges.find((charge) => charge.customerId === customerId && charge.chargeId === original.chargeId);
      if (current) current.amountCents = original.amountCents;
    }
  }
}

export interface PaymentService {
  charge(method: PaymentMethod, amountCents: number, amountTenderedCents: number | undefined): PaymentResult;
  refund(transactionId: string): void;
}

export class InMemoryPaymentService implements PaymentService {
  public readonly refundedTransactions: string[] = [];
  constructor(private readonly declinedMethods: PaymentMethod[] = []) {}

  charge(method: PaymentMethod, amountCents: number, amountTenderedCents: number | undefined): PaymentResult {
    if (this.declinedMethods.includes(method)) throw new SaleError('PAYMENT_DECLINED', 'Payment was declined', 402);
    const tendered = method === 'cash' || method === 'split' ? amountTenderedCents ?? 0 : amountCents;
    if (tendered < amountCents && method !== 'split' && method !== 'cash') {
      throw new SaleError('PAYMENT_REQUIRED', 'The tendered amount is insufficient', 402);
    }
    if (tendered === 0) throw new SaleError('PAYMENT_REQUIRED', 'Amount tendered is required', 402);
    if (tendered > amountCents) return { acceptedCents: amountCents, changeCents: tendered - amountCents, status: 'PAID', transactionId: randomUUID() };
    if (tendered < amountCents) return { acceptedCents: tendered, changeCents: 0, status: 'PARTIALLY_PAID', transactionId: randomUUID() };
    return { acceptedCents: tendered, changeCents: 0, status: 'PAID', transactionId: randomUUID() };
  }

  refund(transactionId: string): void {
    this.refundedTransactions.push(transactionId);
  }
}

export interface ReceiptService {
  create(data: object): { receiptId: string };
  get(receiptId: string): object | undefined;
}

export class InMemoryReceiptService implements ReceiptService {
  private readonly receipts = new Map<string, object>();
  create(data: object): { receiptId: string } {
    const receiptId = randomUUID();
    this.receipts.set(receiptId, data);
    return { receiptId };
  }
  get(receiptId: string): object | undefined { return this.receipts.get(receiptId); }
}

export interface AuditLogService { record(event: string, data: object): void; }
export class InMemoryAuditLogService implements AuditLogService {
  public readonly events: { event: string; data: object }[] = [];
  record(event: string, data: object): void { this.events.push({ event, data }); }
}
