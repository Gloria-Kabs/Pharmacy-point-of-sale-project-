export const USER_ROLES = Object.freeze({
    ADMIN: "ADMIN",
    PHARMACIST: "PHARMACIST",
    CASHIER: "CASHIER"
});

export class UserAccount {
    constructor({
        userId,
        username = "",
        password = "",
        role = USER_ROLES.CASHIER,
        active = true
    } = {}) {
        this.userId = userId;
        this.username = String(username).trim();
        this.password = String(password);
        this.role = role;
        this.active = Boolean(active);
    }

    authenticate(password) {
        if (!this.active) {
            return false;
        }

        return this.password === String(password);
    }

    hasRole(role) {
        return this.role === role;
    }

    deactivate() {
        this.active = false;
        return this;
    }

    activate() {
        this.active = true;
        return this;
    }

    updateDetails({
        username,
        password
    } = {}) {
        if (username !== undefined) {
            const newUsername = String(username).trim();

            if (!newUsername) {
                throw new Error("Username cannot be empty.");
            }

            this.username = newUsername;
        }

        if (password !== undefined) {
            const newPassword = String(password);

            if (!newPassword) {
                throw new Error("Password cannot be empty.");
            }

            this.password = newPassword;
        }

        return this;
    }

    assignRole(role) {
        if (!Object.values(USER_ROLES).includes(role)) {
            throw new Error(`Invalid user role: ${role}`);
        }

        this.role = role;

        return this;
    }

    validate() {
        const errors = [];

        if (!this.userId) {
            errors.push("User ID is required.");
        }

        if (!this.username) {
            errors.push("Username is required.");
        }

        if (!this.password) {
            errors.push("Password is required.");
        }

        if (!Object.values(USER_ROLES).includes(this.role)) {
            errors.push("Invalid user role.");
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    toObject() {
        return {
            userId: this.userId,
            username: this.username,
            password: this.password,
            role: this.role,
            active: this.active
        };
    }
}