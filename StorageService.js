export class StorageService {
  findPrescriptionById(id) {
    const list = JSON.parse(localStorage.getItem("prescriptions") || "[]");
    return list.find((p) => p.prescriptionId === id) || null;
  }

  savePrescription(prescription) {
    const list = JSON.parse(localStorage.getItem("prescriptions") || "[]");
    const index = list.findIndex((p) => p.prescriptionId === prescription.prescriptionId);
    if (index >= 0) list[index] = prescription;
    else list.push(prescription);
    localStorage.setItem("prescriptions", JSON.stringify(list));
  }

  findBatchesByMedicineId(medicineId) {
    const batches = JSON.parse(localStorage.getItem("medicineBatches") || "[]");
    return batches.filter((b) => b.medicineId === medicineId);
  }

  saveBatch(batch) {
    const batches = JSON.parse(localStorage.getItem("medicineBatches") || "[]");
    const index = batches.findIndex((b) => b.batchId === batch.batchId);
    if (index >= 0) batches[index] = batch;
    else batches.push(batch);
    localStorage.setItem("medicineBatches", JSON.stringify(batches));
  }

  findMedicineById(medicineId) {
    const medicines = JSON.parse(localStorage.getItem("medicines") || "[]");
    return medicines.find((m) => m.medicineId === medicineId) || null;
  }

  saveDispensingRecord(record) {
    const records = JSON.parse(localStorage.getItem("dispensingRecords") || "[]");
    records.push(record);
    localStorage.setItem("dispensingRecords", JSON.stringify(records));
  }

  savePendingCharge(charge) {
    const charges = JSON.parse(localStorage.getItem("pendingCharges") || "[]");
    charges.push(charge);
    localStorage.setItem("pendingCharges", JSON.stringify(charges));
  }
}