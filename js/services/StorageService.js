/**
 * StorageService
 * ---------------
 * Responsible for persistence of application data using browser localStorage.
 *
 *
 * Rules:
 * - Controllers/domain objects should use this service instead of accessing
 *   localStorage directly.
 * - No business rules belong in this class.
 * - Data is stored as JSON.
 */

export class StorageService {

    /**
     * Retrieve data from localStorage.
     *
     * @param {string} key
     * @param {*} defaultValue Value returned when the key does not exist
     * @returns {*} Parsed stored data or defaultValue
     */
    static get(key, defaultValue = null) {
        try {
            const storedData = localStorage.getItem(key);

            if (storedData === null) {
                return defaultValue;
            }

            return JSON.parse(storedData);
        } catch (error) {
            console.error(`StorageService.get('${key}') failed:`, error);
            return defaultValue;
        }
    }


    /**
     * Save data to localStorage.
     *
     * @param {string} key
     * @param {*} data
     * @returns {boolean} true if successful, false otherwise
     */
    static set(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error(`StorageService.set('${key}') failed:`, error);
            return false;
        }
    }


    /**
     * Remove a stored item.
     *
     * @param {string} key
     * @returns {boolean} true when removal succeeds
     */
    static remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error(`StorageService.remove('${key}') failed:`, error);
            return false;
        }
    }


    /**
     * Check whether a key exists.
     *
     * @param {string} key
     * @returns {boolean}
     */
    static exists(key) {
        return localStorage.getItem(key) !== null;
    }


    /**
     * Remove all application data managed by the POS.
     *
     * IMPORTANT:
     * Do not use localStorage.clear() because that may remove data
     * belonging to other applications/sites.
     *
     * @param {string[]} keys
     * @returns {boolean}
     */
    static clearKeys(keys) {
        try {
            keys.forEach(key => localStorage.removeItem(key));
            return true;
        } catch (error) {
            console.error("StorageService.clearKeys() failed:", error);
            return false;
        }
    }


    /**
     * Generate a simple application identifier.
     *
     * This is suitable for a prototype. A production application
     * would normally use server/database-generated IDs.
     *
     * @param {string} prefix
     * @returns {string}
     */
    static generateId(prefix) {
        const timestamp = Date.now();
        const randomPart = Math.floor(Math.random() * 1000);

        return `${prefix}${timestamp}${randomPart}`;
    }
}
