import { SalesLineItem } from "./SalesLineItem.js";

export const SALE_STATUS = Object.freeze({
    OPEN: "OPEN",
    COMPLETED: "COMPLETED",
    CANCELLED: "CANCELLED"
});

export class Sale {
    constructor({
        saleId,
        customerId = null,
        dateTime = new Date().toISOString(),
        total = 0,
        status = SALE_STATUS.OPEN,
        items = [],
        pendingChargeId = null,
        pendingChargeAmount = 0
    } = {}) {
        this.saleId = saleId;
        this.customerId = customerId;
        this.dateTime = dateTime;
        this.total = Number(total) || 0;
        this.status = status;

        this.items = Array.isArray(items)
            ? items.map(item =>
                item instanceof SalesLineItem
                    ? item
                    : new SalesLineItem(item)
            )
            : [];

        this.pendingChargeId = pendingChargeId;
        this.pendingChargeAmount = Number(pendingChargeAmount) || 0;

        this.payment = null;
    }

    addLineItem(item) {
        if (this.status !== SALE_STATUS.OPEN) {
            throw new Error("Items can only be added to an open sale.");
        }

        const lineItem =
            item instanceof SalesLineItem
                ? item
                : new SalesLineItem(item);

        const validation = lineItem.validate();

        if (!validation.valid) {
            throw new Error(
                `Invalid sales line item: ${validation.errors.join(" ")}`
            );
        }

        const existingItem = this.items.find(
            existing =>
                existing.medicineId !== null &&
                lineItem.medicineId !== null &&
                String(existing.medicineId) === String(lineItem.medicineId)
        );

        if (existingItem) {
            existingItem.quantity += lineItem.quantity;
            existingItem.calculateSubtotal();
        } else {
            this.items.push(lineItem);
        }

        this.calculateTotal();

        return lineItem;
    }

    addPendingCharge(charge) {
        if (this.status !== SALE_STATUS.OPEN) {
            throw new Error(
                "A pending charge can only be added to an open sale."
            );
        }

        if (!charge) {
            throw new Error("Pending charge is required.");
        }

        if (this.pendingChargeId) {
            throw new Error(
                "A pending charge has already been added to this sale."
            );
        }

        const chargeId = charge.chargeId;
        const amount = Number(charge.amount);

        if (!chargeId) {
            throw new Error("Pending charge ID is required.");
        }

        if (!Number.isFinite(amount) || amount < 0) {
            throw new Error(
                "Pending charge amount must be a valid non-negative number."
            );
        }

        this.pendingChargeId = chargeId;
        this.pendingChargeAmount = amount;

        this.calculateTotal();

        return charge;
    }

    calculateTotal() {
        const itemTotal = this.items.reduce(
            (total, item) =>
                total + Number(item.subtotal || 0),
            0
        );

        this.total = Number(
            (itemTotal + this.pendingChargeAmount).toFixed(2)
        );

        return this.total;
    }

    recordPayment(payment) {
        if (this.status !== SALE_STATUS.OPEN) {
            throw new Error(
                "Payment can only be recorded for an open sale."
            );
        }

        if (!payment) {
            throw new Error("Payment is required.");
        }

        this.payment = payment;

        return payment;
    }

    complete() {
        if (this.status === SALE_STATUS.CANCELLED) {
            throw new Error(
                "A cancelled sale cannot be completed."
            );
        }

        if (this.status === SALE_STATUS.COMPLETED) {
            throw new Error(
                "A completed sale cannot be completed again."
            );
        }

        if (this.items.length === 0 && !this.pendingChargeId) {
            throw new Error("Cannot complete an empty sale.");
        }

        if (!this.payment) {
            throw new Error(
                "Payment must be recorded before completing the sale."
            );
        }

        this.calculateTotal();

        this.status = SALE_STATUS.COMPLETED;

        return this;
    }

    cancel() {
        if (this.status === SALE_STATUS.COMPLETED) {
            throw new Error(
                "A completed sale cannot be cancelled."
            );
        }

        this.status = SALE_STATUS.CANCELLED;

        return this;
    }

    validate() {
        const errors = [];

        if (!this.saleId) {
            errors.push("Sale ID is required.");
        }

        if (!Object.values(SALE_STATUS).includes(this.status)) {
            errors.push("Invalid sale status.");
        }

        if (!this.dateTime) {
            errors.push("Sale date and time is required.");
        } else if (Number.isNaN(Date.parse(this.dateTime))) {
            errors.push(
                "Sale date and time must be a valid date."
            );
        }

        if (!Array.isArray(this.items)) {
            errors.push("Sale items must be an array.");
        }

        if (
            !Number.isFinite(this.pendingChargeAmount) ||
            this.pendingChargeAmount < 0
        ) {
            errors.push(
                "Pending charge amount must be a valid non-negative number."
            );
        }

        if (this.pendingChargeAmount > 0 && !this.pendingChargeId) {
            errors.push(
                "Pending charge ID is required when a pending charge amount exists."
            );
        }

        this.items.forEach((item, index) => {
            const validation = item.validate();

            if (!validation.valid) {
                errors.push(
                    `Invalid sales line item at index ${index}: ${validation.errors.join(" ")}`
                );
            }
        });

        this.calculateTotal();

        if (!Number.isFinite(this.total) || this.total < 0) {
            errors.push(
                "Sale total must be a valid non-negative number."
            );
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    toObject() {
        return {
            saleId: this.saleId,
            customerId: this.customerId,
            dateTime: this.dateTime,
            total: this.total,
            status: this.status,
            items: this.items.map(item => item.toObject()),
            pendingChargeId: this.pendingChargeId,
            pendingChargeAmount: this.pendingChargeAmount
        };
    }
}