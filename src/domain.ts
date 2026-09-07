export type PaymentMethod = 'cash' | 'card' | 'mobile_money' | 'insurance' | 'split';
export type SaleStatus = 'PAID' | 'PARTIALLY_PAID' | 'FAILED' | 'CANCELLED';

export interface OtcItemRequest {
  productId: string;
  quantity: number;
  unitPrice?: number;
}

export interface SaleRequest {
  customerId: string | null;
  otcItems: OtcItemRequest[];
  includePendingCharges: boolean;
  paymentMethod: PaymentMethod;
  amountTendered?: number;
  discount?: number;
  tax?: number;
}

export interface Product {
  productId: string;
  name: string;
  unitPriceCents: number;
  stock: number;
}

export interface PendingCharge {
  chargeId: string;
  customerId: string;
  description: string;
  amountCents: number;
  createdAt: string;
}

export interface SaleResult {
  saleId: string;
  otcSubtotal: number;
  pendingChargesTotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
  amountTendered: number;
  change: number;
  status: SaleStatus;
  receiptId: string | null;
}

export interface PaymentResult {
  acceptedCents: number;
  changeCents: number;
  status: 'PAID' | 'PARTIALLY_PAID';
  transactionId: string;
}

export class SaleError extends Error {
  constructor(public readonly code: string, message: string, public readonly statusCode = 400) {
    super(message);
    this.name = 'SaleError';
  }
}

export const centsFromAmount = (value: number | undefined, field: string): number => {
  if (value === undefined) return 0;
  if (!Number.isFinite(value) || value < 0 || Math.round(value * 100) !== value * 100) {
    throw new SaleError('INVALID_AMOUNT', `${field} must be a non-negative amount with at most two decimals`);
  }
  return Math.round(value * 100);
};

export const amountFromCents = (value: number): number => value / 100;
