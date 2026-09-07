import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { InMemoryAuditLogService, InMemoryBillingService, InMemoryInventoryService, InMemoryPaymentService, InMemoryReceiptService } from './services.js';
import { SaleController } from './sale-controller.js';
import { amountFromCents, SaleError } from './domain.js';

const inventory = new InMemoryInventoryService(new Map());
const billing = new InMemoryBillingService([]);
const payment = new InMemoryPaymentService();
const receipts = new InMemoryReceiptService();
const controller = new SaleController(inventory, billing, payment, receipts, new InMemoryAuditLogService());

const readJson = async (request: IncomingMessage): Promise<unknown> => {
  let body = '';
  for await (const chunk of request) body += chunk;
  return body ? JSON.parse(body) : {};
};

const respond = (response: ServerResponse, statusCode: number, body: unknown): void => {
  response.writeHead(statusCode, { 'content-type': 'application/json' });
  response.end(JSON.stringify(body));
};

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? '/', 'http://localhost');
    const pathParts = url.pathname.split('/').filter(Boolean);
    if (request.method === 'POST' && url.pathname === '/api/sales') {
      const result = controller.createSale(await readJson(request) as never);
      respond(response, result.status === 'PARTIALLY_PAID' ? 200 : 201, result);
      return;
    }
    if (request.method === 'GET' && pathParts[0] === 'api' && pathParts[1] === 'customers' && pathParts[3] === 'pending-charges') {
      respond(response, 200, billing.getPendingCharges(pathParts[2]).map((charge) => ({ ...charge, amount: amountFromCents(charge.amountCents) })));
      return;
    }
    if (request.method === 'GET' && pathParts[0] === 'api' && pathParts[1] === 'receipts' && pathParts[2]) {
      const receipt = receipts.get(pathParts[2]);
      if (!receipt) return respond(response, 404, { error: 'Receipt not found' });
      respond(response, 200, receipt);
      return;
    }
    respond(response, 404, { error: 'Route not found' });
  } catch (error) {
    if (error instanceof SyntaxError) return respond(response, 400, { error: 'Request body must be valid JSON' });
    if (error instanceof SaleError) return respond(response, error.statusCode, { error: error.message, code: error.code });
    respond(response, 500, { error: 'Internal server error' });
  }
});

server.listen(Number(process.env.PORT ?? 3000), () => {
  console.log(`Pharmacy POS listening on port ${process.env.PORT ?? 3000}`);
});