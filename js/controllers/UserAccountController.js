import {
    UserAccount,
    USER_ROLES
} from "../models/UserAccount.js";

import { StorageService } from "../storage/StorageService.js";
import { STORAGE_KEYS } from "../utils/StorageKeys.js";

export class UserAccountController {
    constructor(storageService = StorageService) {
        if (!storageService) {
            throw new Error(
                "UserAccountController requires a storage service."
            );
        }

        this.storage = storageService;
    }

    createAccount(accountData = {}) {
        const username = String(
            accountData.username || ""
        ).trim();

        if (!username) {
            throw new Error("Username is required.");
        }

        const existingUser =
            this.storage.findUserByUsername(username);

        if (existingUser) {
            throw new Error(
                `Username already exists: ${username}`
            );
        }

        const user = new UserAccount({
            ...accountData,
            userId:
                accountData.userId ||
                this.storage.generateId("USER"),
            username
        });

        const validation = user.validate();

        if (!validation.valid) {
            throw new Error(
                `Cannot create account: ${validation.errors.join(", ")}`
            );
        }

        this.storage.saveUser(user.toObject());

        return user;
    }

    login(username, password) {
        const normalizedUsername =
            String(username || "").trim();

        if (!normalizedUsername) {
            throw new Error("Username is required.");
        }

        const userData =
            this.storage.findUserByUsername(
                normalizedUsername
            );

        if (!userData) {
            throw new Error("Invalid username or password.");
        }

        const user = new UserAccount(userData);

        if (!user.authenticate(password)) {
            throw new Error("Invalid username or password.");
        }

        this.storage.saveSession({
            userId: user.userId,
            username: user.username,
            role: user.role
        });

        return user;
    }

    logout() {
        this.storage.clearSession();
        return true;
    }

    getCurrentUser() {
        const session = this.storage.getSession();

        if (!session || !session.userId) {
            return null;
        }

        const userData =
            this.storage.findUserById(
                session.userId
            );

        if (!userData) {
            this.storage.clearSession();
            return null;
        }

        return new UserAccount(userData);
    }

    isAuthenticated() {
        return this.getCurrentUser() !== null;
    }

    hasRole(role) {
        const user = this.getCurrentUser();

        if (!user) {
            return false;
        }

        return user.hasRole(role);
    }

    updateAccount(accountData = {}) {
        if (!accountData.userId) {
            throw new Error(
                "User ID is required for an account update."
            );
        }

        const existingData =
            this.storage.findUserById(
                accountData.userId
            );

        if (!existingData) {
            throw new Error(
                `User not found: ${accountData.userId}`
            );
        }

        const user = new UserAccount(existingData);

        if (
            accountData.username !== undefined &&
            accountData.username !== user.username
        ) {
            const existingUsername =
                this.storage.findUserByUsername(
                    String(accountData.username).trim()
                );

            if (
                existingUsername &&
                existingUsername.userId !== user.userId
            ) {
                throw new Error(
                    `Username already exists: ${accountData.username}`
                );
            }
        }

        user.updateDetails(accountData);

        const validation = user.validate();

        if (!validation.valid) {
            throw new Error(
                `Cannot update account: ${validation.errors.join(", ")}`
            );
        }

        this.storage.saveUser(user.toObject());

        return user;
    }

    assignRole(userId, role) {
        if (!userId) {
            throw new Error("User ID is required.");
        }

        if (!Object.values(USER_ROLES).includes(role)) {
            throw new Error(
                `Invalid user role: ${role}`
            );
        }

        const userData =
            this.storage.findUserById(userId);

        if (!userData) {
            throw new Error(
                `User not found: ${userId}`
            );
        }

        const user = new UserAccount(userData);

        user.assignRole(role);

        this.storage.saveUser(user.toObject());

        const currentUser = this.getCurrentUser();

        if (
            currentUser &&
            currentUser.userId === user.userId
        ) {
            this.storage.saveSession({
                userId: user.userId,
                username: user.username,
                role: user.role
            });
        }

        return user;
    }

    deactivateAccount(userId) {
        if (!userId) {
            throw new Error("User ID is required.");
        }

        const userData =
            this.storage.findUserById(userId);

        if (!userData) {
            throw new Error(
                `User not found: ${userId}`
            );
        }

        const user = new UserAccount(userData);

        user.deactivate();

        this.storage.saveUser(user.toObject());

        const session = this.storage.getSession();

        if (
            session &&
            session.userId === user.userId
        ) {
            this.storage.clearSession();
        }

        return user;
    }

    getUsers() {
        const users =
            this.storage.findAll(
                STORAGE_KEYS.USERS
            ) || [];

        return users.map(
            user => new UserAccount(user)
        );
    }
}   