import { StorageService } from "../services/StorageService.js";
import { DispensingController } from "../controllers/DispensingController.js";

const storage = new StorageService();
const dispensingController = new DispensingController(storage);

// Pharmacist enters reference and loads details
dispensingController.startDispensing();
const rx = dispensingController.retrievePrescription("RX-1001");

// Verify status and expiry
dispensingController.verifyPrescription();

// Check batch availability
const stockReport = dispensingController.checkAvailability();

// Confirm actual quantities to dispense
const result = dispensingController.confirmDispensing(
  [{ medicineId: "MED-01", quantityToDispense: 10 }],
  "PHARM-USER-001"
);

console.log("Dispensing completed!");
console.log("Cashier Handoff Reference:", result.pendingCharge.reference);
console.log("Total Amount Due:", result.pendingCharge.amount, result.pendingCharge.currency);