import { describe, it, expect, beforeEach } from "vitest";
import { CustomerController } from "../js/controllers/CustomerController.js";
import { Customer } from "../js/models/Customer.js";
import { STORAGE_KEYS } from "../js/utils/StorageKeys.js";

function createMockStorage() {
    const data = new Map();

    return {
        generateId(prefix) {
            return `${prefix}-1001`;
        },

        findAll(key) {
            return data.get(key) || [];
        },

        findById(key, id, idField = "customerId") {
            const records = data.get(key) || [];

            return records.find(
                record => String(record[idField]) === String(id)
            ) || null;
        },

        save(key, value, idField = "customerId") {
            const records = data.get(key) || [];

            const index = records.findIndex(
                record =>
                    String(record[idField]) === String(value[idField])
            );

            if (index >= 0) {
                records[index] = value;
            } else {
                records.push(value);
            }

            data.set(key, records);

            return value;
        },

        remove(key, id, idField = "customerId") {
            const records = data.get(key) || [];

            const filtered = records.filter(
                record =>
                    String(record[idField]) !== String(id)
            );

            data.set(key, filtered);

            return true;
        }
    };
}

describe("CustomerController", () => {
    let storage;
    let controller;

    beforeEach(() => {
        storage = createMockStorage();
        controller = new CustomerController(storage);
    });

    describe("registerCustomer()", () => {
        it("should create and store a valid customer", () => {
            const customer = controller.registerCustomer({
                name: "John Smith",
                phone: "555-1234",
                address: "123 Main Street"
            });

            expect(customer).toBeInstanceOf(Customer);
            expect(customer.customerId).toBe("CUST-1001");
            expect(customer.name).toBe("John Smith");

            const stored = storage.findAll(
                STORAGE_KEYS.CUSTOMERS
            );

            expect(stored).toHaveLength(1);
            expect(stored[0].name).toBe("John Smith");
        });

        it("should reject a customer without a name", () => {
            expect(() =>
                controller.registerCustomer({
                    phone: "555-1234"
                })
            ).toThrow();
        });
    });

    describe("findCustomer()", () => {
        it("should find a customer by customer ID", () => {
            storage.save(
                STORAGE_KEYS.CUSTOMERS,
                {
                    customerId: "CUST-123",
                    name: "Alice",
                    phone: "555-9999",
                    address: "456 Main Street"
                },
                "customerId"
            );

            const result = controller.findCustomer("CUST-123");

            expect(result).toBeInstanceOf(Customer);
            expect(result.name).toBe("Alice");
            expect(result.phone).toBe("555-9999");
        });

        it("should return null when the customer does not exist", () => {
            const result = controller.findCustomer("CUST-999");

            expect(result).toBeNull();
        });
    });

    describe("customer updates", () => {
        it("should update customer details", () => {
            controller.registerCustomer({
                name: "John Smith",
                phone: "555-1234",
                address: "123 Main Street"
            });

            const updated = controller.updateCustomer({
                customerId: "CUST-1001",
                name: "John Smith Updated",
                phone: "555-5678",
                address: "789 New Street"
            });

            expect(updated.name).toBe("John Smith Updated");
            expect(updated.phone).toBe("555-5678");
            expect(updated.address).toBe("789 New Street");
        });
    });
});