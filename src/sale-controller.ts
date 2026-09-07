import { randomUUID } from 'node:crypto';
import {
  amountFromCents,
  centsFromAmount,
  SaleError,
  SaleRequest,
  SaleResult,
} from './domain.js';
import {
  AuditLogService,
  BillingService,
  InventoryService,
  PaymentService,
  ReceiptService,
} from './services.js';

export class SaleController {
  constructor(
    private readonly inventory: InventoryService,
    private readonly billing: BillingService,
    private readonly payment: PaymentService,
    private readonly receipts: ReceiptService,
    private readonly audit: AuditLogService,
  ) {}

  createSale(request: SaleRequest): SaleResult {
    this.validateRequest(request);
    const items = request.otcItems.map(({ productId, quantity }) => ({ productId, quantity }));
    this.inventory.validateItems(items);

    const otcSubtotalCents = this.inventory.priceItems(items);
    const pendingCharges = request.includePendingCharges && request.customerId
      ? this.billing.getPendingCharges(request.customerId)
      : [];
    const pendingChargesCents = pendingCharges.reduce((sum, charge) => sum + charge.amountCents, 0);
    const discountCents = centsFromAmount(request.discount, 'discount');
    const taxCents = centsFromAmount(request.tax, 'tax');
    const grandTotalCents = otcSubtotalCents + pendingChargesCents - discountCents + taxCents;
    if (grandTotalCents < 0) throw new SaleError('INVALID_TOTAL', 'Discount cannot exceed the sale total');

    let paymentResult;
    try {
      paymentResult = this.payment.charge(
        request.paymentMethod,
        grandTotalCents,
        centsFromAmount(request.amountTendered, 'amountTendered'),
      );
    } catch (error) {
      this.audit.record('SALE_PAYMENT_FAILED', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }

    try {
      if (items.length > 0) this.inventory.deduct(items);
      if (request.customerId && pendingCharges.length > 0) {
        this.billing.applyPayment(request.customerId, paymentResult.acceptedCents);
      }
      const saleId = randomUUID();
      const result: SaleResult = {
        saleId,
        otcSubtotal: amountFromCents(otcSubtotalCents),
        pendingChargesTotal: amountFromCents(pendingChargesCents),
        discount: amountFromCents(discountCents),
        tax: amountFromCents(taxCents),
        grandTotal: amountFromCents(grandTotalCents),
        amountTendered: amountFromCents(paymentResult.acceptedCents),
        change: amountFromCents(paymentResult.changeCents),
        status: paymentResult.status,
        receiptId: null,
      };
      result.receiptId = this.receipts.create(result).receiptId;
      this.audit.record('SALE_COMPLETED', result);
      return result;
    } catch (error) {
      this.inventory.restore(items);
      if (request.customerId) this.billing.restorePayment(request.customerId, pendingCharges);
      this.payment.refund(paymentResult.transactionId);
      this.audit.record('SALE_ROLLED_BACK', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  private validateRequest(request: SaleRequest): void {
    if (!request || !Array.isArray(request.otcItems)) throw new SaleError('INVALID_REQUEST', 'otcItems must be an array');
    if (request.otcItems.length === 0 && (!request.customerId || !request.includePendingCharges)) {
      throw new SaleError('INVALID_REQUEST', 'A sale requires OTC items or pending charges');
    }
    if (request.includePendingCharges && !request.customerId) {
      throw new SaleError('INVALID_REQUEST', 'customerId is required when including pending charges');
    }
    if (!['cash', 'card', 'mobile_money', 'insurance', 'split'].includes(request.paymentMethod)) {
      throw new SaleError('INVALID_PAYMENT_METHOD', 'Unsupported payment method');
    }
  }
}