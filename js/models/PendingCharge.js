export const CHARGE_STATUS = Object.freeze({
    PENDING: "PENDING",
    PAID: "PAID"
});

export class PendingCharge {
    constructor({
        chargeId,
        reference,
        prescriptionId,
        amount = 0,
        status = CHARGE_STATUS.PENDING,
        createdDateTime = new Date().toISOString()
    } = {}) {
        this.chargeId = chargeId;
        this.reference = reference;
        this.prescriptionId = prescriptionId;
        this.amount = Number(amount);
        this.status = status;
        this.createdDateTime = createdDateTime;
    }

    markPaid() {
        this.status = CHARGE_STATUS.PAID;
        return this.status;
    }

    isPending() {
        return this.status === CHARGE_STATUS.PENDING;
    }

    validate() {
        const errors = [];

        if (!this.chargeId) {
            errors.push("Charge ID is required.");
        }

        if (!this.reference) {
            errors.push("Charge reference is required.");
        }

        if (!this.prescriptionId) {
            errors.push("Prescription ID is required.");
        }

        if (
            !Number.isFinite(this.amount) ||
            this.amount < 0
        ) {
            errors.push(
                "Charge amount must be a non-negative number."
            );
        }

        if (
            !Object.values(CHARGE_STATUS).includes(this.status)
        ) {
            errors.push("Invalid charge status.");
        }

        if (!this.createdDateTime) {
            errors.push("Charge creation date and time is required.");
        } else if (
            Number.isNaN(Date.parse(this.createdDateTime))
        ) {
            errors.push(
                "Charge creation date and time must be a valid date."
            );
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    toObject() {
        return {
            chargeId: this.chargeId,
            reference: this.reference,
            prescriptionId: this.prescriptionId,
            amount: this.amount,
            status: this.status,
            createdDateTime: this.createdDateTime
        };
    }
}