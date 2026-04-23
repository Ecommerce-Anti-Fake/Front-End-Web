# Frontend API Coverage

Last checked: 2026-04-23

This file compares API Gateway routes in `back-end/apps/api-gateway/src/modules` with calls found in `front-end-web/src`.

## Mostly Covered

- Auth: register, login, refresh, logout.
- User basic flow: profile, profile completion, current KYC, KYC upload signatures, submit KYC, update profile.
- Catalog browsing and seller basics: brands, categories, models, offers, offer detail, offer media/documents, offer batch links.
- Shop user flow: create shop, my shops, verification summary, shop documents, category documents.
- Shop admin moderation: pending shops, verification detail, review shop document, review category.
- Distribution basics: networks, nodes, memberships, batches, inventory summary, pricing policies.
- Orders basics: cart, retail order, wholesale order, order lookup.
- Affiliate basics: create program, list my programs, list my accounts.
- Admin dashboard basics: dashboard, moderation summary, open disputes list, pending KYC list.

## API Routes Not Yet Used By UI

### Auth

- `GET /auth/admin-check`

### Users / KYC Admin

- `GET /user`
- `GET /user/admin/:id/kyc-detail`
- `POST /user/:id/kyc/review`
- `GET /user/:id`
- `DELETE /user/:id`

### Products

- `GET /products/models/:id`

### Shops / Brand Authorization

- `GET /shops/:id`
- `POST /shops/:shopId/brands/:brandId/authorization/upload-signatures`
- `POST /shops/:shopId/brands/:brandId/authorization`
- `GET /shops/:shopId/brand-authorizations`
- `POST /shops/brand-authorizations/:authorizationId/review`

### Affiliate

- `POST /affiliate/accounts/join`
- `GET /affiliate/accounts/:accountId/summary`
- `GET /affiliate/accounts/:accountId/conversions`
- `POST /affiliate/codes`
- `GET /affiliate/accounts/:accountId/codes`
- `GET /affiliate/accounts/:accountId/commissions`
- `GET /affiliate/accounts/:accountId/payouts`
- `GET /affiliate/programs/:programId/conversions`
- `POST /affiliate/conversions/approve`
- `POST /affiliate/conversions/reject`
- `POST /affiliate/payouts`
- `GET /affiliate/programs/:programId/payouts`
- `POST /affiliate/payouts/status`

### Orders / Payment / Disputes

- `POST /orders/cart/items/:cartItemId/checkout`
- `GET /orders/admin/disputes/:disputeId`
- `POST /orders/admin/disputes/:disputeId/assign`
- `POST /orders/admin/disputes/:disputeId/case`
- `POST /orders/admin/disputes/:disputeId/resolve`
- `POST /orders/:id/mark-paid`
- `POST /orders/:id/complete`
- `POST /orders/:id/cancel`
- `POST /orders/:id/disputes`
- `POST /orders/disputes/:disputeId/evidence/upload-signatures`
- `POST /orders/disputes/:disputeId/evidence`
- `GET /orders/disputes/:disputeId/evidence`
- `POST /orders/disputes/:disputeId/resolve`
- `POST /orders/:id/refund`

### Distribution Advanced Operations

- `POST /distribution/networks/:networkId/nodes`
- `POST /distribution/networks/:networkId/invitations`
- `POST /distribution/nodes/:nodeId/accept-invitation`
- `POST /distribution/nodes/:nodeId/decline-invitation`
- `GET /distribution/my-invitations`
- `POST /distribution/networks/:networkId/nodes/:nodeId/status`
- `GET /distribution/batches/:batchId`
- `POST /distribution/networks/:networkId/shipments`
- `POST /distribution/shipments/:shipmentId/dispatch`
- `GET /distribution/networks/:networkId/shipments`
- `POST /distribution/shipments/:shipmentId/receive`
- `POST /distribution/shipments/:shipmentId/cancel`
- `POST /distribution/batches/:batchId/documents/upload-signatures`
- `POST /distribution/batches/:batchId/documents`
- `GET /distribution/batches/:batchId/documents`

## UI Functions Present But Not Wired To User Flow

- `checkoutCartItem()` exists in `src/lib/cart.ts`, but the cart page currently redirects to the Orders page instead of calling direct cart-item checkout.

## Suggested Next UI Priorities

- Payment/order lifecycle: mark paid, complete, cancel, refund.
- Disputes: buyer opens dispute, uploads evidence, admin resolves.
- Distribution shipments and invitations.
- Affiliate account/codes/commission/payout management.
- Brand authorization for distributor/manufacturer shops.
