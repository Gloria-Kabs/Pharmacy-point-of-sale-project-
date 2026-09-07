# Pharmacy Point of Sale

TypeScript implementation of the `SaleController` specification in `SaleController.md`.

## Run

```bash
npm install
npm test
npm run build
npm run dev
```

The HTTP service exposes `POST /api/sales`, `GET /api/customers/:customerId/pending-charges`, and `GET /api/receipts/:receiptId`. The default port is `3000`; set `PORT` to override it.

Money is represented internally as integer cents. The in-memory adapters are deliberately small and can be replaced with database, inventory, billing, payment, and receipt implementations through the service interfaces.
