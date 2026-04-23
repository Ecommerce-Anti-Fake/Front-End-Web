import { apiRequest } from './api-client';

export type CartItem = {
  id: string;
  offerId: string;
  quantity: number;
  offerTitleSnapshot: string;
  unitPriceSnapshot: number;
  currencySnapshot: string;
  shopNameSnapshot: string;
};

export type Cart = {
  id: string;
  buyerUserId: string;
  cartStatus: string;
  items: CartItem[];
};

type CartResponse = {
  id?: string;
  buyerUserId?: string;
  cartStatus?: string;
  items?: CartResponseItem[];
};

type CartResponseItem = {
  id?: string;
  offerId?: string;
  quantity?: number | string;
  offerTitleSnapshot?: string;
  unitPriceSnapshot?: number | string;
  currencySnapshot?: string;
  shopNameSnapshot?: string;
};

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeCartItem(item: CartResponseItem | undefined): CartItem {
  return {
    id: String(item?.id || ''),
    offerId: String(item?.offerId || ''),
    quantity: Math.max(1, toNumber(item?.quantity)),
    offerTitleSnapshot: String(item?.offerTitleSnapshot || 'Untitled offer'),
    unitPriceSnapshot: toNumber(item?.unitPriceSnapshot),
    currencySnapshot: String(item?.currencySnapshot || 'VND'),
    shopNameSnapshot: String(item?.shopNameSnapshot || '-'),
  };
}

function normalizeCart(payload: CartResponse | null): Cart {
  return {
    id: String(payload?.id || ''),
    buyerUserId: String(payload?.buyerUserId || ''),
    cartStatus: String(payload?.cartStatus || 'ACTIVE'),
    items: Array.isArray(payload?.items) ? payload.items.map(normalizeCartItem) : [],
  };
}

export async function getActiveCart() {
  const response = await apiRequest<CartResponse>('/orders/cart');
  return normalizeCart(response);
}

export async function addToCart(input: { offerId: string; quantity: number }) {
  const response = await apiRequest<CartResponse>('/orders/cart/items', {
    method: 'POST',
    body: {
      offerId: input.offerId,
      quantity: input.quantity,
    },
  });

  return normalizeCart(response);
}

export async function updateCartItemQuantity(cartItemId: string, quantity: number) {
  const response = await apiRequest<CartResponse>(`/orders/cart/items/${cartItemId}`, {
    method: 'PATCH',
    body: {
      quantity,
    },
  });

  return normalizeCart(response);
}

export async function removeCartItem(cartItemId: string) {
  const response = await apiRequest<CartResponse>(`/orders/cart/items/${cartItemId}`, {
    method: 'DELETE',
  });

  return normalizeCart(response);
}

export async function checkoutCartItem(cartItemId: string, affiliateCode?: string) {
  return apiRequest(`/orders/cart/items/${cartItemId}/checkout`, {
    method: 'POST',
    body: affiliateCode
      ? {
          affiliateCode,
        }
      : undefined,
  });
}
