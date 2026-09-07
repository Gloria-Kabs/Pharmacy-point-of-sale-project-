// js/controllers/CustomerController.js
import { Customer } from "../models/Customer.js";
import { STORAGE_KEYS } from "../utils/storageKeys.js";

/**
 * Controller: Handles business operations and persistence for Customer profiles.
 */
export class CustomerController {
  constructor(storageService) {
    if (!storageService) {
      throw new Error("CustomerController requires an instance of StorageService.");
    }
    this.storage = storageService;
  }

  /**
   * Adds a new customer after validating requirements.
   * @param {Object} customerData 
   * @returns {Object} Saved customer object
   */
  addCustomer(customerData) {
    const customer = new Customer(customerData);
    const { valid, errors } = customer.validate();

    if (!valid) {
      throw new Error(`Cannot add customer: ${errors.join(", ")}`);
    }

    const saved = this.storage.constructor.save(
      STORAGE_KEYS.CUSTOMERS,
      customer.toObject(),
      "customerId"
    );

    return saved;
  }

  /**
   * Retrieves all customer records.
   * @returns {Array<Object>}
   */
  getCustomers() {
    return this.storage.constructor.findAll(STORAGE_KEYS.CUSTOMERS);
  }

  /**
   * Finds a specific customer by customer ID.
   * @param {string|number} id 
   * @returns {Object|null}
   */
  findCustomer(id) {
    if (!id) return null;
    return this.storage.constructor.findById(
      STORAGE_KEYS.CUSTOMERS,
      String(id),
      "customerId"
    );
  }

  /**
   * Updates an existing customer record.
   * @param {Object} updatedCustomerData 
   * @returns {Object} Updated customer object
   */
  updateCustomer(updatedCustomerData) {
    if (!updatedCustomerData || !updatedCustomerData.customerId) {
      throw new Error("Invalid customer data or missing customerId.");
    }

    const existing = this.findCustomer(updatedCustomerData.customerId);
    if (!existing) {
      throw new Error(`Customer not found for ID: ${updatedCustomerData.customerId}`);
    }

    const customerModel = new Customer({ ...existing, ...updatedCustomerData });
    const { valid, errors } = customerModel.validate();

    if (!valid) {
      throw new Error(`Cannot update customer: ${errors.join(", ")}`);
    }

    return this.storage.constructor.save(
      STORAGE_KEYS.CUSTOMERS,
      customerModel.toObject(),
      "customerId"
    );
  }

  /**
   * Deletes a customer by ID.
   * @param {string|number} id 
   * @returns {boolean}
   */
  deleteCustomer(id) {
    if (!id) throw new Error("Customer ID is required for deletion.");
    return this.storage.constructor.delete(
      STORAGE_KEYS.CUSTOMERS,
      String(id),
      "customerId"
    );
  }
}