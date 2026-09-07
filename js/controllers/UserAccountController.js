/**
 * UserAccountController
 * ---------------------
 * Handles user authentication, session management,
 * and role checking.
 *
 * Architectural role:
 * Business / Application Tier
 *
 * The controller does NOT access localStorage directly.
 * All persistence is handled through StorageService.
 */

import { StorageService } from "../services/StorageService.js";
import { STORAGE_KEYS } from "../utils/storageKeys.js";


export class UserAccountController {

    /**
     * Authenticate a user.
     *
     * @param {string} username
     * @param {string} password
     * @returns {object} Login result
     */
    static login(username, password) {

        const users = StorageService.get(
            STORAGE_KEYS.USERS,
            []
        );

        // Find an active user with matching credentials
        const user = users.find(
            account =>
                account.username === username &&
                account.password === password &&
                account.active === true
        );

        // Invalid credentials
        if (!user) {
            return {
                success: false,
                message: "Invalid username or password."
            };
        }

        /*
         * Do not store the password in the session.
         */
        const session = {
            userId: user.userId,
            username: user.username,
            fullName: user.fullName,
            role: user.role,
            loginTime: new Date().toISOString()
        };

        // Save authenticated session
        const saved = StorageService.set(
            STORAGE_KEYS.SESSION,
            session
        );

        if (!saved) {
            return {
                success: false,
                message: "Unable to create user session."
            };
        }

        return {
            success: true,
            message: "Login successful.",
            user: session
        };
    }


    /**
     * Log the current user out.
     *
     * @returns {boolean}
     */
    static logout() {

        return StorageService.remove(
            STORAGE_KEYS.SESSION
        );
    }


    /**
     * Return the currently authenticated user.
     *
     * @returns {object|null}
     */
    static getCurrentUser() {

        return StorageService.get(
            STORAGE_KEYS.SESSION,
            null
        );
    }


    /**
     * Check whether a user is currently authenticated.
     *
     * @returns {boolean}
     */
    static isAuthenticated() {

        return this.getCurrentUser() !== null;
    }


    /**
     * Check whether the current user has a particular role.
     *
     * @param {string} role
     * @returns {boolean}
     */
    static hasRole(role) {

        const user = this.getCurrentUser();

        if (!user) {
            return false;
        }

        return user.role === role;
    }
}
