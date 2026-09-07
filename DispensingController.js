/**
 * DispensingController.js
 * Business / Application Tier Controller
 * Coordinates UC02: Dispense Prescription
 */

export class DispensingController {
  /**
   * @param {Object} storageService - Data Tier persistence abstraction
   */
  constructor(storageService) {
    if (!storageService) {
      throw new Error("DispensingController requires an instance of StorageService.");
    }
    this.storage = storageService;
    this.currentPrescription = null;
    this.verified = false;
  }

  /**
   * Resets internal controller state for a new dispensing session.
   */
  startDispensing() {
    this.currentPrescription = null;
    this.verified = false;
  }

  /**
   * Step 2 & 3: Retrieves prescription by identifier/reference.
   * @param {string} reference - Prescription identifier
   * @returns {Object} Plain object view of the prescription with associated items and customer info
   */
  retrievePrescription(reference) {
    if (!reference || typeof reference !== "string") {
      throw new Error("Invalid prescription reference supplied.");
    }

    const prescriptionData = this.storage.findPrescriptionById(reference.trim());
    if (!prescriptionData) {
      throw new Error(`Prescription not found for reference: ${reference}`);
    }

    this.currentPrescription = prescriptionData;
    this.verified = false;

    return this.currentPrescription;
  }

  /**
   * Step 4: Validates prescription clinical status and expiry date (BR01, BR02).
   * @returns {boolean}
   */
  verifyPrescription() {
    if (!this.currentPrescription) {
      throw new Error("No active prescription selected. Retrieve a prescription first.");
    }

    const { status, expiryDate } = this.currentPrescription;
    const now = new Date();
    const expiry = new Date(expiryDate);

    // BR02: Completed or expired prescriptions cannot be dispensed
    if (status === "COMPLETED") {
      throw new Error("Prescription has already been completely dispensed.");
    }

    if (status === "EXPIRED" || expiry < now) {
      // Keep status up to date in model state
      this.currentPrescription.status = "EXPIRED";
      this.storage.savePrescription(this.currentPrescription);
      throw new Error("Prescription has expired and cannot be dispensed.");
    }

    if (status !== "ACTIVE" && status !== "PARTIALLY_DISPENSED") {
      throw new Error(`Prescription has invalid status: ${status}`);
    }

    this.verified = true;
    return true;
  }

  /**
   * Step 5: Checks stock levels across active batches for each medicine in the prescription.
   * @returns {Array<Object>} Availability breakdown per item
   */
  checkAvailability() {
    if (!this.verified || !this.currentPrescription) {
      throw new Error("Prescription must be verified before checking item stock.");
    }

    const availabilityReport = [];

    for (const item of this.currentPrescription.items) {
      const remainingNeeded = item.quantityPrescribed - (item.quantityDispensed || 0);

      if (remainingNeeded <= 0) {
        continue; // Already satisfied in an earlier partial run
      }

      // Load valid batches for medicine
      const batches = this.storage.findBatchesByMedicineId(item.medicineId) || [];
      const now = new Date();

      // Filter unexpired batches with stock
      const validBatches = batches.filter(
        (b) => new Date(b.expiryDate) > now && b.quantityOnHand > 0
      );

      const totalAvailable = validBatches.reduce((sum, b) => sum + b.quantityOnHand, 0);

      availabilityReport.push({
        medicineId: item.medicineId,
        medicineName: item.name,
        quantityPrescribed: item.quantityPrescribed,
        quantityPreviouslyDispensed: item.quantityDispensed || 0,
        remainingNeeded,
        totalAvailableStock: totalAvailable,
        canFulfillFully: totalAvailable >= remainingNeeded,
        canFulfillPartially: totalAvailable > 0 && totalAvailable < remainingNeeded,
        isOutOfStock: totalAvailable === 0
      });
    }

    return availabilityReport;
  }

  /**
   * Step 6-12: Confirms dispensing, updates inventory batches,
   * creates dispensing audit record, updates prescription status,
   * and creates a PendingCharge for Cashier pickup (BR01-05, BR11-12).
   * 
   * @param {Array<{medicineId: string, quantityToDispense: number}>} itemsToDispense
   * @param {string} dispensingStaffId - Authenticated Pharmacist user ID
   * @returns {Object} Result containing pending charge reference and dispensing summary
   */
  confirmDispensing(itemsToDispense, dispensingStaffId) {
    if (!this.verified || !this.currentPrescription) {
      throw new Error("Cannot confirm dispensing without prior verification.");
    }

    if (!Array.isArray(itemsToDispense) || itemsToDispense.length === 0) {
      throw new Error("No items designated for dispensing.");
    }

    const prescription = this.currentPrescription;
    const now = new Date();
    const recordsCreated = [];
    const modifiedBatches = [];
    let cumulativeChargeAmount = 0;

    // 1. Validate requested quantities and deduct from FIFO/FEFO batches
    for (const request of itemsToDispense) {
      const rxItem = prescription.items.find((i) => i.medicineId === request.medicineId);
      if (!rxItem) {
        throw new Error(`Medicine ${request.medicineId} is not on this prescription.`);
      }

      const remainingNeeded = rxItem.quantityPrescribed - (rxItem.quantityDispensed || 0);
      if (request.quantityToDispense > remainingNeeded) {
        throw new Error(
          `Requested quantity (${request.quantityToDispense}) exceeds outstanding prescribed balance (${remainingNeeded}) for ${rxItem.name}.`
        );
      }

      if (request.quantityToDispense <= 0) continue;

      // Fetch medicine metadata for unit pricing
      const medicine = this.storage.findMedicineById(rxItem.medicineId);
      if (!medicine) {
        throw new Error(`Medicine record missing for ID: ${rxItem.medicineId}`);
      }

      let remainingToDeduct = request.quantityToDispense;
      const batches = (this.storage.findBatchesByMedicineId(rxItem.medicineId) || [])
        .filter((b) => new Date(b.expiryDate) > now && b.quantityOnHand > 0)
        .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate)); // FEFO: Earliest Expiry First

      const batchAllocations = [];

      for (const batch of batches) {
        if (remainingToDeduct <= 0) break;

        const deduction = Math.min(batch.quantityOnHand, remainingToDeduct);
        batch.quantityOnHand -= deduction;
        remainingToDeduct -= deduction;

        batchAllocations.push({ batchId: batch.batchId, quantity: deduction });
        modifiedBatches.push(batch);
      }

      if (remainingToDeduct > 0) {
        throw new Error(`Insufficient batch stock for medicine: ${rxItem.name}`);
      }

      // Update the prescription item count
      rxItem.quantityDispensed = (rxItem.quantityDispensed || 0) + request.quantityToDispense;

      // Accumulate charge for actual quantity dispensed (BR03, BR11)
      cumulativeChargeAmount += Number((request.quantityToDispense * medicine.unitPrice).toFixed(2));

      // Build DispensingRecord entity representation
      recordsCreated.push({
        dispensingId: `DISP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        prescriptionId: prescription.prescriptionId,
        medicineId: rxItem.medicineId,
        quantityDispensed: request.quantityToDispense,
        dispensedDateTime: now.toISOString(),
        dispensedBy: dispensingStaffId,
        allocations: batchAllocations
      });
    }

    // 2. Determine new Prescription Status (BR04)
    const isFullyDispensed = prescription.items.every(
      (item) => (item.quantityDispensed || 0) >= item.quantityPrescribed
    );
    prescription.status = isFullyDispensed ? "COMPLETED" : "PARTIALLY_DISPENSED";

    // 3. Create PendingCharge if payment is required (BR01, BR05, BR11, BR12)
    let pendingCharge = null;
    if (cumulativeChargeAmount > 0) {
      pendingCharge = {
        chargeId: `CHG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        reference: `RX-CHG-${prescription.prescriptionId.slice(-4)}-${Math.floor(1000 + Math.random() * 9000)}`,
        prescriptionId: prescription.prescriptionId,
        amount: cumulativeChargeAmount,
        currency: "ZMW",
        status: "PENDING",
        createdDateTime: now.toISOString()
      };
    }

    // 4. Persistence Tier Handoff (Single coordinated commit)
    this.storage.savePrescription(prescription);
    modifiedBatches.forEach((batch) => this.storage.saveBatch(batch));
    recordsCreated.forEach((record) => this.storage.saveDispensingRecord(record));

    if (pendingCharge) {
      this.storage.savePendingCharge(pendingCharge);
    }

    // Reset local session state
    const resultSummary = {
      prescriptionId: prescription.prescriptionId,
      status: prescription.status,
      itemsDispensed: recordsCreated,
      pendingCharge: pendingCharge
        ? {
            reference: pendingCharge.reference,
            amount: pendingCharge.amount,
            currency: pendingCharge.currency,
            status: pendingCharge.status
          }
        : null
    };

    this.startDispensing();
    return resultSummary;
  }
}