import { Customer } from "../models/Customer.js";
import { StorageService } from "../storage/StorageService.js";
import { STORAGE_KEYS } from "../utils/StorageKeys.js";

export class CustomerController {
    constructor(storageService = StorageService) {
        if (!storageService) {
            throw new Error(
                "CustomerController requires a storage service."
            );
        }

        this.storage = storageService;
    }

    registerCustomer(customerData = {}) {
        const customer = new Customer({
            ...customerData,
            customerId:
                customerData.customerId ||
                this.storage.generateId("CUST")
        });

        const validation = customer.validate();

        if (!validation.valid) {
            throw new Error(
                `Cannot register customer: ${validation.errors.join(", ")}`
            );
        }

        this.storage.save(
            STORAGE_KEYS.CUSTOMERS,
            customer.toObject(),
            "customerId"
        );

        return customer;
    }

    findCustomer(customerId) {
        if (!customerId) {
            return null;
        }

        const customerData = this.storage.findById(
            STORAGE_KEYS.CUSTOMERS,
            String(customerId),
            "customerId"
        );

        if (!customerData) {
            return null;
        }

        return new Customer(customerData);
    }

    getCustomers() {
        const customers =
            this.storage.findAll(STORAGE_KEYS.CUSTOMERS) || [];

        return customers.map(
            customer => new Customer(customer)
        );
    }

    updateCustomer(updatedCustomerData = {}) {
        if (!updatedCustomerData.customerId) {
            throw new Error(
                "Customer ID is required for an update."
            );
        }

        const existingCustomer = this.findCustomer(
            updatedCustomerData.customerId
        );

        if (!existingCustomer) {
            throw new Error(
                `Customer not found: ${updatedCustomerData.customerId}`
            );
        }

        existingCustomer.updateDetails(updatedCustomerData);

        const validation = existingCustomer.validate();

        if (!validation.valid) {
            throw new Error(
                `Cannot update customer: ${validation.errors.join(", ")}`
            );
        }

        this.storage.save(
            STORAGE_KEYS.CUSTOMERS,
            existingCustomer.toObject(),
            "customerId"
        );

        return existingCustomer;
    }

    deleteCustomer(customerId) {
        if (!customerId) {
            throw new Error("Customer ID is required for deletion.");
        }

        const existingCustomer = this.findCustomer(customerId);

        if (!existingCustomer) {
            throw new Error(
                `Customer not found: ${customerId}`
            );
        }

        return this.storage.delete(
            STORAGE_KEYS.CUSTOMERS,
            String(customerId),
            "customerId"
        );
    }

    recordSale(customerId, amount) {
        const customer = this.findCustomer(customerId);

        if (!customer) {
            throw new Error(
                `Customer not found: ${customerId}`
            );
        }

        customer.addToTotalSpent(amount);

        this.storage.save(
            STORAGE_KEYS.CUSTOMERS,
            customer.toObject(),
            "customerId"
        );

        return customer;
    }
}