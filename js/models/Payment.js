export const PAYMENT_METHODS = Object.freeze({
    CASH: "CASH",
    MOBILE_MONEY: "MOBILE_MONEY",
    CARD: "CARD"
});

export class Payment {
    constructor({
        paymentId,
        saleId,
        method,
        amountTendered = 0,
        change = 0
    } = {}) {
        this.paymentId = paymentId;
        this.saleId = saleId;
        this.method = method;
        this.amountTendered = Number(amountTendered);
        this.change = Number(change);
    }

    calculateChange(total) {
        const saleTotal = Number(total);

        if (
            !Number.isFinite(saleTotal) ||
            saleTotal < 0
        ) {
            throw new Error(
                "Sale total must be a valid non-negative number."
            );
        }

        if (
            !Number.isFinite(this.amountTendered) ||
            this.amountTendered < 0
        ) {
            throw new Error(
                "Amount tendered must be a valid non-negative number."
            );
        }

        if (this.amountTendered < saleTotal) {
            throw new Error(
                "Amount tendered is insufficient."
            );
        }

        this.change = Number(
            (this.amountTendered - saleTotal).toFixed(2)
        );

        return this.change;
    }

    validate(total = null) {
        const errors = [];

        if (!this.paymentId) {
            errors.push("Payment ID is required.");
        }

        if (!this.saleId) {
            errors.push("Sale ID is required.");
        }

        if (
            !Object.values(PAYMENT_METHODS).includes(this.method)
        ) {
            errors.push("Invalid payment method.");
        }

        if (
            !Number.isFinite(this.amountTendered) ||
            this.amountTendered < 0
        ) {
            errors.push(
                "Amount tendered must be a non-negative number."
            );
        }

        if (
            !Number.isFinite(this.change) ||
            this.change < 0
        ) {
            errors.push(
                "Change must be a non-negative number."
            );
        }

        if (
            total !== null &&
            (
                !Number.isFinite(Number(total)) ||
                Number(total) < 0
            )
        ) {
            errors.push(
                "Sale total must be a valid non-negative number."
            );
        } else if (
            total !== null &&
            this.amountTendered < Number(total)
        ) {
            errors.push(
                "Amount tendered is insufficient."
            );
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    toObject() {
        return {
            paymentId: this.paymentId,
            saleId: this.saleId,
            method: this.method,
            amountTendered: this.amountTendered,
            change: this.change
        };
    }
}