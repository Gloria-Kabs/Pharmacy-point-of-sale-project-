export class SalesLineItem {
    constructor({
        salesLineItemId,
        medicineId = null,
        description = "",
        quantity = 1,
        unitPrice = 0,
        subtotal = 0
    } = {}) {
        this.salesLineItemId = salesLineItemId;
        this.medicineId = medicineId;
        this.description = String(description).trim();
        this.quantity = Number(quantity);
        this.unitPrice = Number(unitPrice);
        this.subtotal = Number(subtotal);

        this.calculateSubtotal();
    }

    calculateSubtotal() {
        if (
            !Number.isFinite(this.quantity) ||
            !Number.isFinite(this.unitPrice)
        ) {
            this.subtotal = 0;
            return this.subtotal;
        }

        this.subtotal = Number(
            (this.quantity * this.unitPrice).toFixed(2)
        );

        return this.subtotal;
    }

    validate() {
        const errors = [];

        if (!this.salesLineItemId) {
            errors.push("Sales line item ID is required.");
        }

        if (!this.description) {
            errors.push("Item description is required.");
        }

        if (
            !Number.isInteger(this.quantity) ||
            this.quantity <= 0
        ) {
            errors.push(
                "Quantity must be a positive whole number."
            );
        }

        if (
            !Number.isFinite(this.unitPrice) ||
            this.unitPrice < 0
        ) {
            errors.push(
                "Unit price must be a valid non-negative number."
            );
        }

        this.calculateSubtotal();

        if (!Number.isFinite(this.subtotal) || this.subtotal < 0) {
            errors.push(
                "Subtotal must be a valid non-negative number."
            );
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    toObject() {
        return {
            salesLineItemId: this.salesLineItemId,
            medicineId: this.medicineId,
            description: this.description,
            quantity: this.quantity,
            unitPrice: this.unitPrice,
            subtotal: this.subtotal
        };
    }
}