# Frontend API Coverage

Last checked: 2026-04-24

This file compares API Gateway routes in `back-end/apps/api-gateway/src/modules` with calls found in `front-end-web/src`.

## Mostly Covered

- Auth: register, login, refresh, logout.
- User basic flow: profile, profile completion, current KYC, KYC upload signatures, submit KYC, update profile.
- Catalog browsing and seller basics: brands, categories, models, offers, offer detail, offer media/documents, offer batch links.
- Shop user flow: create shop, my shops, verification summary, shop documents, category documents.
- Shop admin moderation: pending shops, verification detail, review shop document, review category.
- Distribution basics: networks, nodes, memberships, batches, inventory summary, pricing policies.
- Orders basics: cart, direct cart-item checkout, retail order, wholesale order, my orders, order lookup.
- Order lifecycle: mark paid, complete, cancel, refund.
- Order disputes: buyer opens dispute, gets evidence upload signatures, adds evidence metadata, loads evidence, seller resolves.
- Admin dispute moderation: list open disputes, view detail, assign, update case status, resolve.
- Affiliate basics: create program, join program, list my programs, list my accounts, account summary, account conversions, create code, account codes, account commissions, account payouts, program conversions.
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

- `POST /affiliate/conversions/approve`
- `POST /affiliate/conversions/reject`
- `POST /affiliate/payouts`
- `GET /affiliate/programs/:programId/payouts`
- `POST /affiliate/payouts/status`

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

## Suggested Next UI Priorities

- Payment/order lifecycle polish: chọn phương thức thanh toán, trạng thái COD/chuyển khoản, receipt thực tế.
- Distribution shipments and invitations.
- Affiliate approve/reject conversion và payout management cho owner program.
- Brand authorization for distributor/manufacturer shops.
