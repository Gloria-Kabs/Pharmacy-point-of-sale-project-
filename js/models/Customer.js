export class Customer {
    constructor({
        customerId,
        name = "",
        phone = "",
        address = "",
        email = "",
        allergies = "",
        notes = "",
        totalSpent = 0,
        loyaltyPoints = 0
    } = {}) {
        this.customerId = customerId;
        this.name = name.trim();
        this.phone = phone.trim();
        this.address = address.trim();
        this.email = email.trim();
        this.allergies = allergies.trim();
        this.notes = notes.trim();
        this.totalSpent = Number(totalSpent) || 0;
        this.loyaltyPoints = Number(loyaltyPoints) || 0;
    }

    updateDetails({
        name,
        phone,
        address,
        email,
        allergies,
        notes
    } = {}) {
        if (name !== undefined) {
            this.name = String(name).trim();
        }

        if (phone !== undefined) {
            this.phone = String(phone).trim();
        }

        if (address !== undefined) {
            this.address = String(address).trim();
        }

        if (email !== undefined) {
            this.email = String(email).trim();
        }

        if (allergies !== undefined) {
            this.allergies = String(allergies).trim();
        }

        if (notes !== undefined) {
            this.notes = String(notes).trim();
        }

        return this;
    }

    addToTotalSpent(amount) {
        const value = Number(amount);

        if (!Number.isFinite(value) || value < 0) {
            throw new Error("Amount must be a valid non-negative number.");
        }

        this.totalSpent = Number(
            (this.totalSpent + value).toFixed(2)
        );

        return this.totalSpent;
    }

    addLoyaltyPoints(points) {
        const value = Number(points);

        if (!Number.isFinite(value) || value < 0) {
            throw new Error(
                "Loyalty points must be a valid non-negative number."
            );
        }

        this.loyaltyPoints += Math.floor(value);

        return this.loyaltyPoints;
    }

    validate() {
        const errors = [];

        if (!this.customerId) {
            errors.push("Customer ID is required.");
        }

        if (!this.name) {
            errors.push("Customer name is required.");
        }

        if (
            !Number.isFinite(this.totalSpent) ||
            this.totalSpent < 0
        ) {
            errors.push("Total spent must be a valid non-negative number.");
        }

        if (
            !Number.isFinite(this.loyaltyPoints) ||
            this.loyaltyPoints < 0
        ) {
            errors.push(
                "Loyalty points must be a valid non-negative number."
            );
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    toObject() {
        return {
            customerId: this.customerId,
            name: this.name,
            phone: this.phone,
            address: this.address,
            email: this.email,
            allergies: this.allergies,
            notes: this.notes,
            totalSpent: this.totalSpent,
            loyaltyPoints: this.loyaltyPoints
        };
    }
}