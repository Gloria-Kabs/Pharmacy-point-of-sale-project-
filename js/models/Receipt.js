export class Receipt {
    constructor({
        receiptId,
        saleId,
        issuedDateTime = new Date().toISOString()
    } = {}) {
        this.receiptId = receiptId;
        this.saleId = saleId;
        this.issuedDateTime = issuedDateTime;
    }

    generate(sale, payment) {
        if (!sale) {
            throw new Error(
                "Sale is required to generate a receipt."
            );
        }

        if (!payment) {
            throw new Error(
                "Payment is required to generate a receipt."
            );
        }

        return {
            receiptId: this.receiptId,
            saleId: this.saleId,
            issuedDateTime: this.issuedDateTime,

            items: sale.items.map(item =>
                item.toObject()
            ),

            total: sale.total,

            paymentMethod: payment.method,
            amountTendered: payment.amountTendered,
            change: payment.change
        };
    }

    validate() {
        const errors = [];

        if (!this.receiptId) {
            errors.push("Receipt ID is required.");
        }

        if (!this.saleId) {
            errors.push("Sale ID is required.");
        }

        if (!this.issuedDateTime) {
            errors.push(
                "Receipt issue date and time is required."
            );
        } else if (
            Number.isNaN(Date.parse(this.issuedDateTime))
        ) {
            errors.push(
                "Receipt issue date and time must be a valid date."
            );
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    toObject() {
        return {
            receiptId: this.receiptId,
            saleId: this.saleId,
            issuedDateTime: this.issuedDateTime
        };
    }
}