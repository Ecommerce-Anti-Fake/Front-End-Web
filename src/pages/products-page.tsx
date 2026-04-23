import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ApiResult } from '../components/api-result';
import { PageSection } from '../components/page-section';
import { addToCart } from '../lib/cart';
import { useApiQuery } from '../hooks/use-api-query';
import { apiRequest } from '../lib/api-client';
import { useAuth } from '../modules/auth/auth-context';

const ACTIVE_SHOP_KEY = 'eaf-active-shop-id';
const ACTIVE_OFFER_KEY = 'eaf-active-offer-id';
const ACTIVE_MODEL_KEY = 'eaf-active-model-id';
const DEFAULT_SORT = 'featured';

const initialOfferForm = {
  shopId: '',
  categoryId: '',
  productModelId: '',
  title: '',
  description: '',
  price: 0,
  availableQuantity: 1,
  salesMode: 'RETAIL',
};

type CategoryRecord = {
  id?: string;
  name?: string;
  riskTier?: string;
  parentId?: string | null;
  [key: string]: unknown;
};

type ProductModelRecord = {
  id?: string;
  modelName?: string;
  name?: string;
  brandName?: string;
  categoryId?: string;
  categoryName?: string;
  [key: string]: unknown;
};

type OfferRecord = {
  id?: string;
  title?: string;
  description?: string;
  price?: number | string;
  currency?: string;
  availableQuantity?: number | string;
  salesMode?: string;
  minWholesaleQty?: number | null;
  offerStatus?: string;
  verificationLevel?: string;
  shopId?: string;
  shopName?: string;
  productModelId?: string;
  productModelName?: string;
  categoryId?: string;
  categoryName?: string;
  createdAt?: string;
  [key: string]: unknown;
};

type BatchRecord = {
  id?: string;
  batchNumber?: string;
  productModelId?: string;
  quantity?: number | string;
  allocatedQuantity?: number | string;
  [key: string]: unknown;
};

type OfferMediaRecord = {
  id?: string;
  fileUrl?: string;
  mediaType?: string;
  assetType?: string;
  mimeType?: string | null;
  [key: string]: unknown;
};

type OfferDocumentRecord = {
  id?: string;
  docType?: string;
  fileUrl?: string;
  issuerName?: string | null;
  reviewStatus?: string;
  [key: string]: unknown;
};

type ShopVerificationSummaryRecord = {
  shopStatus?: string;
  canOperate?: boolean;
  missingRequirements?: string[];
  categories?: Array<{
    categoryId?: string;
    categoryName?: string;
    riskTier?: string;
    requiredVerification?: boolean;
    registrationStatus?: string;
  }>;
  [key: string]: unknown;
};

const initialMediaSignatureForm = {
  assetType: 'IMAGE',
};

const initialMediaMetadataForm = {
  assetType: 'IMAGE',
  mimeType: 'image/jpeg',
  fileUrl: '',
  publicId: '',
  mediaType: 'gallery',
  phash: '',
};

const initialDocumentSignatureForm = {
  docType: 'INGREDIENT_CERTIFICATE',
};

const initialDocumentMetadataForm = {
  docType: 'INGREDIENT_CERTIFICATE',
  mimeType: 'application/pdf',
  fileUrl: '',
  publicId: '',
  issuerName: '',
  documentNumber: '',
};

function normalizeList<T>(data: unknown, keys: string[]): T[] {
  if (Array.isArray(data)) {
    return data as T[];
  }

  if (data && typeof data === 'object') {
    for (const key of keys) {
      const value = (data as Record<string, unknown>)[key];

      if (Array.isArray(value)) {
        return value as T[];
      }
    }
  }

  return [];
}

function toPriceNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatSellerActionError(error: unknown) {
  const fallback = error instanceof Error ? error.message : 'Seller action failed';
  const message = fallback.toLowerCase();

  if (message.includes('shop must complete kyc approval')) {
    return 'Shop chua active. Ban can hoan tat KYC va verification shop trong trang Shops truoc khi tao offer.';
  }

  if (message.includes('shop category must be approved')) {
    return 'Category cua shop chua duoc duyet. Vao trang Shops de nop ho so category hoac cho admin approve.';
  }

  if (message.includes('only active shops')) {
    return 'Shop chua active, nen thao tac seller nay dang bi chan. Kiem tra verification trong trang Shops.';
  }

  return fallback;
}

export function ProductsPage() {
  const { session } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const categories = useApiQuery('/products/categories');
  const models = useApiQuery('/products/models');
  const offers = useApiQuery('/products/offers');
  const activeShopId = window.localStorage.getItem(ACTIVE_SHOP_KEY) || '';
  const batchQuery = activeShopId ? `/distribution/batches?shopId=${encodeURIComponent(activeShopId)}` : '/distribution/batches';
  const batches = useApiQuery(batchQuery);
  const activeShopVerification = useApiQuery<ShopVerificationSummaryRecord>(
    activeShopId ? `/shops/${encodeURIComponent(activeShopId)}/verification-summary` : '',
    Boolean(activeShopId),
  );
  const [mode, setMode] = useState<'buyer' | 'seller'>(() =>
    searchParams.get('mode') === 'seller' ? 'seller' : 'buyer',
  );
  const [search, setSearch] = useState(() => searchParams.get('q') || '');
  const [selectedCategoryId, setSelectedCategoryId] = useState(() => searchParams.get('categoryId') || '');
  const [sortBy, setSortBy] = useState(() => searchParams.get('sort') || DEFAULT_SORT);
  const [minPrice, setMinPrice] = useState(() => searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(() => searchParams.get('maxPrice') || '');
  const [form, setForm] = useState(() => ({
    ...initialOfferForm,
    shopId: activeShopId,
  }));
  const [message, setMessage] = useState<string | null>(null);
  const [activeOfferId, setActiveOfferId] = useState(() => window.localStorage.getItem(ACTIVE_OFFER_KEY) || '');
  const [allocationItems, setAllocationItems] = useState<Array<{ batchId: string; allocatedQuantity: number }>>([]);
  const [allocationMessage, setAllocationMessage] = useState<string | null>(null);
  const [allocationLoading, setAllocationLoading] = useState(false);
  const [mediaSignatureForm, setMediaSignatureForm] = useState(initialMediaSignatureForm);
  const [mediaMetadataForm, setMediaMetadataForm] = useState(initialMediaMetadataForm);
  const [documentSignatureForm, setDocumentSignatureForm] = useState(initialDocumentSignatureForm);
  const [documentMetadataForm, setDocumentMetadataForm] = useState(initialDocumentMetadataForm);
  const [mediaSignatureResult, setMediaSignatureResult] = useState<unknown>(null);
  const [documentSignatureResult, setDocumentSignatureResult] = useState<unknown>(null);
  const [mediaMessage, setMediaMessage] = useState<string | null>(null);
  const [documentMessage, setDocumentMessage] = useState<string | null>(null);

  const categoryList = useMemo(
    () => normalizeList<CategoryRecord>(categories.data, ['items', 'data', 'categories']),
    [categories.data],
  );
  const modelList = useMemo(
    () => normalizeList<ProductModelRecord>(models.data, ['items', 'data', 'models']),
    [models.data],
  );
  const offerList = useMemo(
    () => normalizeList<OfferRecord>(offers.data, ['items', 'data', 'offers']),
    [offers.data],
  );
  const batchList = useMemo(
    () => normalizeList<BatchRecord>(batches.data, ['items', 'data', 'batches']),
    [batches.data],
  );
  const activeOffer = useMemo(
    () => offerList.find((offer) => String(offer.id || '') === activeOfferId) ?? null,
    [offerList, activeOfferId],
  );
  const activeOfferDetail = useApiQuery(activeOfferId ? `/products/offers/${activeOfferId}` : '', Boolean(activeOfferId));
  const activeOfferBatchLinks = useApiQuery(
    activeOfferId ? `/products/offers/${activeOfferId}/batch-links` : '',
    Boolean(activeOfferId),
  );
  const activeOfferMedia = useApiQuery(
    activeOfferId ? `/products/offers/${activeOfferId}/media` : '',
    Boolean(activeOfferId),
  );
  const activeOfferDocuments = useApiQuery(
    activeOfferId ? `/products/offers/${activeOfferId}/documents` : '',
    Boolean(activeOfferId),
  );
  const activeOfferMediaList = useMemo(
    () => normalizeList<OfferMediaRecord>(activeOfferMedia.data, ['items', 'data', 'media']),
    [activeOfferMedia.data],
  );
  const activeOfferDocumentList = useMemo(
    () => normalizeList<OfferDocumentRecord>(activeOfferDocuments.data, ['items', 'data', 'documents']),
    [activeOfferDocuments.data],
  );

  const allocatableBatches = useMemo(() => {
    if (!activeOffer?.productModelId) {
      return [];
    }

    return batchList.filter((batch) => batch.productModelId === activeOffer.productModelId);
  }, [batchList, activeOffer?.productModelId]);

  const filteredOffers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const minPriceValue = minPrice.trim() ? Number(minPrice) : null;
    const maxPriceValue = maxPrice.trim() ? Number(maxPrice) : null;

    const nextOffers = offerList.filter((offer) => {
      if (selectedCategoryId && String(offer.categoryId || '') !== selectedCategoryId) {
        return false;
      }

      const offerPrice = toPriceNumber(offer.price);
      if (minPriceValue !== null && Number.isFinite(minPriceValue) && offerPrice < minPriceValue) {
        return false;
      }

      if (maxPriceValue !== null && Number.isFinite(maxPriceValue) && offerPrice > maxPriceValue) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = [
        offer.title,
        offer.description,
        offer.shopName,
        offer.productModelName,
        offer.categoryName,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });

    return [...nextOffers].sort((left, right) => {
      if (sortBy === 'price-asc') {
        return toPriceNumber(left.price) - toPriceNumber(right.price);
      }

      if (sortBy === 'price-desc') {
        return toPriceNumber(right.price) - toPriceNumber(left.price);
      }

      if (sortBy === 'newest') {
        return new Date(String(right.createdAt || 0)).getTime() - new Date(String(left.createdAt || 0)).getTime();
      }

      if (sortBy === 'quantity-desc') {
        return toPriceNumber(right.availableQuantity) - toPriceNumber(left.availableQuantity);
      }

      return 0;
    });
  }, [maxPrice, minPrice, offerList, search, selectedCategoryId, sortBy]);
  const featuredOffers = useMemo(() => filteredOffers.slice(0, 3), [filteredOffers]);
  const productStats = useMemo(
    () => ({
      totalOffers: filteredOffers.length,
      totalCategories: categoryList.length,
      retailReady: filteredOffers.filter((offer) => {
        const modeValue = String(offer.salesMode || '').toUpperCase();
        return modeValue === 'RETAIL' || modeValue === 'BOTH';
      }).length,
    }),
    [categoryList.length, filteredOffers],
  );
  const heroOffer = activeOffer ?? featuredOffers[0] ?? null;
  const heroImage = activeOfferMediaList[0]?.fileUrl || null;
  const sellerMissingRequirements = Array.isArray(activeShopVerification.data?.missingRequirements)
    ? activeShopVerification.data.missingRequirements
    : [];
  const sellerBlockedCategories = Array.isArray(activeShopVerification.data?.categories)
    ? activeShopVerification.data.categories.filter(
        (category) => category.requiredVerification && category.registrationStatus !== 'approved',
      )
    : [];

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      shopId: prev.shopId || activeShopId,
    }));
  }, [activeShopId]);

  useEffect(() => {
    const modeParam = searchParams.get('mode') === 'seller' ? 'seller' : 'buyer';
    const categoryParam = searchParams.get('categoryId') || '';
    const queryParam = searchParams.get('q') || '';
    const sortParam = searchParams.get('sort') || DEFAULT_SORT;
    const minPriceParam = searchParams.get('minPrice') || '';
    const maxPriceParam = searchParams.get('maxPrice') || '';

    setMode(modeParam);
    setSelectedCategoryId(categoryParam);
    setSearch(queryParam);
    setSortBy(sortParam);
    setMinPrice(minPriceParam);
    setMaxPrice(maxPriceParam);
  }, [searchParams]);

  useEffect(() => {
    if (activeOfferId) {
      window.localStorage.setItem(ACTIVE_OFFER_KEY, activeOfferId);
      return;
    }

    window.localStorage.removeItem(ACTIVE_OFFER_KEY);
  }, [activeOfferId]);

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams);

    if (mode !== 'buyer') {
      nextParams.set('mode', mode);
    } else {
      nextParams.delete('mode');
    }

    if (selectedCategoryId) {
      nextParams.set('categoryId', selectedCategoryId);
    } else {
      nextParams.delete('categoryId');
    }

    if (search.trim()) {
      nextParams.set('q', search.trim());
    } else {
      nextParams.delete('q');
    }

    if (sortBy !== DEFAULT_SORT) {
      nextParams.set('sort', sortBy);
    } else {
      nextParams.delete('sort');
    }

    if (minPrice.trim()) {
      nextParams.set('minPrice', minPrice.trim());
    } else {
      nextParams.delete('minPrice');
    }

    if (maxPrice.trim()) {
      nextParams.set('maxPrice', maxPrice.trim());
    } else {
      nextParams.delete('maxPrice');
    }

    const current = searchParams.toString();
    const next = nextParams.toString();
    if (current !== next) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [maxPrice, minPrice, mode, search, searchParams, selectedCategoryId, setSearchParams, sortBy]);

  async function handleCreateOffer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      await apiRequest('/products/offers', {
        method: 'POST',
        accessToken: session?.accessToken,
        body: form,
      });
      setMessage('Tao offer thanh cong.');
      setForm({
        ...initialOfferForm,
        shopId: window.localStorage.getItem(ACTIVE_SHOP_KEY) || '',
      });
      await offers.reload();
      setMode('buyer');
    } catch (error) {
      setMessage(formatSellerActionError(error));
    }
  }

  function useModelForOffer(model: ProductModelRecord) {
    if (model.id) {
      window.localStorage.setItem(ACTIVE_MODEL_KEY, String(model.id));
    }

    setForm((prev) => ({
      ...prev,
      productModelId: String(model.id || ''),
      categoryId: String(model.categoryId || ''),
    }));
  }

  function addBatchToAllocation(batchId: string) {
    setAllocationItems((prev) => {
      if (prev.some((item) => item.batchId === batchId)) {
        return prev;
      }

      return [...prev, { batchId, allocatedQuantity: 1 }];
    });
  }

  async function submitBatchAllocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeOfferId || !allocationItems.length) {
      setAllocationMessage('Can chon active offer va it nhat mot batch.');
      return;
    }

    try {
      setAllocationLoading(true);
      setAllocationMessage(null);
      await apiRequest(`/products/offers/${activeOfferId}/batch-links`, {
        method: 'POST',
        accessToken: session?.accessToken,
        body: {
          items: allocationItems,
        },
      });
      setAllocationMessage('Allocate batch thanh cong.');
      setAllocationItems([]);
      await activeOfferBatchLinks.reload();
      await offers.reload();
    } catch (error) {
      setAllocationMessage(formatSellerActionError(error));
    } finally {
      setAllocationLoading(false);
    }
  }

  async function requestMediaUploadSignature(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeOfferId) {
      setMediaMessage('Can chon active offer truoc.');
      return;
    }

    try {
      const response = await apiRequest(`/products/offers/${activeOfferId}/media/upload-signatures`, {
        method: 'POST',
        accessToken: session?.accessToken,
        body: {
          items: [{ assetType: mediaSignatureForm.assetType }],
        },
      });
      setMediaSignatureResult(response);
      setMediaMessage('Lay media upload signature thanh cong.');
    } catch (error) {
      setMediaMessage(error instanceof Error ? error.message : 'Get media signatures failed');
    }
  }

  async function saveOfferMediaMetadata(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeOfferId) {
      setMediaMessage('Can chon active offer truoc.');
      return;
    }

    try {
      await apiRequest(`/products/offers/${activeOfferId}/media`, {
        method: 'POST',
        accessToken: session?.accessToken,
        body: {
          items: [
            {
              assetType: mediaMetadataForm.assetType,
              mimeType: mediaMetadataForm.mimeType,
              fileUrl: mediaMetadataForm.fileUrl,
              publicId: mediaMetadataForm.publicId,
              mediaType: mediaMetadataForm.mediaType || undefined,
              phash: mediaMetadataForm.phash || undefined,
            },
          ],
        },
      });
      setMediaMessage('Luu media metadata thanh cong.');
      setMediaMetadataForm(initialMediaMetadataForm);
      await activeOfferMedia.reload();
    } catch (error) {
      setMediaMessage(error instanceof Error ? error.message : 'Save offer media failed');
    }
  }

  async function requestDocumentUploadSignature(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeOfferId) {
      setDocumentMessage('Can chon active offer truoc.');
      return;
    }

    try {
      const response = await apiRequest(`/products/offers/${activeOfferId}/documents/upload-signatures`, {
        method: 'POST',
        accessToken: session?.accessToken,
        body: {
          items: [{ docType: documentSignatureForm.docType }],
        },
      });
      setDocumentSignatureResult(response);
      setDocumentMessage('Lay document upload signature thanh cong.');
    } catch (error) {
      setDocumentMessage(error instanceof Error ? error.message : 'Get document signatures failed');
    }
  }

  async function saveOfferDocumentMetadata(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeOfferId) {
      setDocumentMessage('Can chon active offer truoc.');
      return;
    }

    try {
      await apiRequest(`/products/offers/${activeOfferId}/documents`, {
        method: 'POST',
        accessToken: session?.accessToken,
        body: {
          items: [
            {
              docType: documentMetadataForm.docType,
              mimeType: documentMetadataForm.mimeType,
              fileUrl: documentMetadataForm.fileUrl,
              publicId: documentMetadataForm.publicId,
              issuerName: documentMetadataForm.issuerName || undefined,
              documentNumber: documentMetadataForm.documentNumber || undefined,
            },
          ],
        },
      });
      setDocumentMessage('Luu document metadata thanh cong.');
      setDocumentMetadataForm(initialDocumentMetadataForm);
      await activeOfferDocuments.reload();
    } catch (error) {
      setDocumentMessage(error instanceof Error ? error.message : 'Save offer document failed');
    }
  }

  function handleAddOfferToCart(offer: OfferRecord) {
    if (!offer.id) {
      return;
    }

    void addToCart({
      offerId: String(offer.id),
      quantity: 1,
    });
  }

  function resetBuyerFilters() {
    setSearch('');
    setSelectedCategoryId('');
    setSortBy(DEFAULT_SORT);
    setMinPrice('');
    setMaxPrice('');
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <p className="eyebrow">Catalog</p>
        <h1>Offer center</h1>
        <p className="muted">
          Trang nay gom 2 huong ro rang: buyer xem offer va seller quan ly offer. Khong tron 2 vai tro vao nhau nua.
        </p>
      </header>

      <div className="mode-switch">
        <button
          className={mode === 'buyer' ? 'pill active' : 'pill'}
          type="button"
          onClick={() => setMode('buyer')}
        >
          Xem offer
        </button>
        <button
          className={mode === 'seller' ? 'pill active' : 'pill'}
          type="button"
          onClick={() => setMode('seller')}
        >
          Quan ly seller
        </button>
      </div>

      <PageSection title="Ngu canh dang thao tac">
        <div className="context-grid">
          <div className="context-card">
            <p className="eyebrow">Active shop</p>
            <strong>{activeShopId || 'Chua chon shop'}</strong>
            <p className="muted">Dung cho seller flow.</p>
          </div>
          <div className="context-card">
            <p className="eyebrow">Active offer</p>
            <strong>{activeOffer?.title || activeOfferId || 'Chua chon offer'}</strong>
            <p className="muted">Offer nay se duoc prefll cho Orders.</p>
          </div>
        </div>
        {mode === 'seller' && activeShopId ? (
          activeShopVerification.loading ? (
            <div className="empty-state">Dang tai trang thai verification cua shop...</div>
          ) : activeShopVerification.data?.canOperate ? (
            <div className="empty-state">Shop dang active, seller flow co the tiep tuc.</div>
          ) : (
            <div className="empty-state error">
              Shop nay chua du dieu kien seller flow.
              {sellerMissingRequirements.length ? ` Missing: ${sellerMissingRequirements.join(', ')}.` : ''}
              {sellerBlockedCategories.length
                ? ` Category dang bi chan: ${sellerBlockedCategories.map((category) => category.categoryName || category.categoryId).join(', ')}.`
                : ''}
              {' '}Vao trang <Link className="link-inline" to="/shops">Shops</Link> de xu ly tiep.
            </div>
          )
        ) : null}
      </PageSection>

      <PageSection title="Tim va loc offer" description="Day la man hinh buyer-first de xem offer dang co tren san.">
        <div className="storefront-hero">
          <div className="storefront-copy">
            <p className="eyebrow">Buyer storefront</p>
            <h2>{heroOffer?.title || 'Chon mot offer de bat dau'}</h2>
            <p className="muted">
              {heroOffer?.description ||
                'Loc offer theo category va ten, sau do chon offer de xem media, tai lieu va dua sang luong dat hang.'}
            </p>
            <div className="tag-row">
              <span className="tag">Offers: {productStats.totalOffers}</span>
              <span className="tag">Categories: {productStats.totalCategories}</span>
              <span className="tag">Retail ready: {productStats.retailReady}</span>
            </div>
          </div>
          <div className="storefront-visual">
            {heroImage ? (
              <img src={heroImage} alt={heroOffer?.title || 'Offer media'} className="storefront-image" />
            ) : (
              <div className="storefront-placeholder">
                <strong>{heroOffer?.productModelName || 'Offer spotlight'}</strong>
                <p className="muted">
                  {heroOffer?.shopName || 'Chua co media, van co the xem chi tiet va dat hang theo offer nay.'}
                </p>
              </div>
            )}
          </div>
        </div>

        <form className="panel-form two-columns">
          <label>
            <span>Tim kiem</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Ten offer, shop, model..."
            />
          </label>
          <label>
            <span>Category</span>
            <select value={selectedCategoryId} onChange={(event) => setSelectedCategoryId(event.target.value)}>
              <option value="">Tat ca category</option>
              {categoryList.map((category) => (
                <option key={String(category.id)} value={String(category.id || '')}>
                  {category.name || category.id}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Sort</span>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="featured">Featured</option>
              <option value="newest">Moi nhat</option>
              <option value="price-asc">Gia thap den cao</option>
              <option value="price-desc">Gia cao den thap</option>
              <option value="quantity-desc">So luong con lai nhieu</option>
            </select>
          </label>
          <label>
            <span>Min price</span>
            <input
              type="number"
              min={0}
              value={minPrice}
              onChange={(event) => setMinPrice(event.target.value)}
              placeholder="0"
            />
          </label>
          <label>
            <span>Max price</span>
            <input
              type="number"
              min={0}
              value={maxPrice}
              onChange={(event) => setMaxPrice(event.target.value)}
              placeholder="Khong gioi han"
            />
          </label>
          <div className="filter-actions">
            <button className="secondary-button" type="button" onClick={resetBuyerFilters}>
              Xoa filter
            </button>
          </div>
        </form>

        {featuredOffers.length ? (
          <div className="featured-offers-grid">
            {featuredOffers.map((offer) => (
              <button
                key={String(offer.id)}
                className="featured-offer-card"
                type="button"
                onClick={() => setActiveOfferId(String(offer.id || ''))}
              >
                <span className="eyebrow">{offer.categoryName || offer.categoryId || 'Category'}</span>
                <strong>{offer.title || 'Untitled offer'}</strong>
                <span className="muted">
                  {offer.shopName || offer.shopId || '-'} | {String(offer.price ?? '-')} {offer.currency || 'VND'}
                </span>
              </button>
            ))}
          </div>
        ) : null}

        {offers.loading ? (
          <div className="empty-state">Dang tai offers...</div>
        ) : offers.error ? (
          <div className="empty-state error">{offers.error}</div>
        ) : filteredOffers.length ? (
          <div className="storefront-grid">
            {filteredOffers.map((offer) => {
              const isActive = String(offer.id || '') === activeOfferId;

              return (
                <article key={String(offer.id)} className={isActive ? 'storefront-card active' : 'storefront-card'}>
                  <div className="entity-card-header">
                    <div>
                      <span className="eyebrow">{offer.categoryName || offer.categoryId || 'Category'}</span>
                      <h3>{offer.title || 'Untitled offer'}</h3>
                      <p className="muted">
                        {offer.shopName || offer.shopId || '-'} | {offer.productModelName || offer.productModelId || '-'}
                      </p>
                    </div>
                    {isActive ? <span className="tag highlight">Active</span> : null}
                  </div>
                  <p className="storefront-description">{offer.description || 'Khong co mo ta'}</p>
                  <div className="storefront-price">
                    <strong>
                      {String(offer.price ?? '-')} {offer.currency || 'VND'}
                    </strong>
                    <span className="muted">So luong con lai {String(offer.availableQuantity ?? '-')}</span>
                  </div>
                  <div className="tag-row">
                    <span className="tag">Mode: {String(offer.salesMode ?? '-')}</span>
                    <span className="tag">Status: {String(offer.offerStatus ?? '-')}</span>
                    <span className="tag">Verification: {String(offer.verificationLevel ?? '-')}</span>
                    {offer.minWholesaleQty ? (
                      <span className="tag">Min wholesale: {String(offer.minWholesaleQty)}</span>
                    ) : null}
                  </div>
                  <div className="storefront-card-actions">
                    <button className="secondary-button" type="button" onClick={() => setActiveOfferId(String(offer.id || ''))}>
                      Chon offer
                    </button>
                    <button className="secondary-button" type="button" onClick={() => handleAddOfferToCart(offer)}>
                      Them vao gio
                    </button>
                    <Link className="primary-button link-button" to={`/products/${String(offer.id || '')}`}>
                      Xem chi tiet
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">Khong tim thay offer phu hop.</div>
        )}
      </PageSection>

      <PageSection title="Chi tiet offer dang chon">
        {!activeOfferId ? (
          <div className="empty-state">Chon mot offer o tren de xem chi tiet.</div>
        ) : (
          <>
            {activeOfferDetail.loading ? (
              <div className="empty-state">Dang tai chi tiet offer...</div>
            ) : activeOfferDetail.error ? (
              <div className="empty-state error">{activeOfferDetail.error}</div>
            ) : (
              <div className="offer-showcase">
                <div className="offer-gallery-panel">
                  {activeOfferMediaList.length ? (
                    <div className="offer-gallery-grid">
                      {activeOfferMediaList.map((media) => (
                        <article key={String(media.id || media.fileUrl)} className="offer-gallery-item">
                          {media.assetType === 'IMAGE' && media.fileUrl ? (
                            <img src={media.fileUrl} alt={activeOffer?.title || 'Offer media'} className="offer-media-image" />
                          ) : (
                            <div className="storefront-placeholder small">
                              <strong>{media.assetType || 'MEDIA'}</strong>
                              <p className="muted">{media.mimeType || media.mediaType || '-'}</p>
                            </div>
                          )}
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="storefront-placeholder">
                      <strong>{activeOffer?.productModelName || 'Offer media'}</strong>
                      <p className="muted">Offer nay chua co media duoc luu.</p>
                    </div>
                  )}
                </div>
                <div className="offer-summary-panel">
                  <span className="eyebrow">{activeOffer?.categoryName || activeOffer?.categoryId || 'Category'}</span>
                  <h2>{activeOffer?.title || activeOfferId}</h2>
                  <p className="muted">{activeOffer?.description || 'Khong co mo ta chi tiet.'}</p>
                  <div className="offer-price-block">
                    <strong>
                      {String(activeOffer?.price ?? '-')} {activeOffer?.currency || 'VND'}
                    </strong>
                    <span className="muted">Ban boi {activeOffer?.shopName || activeOffer?.shopId || '-'}</span>
                  </div>
                  <div className="tag-row">
                    <span className="tag">Mode: {String(activeOffer?.salesMode ?? '-')}</span>
                    <span className="tag">Qty: {String(activeOffer?.availableQuantity ?? '-')}</span>
                    <span className="tag">Model: {String(activeOffer?.productModelName || activeOffer?.productModelId || '-')}</span>
                    <span className="tag">Status: {String(activeOffer?.offerStatus ?? '-')}</span>
                  </div>
                  <div className="offer-actions">
                    <button className="primary-button" type="button">
                      Offer dang duoc chon
                    </button>
                    <Link className="secondary-button link-button" to={`/products/${activeOfferId}`}>
                      Mo trang chi tiet
                    </Link>
                  </div>
                </div>
              </div>
            )}
            <div className="context-grid">
              <div className="context-card">
                <p className="eyebrow">Media</p>
                <strong>{activeOfferMediaList.length}</strong>
                <p className="muted">Anh/video cua offer.</p>
              </div>
              <div className="context-card">
                <p className="eyebrow">Documents</p>
                <strong>{activeOfferDocumentList.length}</strong>
                <p className="muted">Tai lieu chung minh cua offer.</p>
              </div>
            </div>
            <div className="evidence-grid">
              <div className="evidence-panel">
                <div className="section-header compact">
                  <div>
                    <h2>Media cua offer</h2>
                    <p className="muted">Gallery nhanh de buyer quet hinh anh.</p>
                  </div>
                </div>
                {activeOfferMedia.loading ? (
                  <div className="empty-state">Dang tai media...</div>
                ) : activeOfferMedia.error ? (
                  <div className="empty-state error">{activeOfferMedia.error}</div>
                ) : activeOfferMediaList.length ? (
                  <div className="evidence-list">
                    {activeOfferMediaList.map((media) => (
                      <div key={String(media.id || media.fileUrl)} className="evidence-item">
                        <strong>{media.assetType || 'MEDIA'}</strong>
                        <span className="muted">{media.mediaType || media.mimeType || '-'}</span>
                        {media.fileUrl ? (
                          <a className="secondary-button link-button" href={media.fileUrl} target="_blank" rel="noreferrer">
                            Mo file
                          </a>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">Chua co media.</div>
                )}
              </div>

              <div className="evidence-panel">
                <div className="section-header compact">
                  <div>
                    <h2>Tai lieu xac thuc</h2>
                    <p className="muted">Buyer co the mo file va xem nguon cap.</p>
                  </div>
                </div>
                {activeOfferDocuments.loading ? (
                  <div className="empty-state">Dang tai documents...</div>
                ) : activeOfferDocuments.error ? (
                  <div className="empty-state error">{activeOfferDocuments.error}</div>
                ) : activeOfferDocumentList.length ? (
                  <div className="evidence-list">
                    {activeOfferDocumentList.map((document) => (
                      <div key={String(document.id || document.fileUrl)} className="evidence-item">
                        <strong>{document.docType || 'DOCUMENT'}</strong>
                        <span className="muted">
                          {document.issuerName || 'Khong ro issuer'} | review {document.reviewStatus || '-'}
                        </span>
                        {document.fileUrl ? (
                          <a className="secondary-button link-button" href={document.fileUrl} target="_blank" rel="noreferrer">
                            Mo tai lieu
                          </a>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">Chua co tai lieu.</div>
                )}
              </div>
            </div>
          </>
        )}
      </PageSection>

      {mode === 'seller' ? (
        <>
          <PageSection title="Danh sach category">
            {categories.loading ? (
              <div className="empty-state">Dang tai categories...</div>
            ) : categories.error ? (
              <div className="empty-state error">{categories.error}</div>
            ) : categoryList.length ? (
              <div className="compact-list">
                {categoryList.slice(0, 10).map((category) => (
                  <div key={String(category.id)} className="compact-item">
                    <strong>{category.name || 'Unnamed category'}</strong>
                    <span className="muted">
                      Risk {category.riskTier || '-'} | parent {String(category.parentId || '-')}
                    </span>
                    <span className="tag">ID: {String(category.id || '-')}</span>
                  </div>
                ))}
              </div>
            ) : (
              <ApiResult title="Categories" loading={categories.loading} error={categories.error} data={categories.data} />
            )}
          </PageSection>

          <PageSection title="Danh sach product models">
            {models.loading ? (
              <div className="empty-state">Dang tai product models...</div>
            ) : models.error ? (
              <div className="empty-state error">{models.error}</div>
            ) : modelList.length ? (
              <div className="compact-list">
                {modelList.slice(0, 8).map((model) => (
                  <div key={String(model.id)} className="compact-item interactive">
                    <strong>{model.modelName || model.name || 'Unnamed model'}</strong>
                    <span className="muted">
                      {model.brandName || 'Unknown brand'} | {model.categoryName || model.categoryId || '-'}
                    </span>
                    <div className="tag-row">
                      <span className="tag">ID: {String(model.id || '-')}</span>
                      <button className="secondary-button" type="button" onClick={() => useModelForOffer(model)}>
                        Dung model nay
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <ApiResult title="Product models" loading={models.loading} error={models.error} data={models.data} />
            )}
          </PageSection>

          <PageSection title="Tao offer">
            <form className="panel-form two-columns" onSubmit={handleCreateOffer}>
              <label>
                <span>Shop id</span>
                <input
                  value={form.shopId}
                  onChange={(event) => setForm((prev) => ({ ...prev, shopId: event.target.value }))}
                  required
                />
              </label>
              <label>
                <span>Category</span>
                <select
                  value={form.categoryId}
                  onChange={(event) => setForm((prev) => ({ ...prev, categoryId: event.target.value }))}
                  required
                >
                  <option value="">Chon category</option>
                  {categoryList.map((category) => (
                    <option key={String(category.id)} value={String(category.id || '')}>
                      {category.name || category.id}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Product model id</span>
                <input
                  value={form.productModelId}
                  onChange={(event) => setForm((prev) => ({ ...prev, productModelId: event.target.value }))}
                  required
                />
              </label>
              <label>
                <span>Sales mode</span>
                <select
                  value={form.salesMode}
                  onChange={(event) => setForm((prev) => ({ ...prev, salesMode: event.target.value }))}
                >
                  <option value="RETAIL">RETAIL</option>
                  <option value="WHOLESALE">WHOLESALE</option>
                  <option value="BOTH">BOTH</option>
                </select>
              </label>
              <label className="full-width">
                <span>Title</span>
                <input
                  value={form.title}
                  onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                  required
                />
              </label>
              <label className="full-width">
                <span>Description</span>
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                />
              </label>
              <label>
                <span>Price</span>
                <input
                  type="number"
                  min={0}
                  value={form.price}
                  onChange={(event) => setForm((prev) => ({ ...prev, price: Number(event.target.value) }))}
                />
              </label>
              <label>
                <span>Available quantity</span>
                <input
                  type="number"
                  min={1}
                  value={form.availableQuantity}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, availableQuantity: Number(event.target.value) }))
                  }
                />
              </label>
              {message ? <div className="empty-state full-width">{message}</div> : null}
              <button className="primary-button full-width" type="submit">
                Tao offer
              </button>
            </form>
          </PageSection>

          <PageSection
            title="Allocate batch vao active offer"
            description="Chon active offer o tren, sau do them cac batch cung product model vao allocation."
          >
            {!activeOfferId ? (
              <div className="empty-state">Chua co active offer.</div>
            ) : (
              <>
                <div className="context-grid">
                  <div className="context-card">
                    <p className="eyebrow">Active offer</p>
                    <strong>{activeOffer?.title || activeOfferId}</strong>
                    <p className="muted">Model: {activeOffer?.productModelId || '-'}</p>
                  </div>
                  <div className="context-card">
                    <p className="eyebrow">Allocatable batches</p>
                    <strong>{allocatableBatches.length}</strong>
                    <p className="muted">Loc theo active shop va model cua offer.</p>
                  </div>
                </div>

                {allocatableBatches.length ? (
                  <div className="entity-grid">
                    {allocatableBatches.map((batch) => (
                      <article key={String(batch.id)} className="entity-card">
                        <div className="entity-card-header">
                          <div>
                            <h3>{batch.batchNumber || 'Unnamed batch'}</h3>
                            <p className="muted">Model {batch.productModelId || '-'}</p>
                          </div>
                        </div>
                        <div className="tag-row">
                          <span className="tag">ID: {String(batch.id || '-')}</span>
                          <span className="tag">Qty: {String(batch.quantity ?? '-')}</span>
                          <span className="tag">Allocated: {String(batch.allocatedQuantity ?? '-')}</span>
                        </div>
                        <button className="secondary-button" type="button" onClick={() => addBatchToAllocation(String(batch.id || ''))}>
                          Them vao allocation
                        </button>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">Chua co batch phu hop voi active offer.</div>
                )}

                <form className="panel-form" onSubmit={submitBatchAllocation}>
                  {allocationItems.length ? (
                    <div className="compact-list">
                      {allocationItems.map((item, index) => (
                        <div key={item.batchId} className="compact-item">
                          <strong>Batch {item.batchId}</strong>
                          <label>
                            <span>Allocated quantity</span>
                            <input
                              type="number"
                              min={1}
                              value={item.allocatedQuantity}
                              onChange={(event) =>
                                setAllocationItems((prev) =>
                                  prev.map((entry, entryIndex) =>
                                    entryIndex === index
                                      ? { ...entry, allocatedQuantity: Number(event.target.value) }
                                      : entry,
                                  ),
                                )
                              }
                            />
                          </label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">Chua chon batch nao de allocate.</div>
                  )}
                  {allocationMessage ? <div className="empty-state">{allocationMessage}</div> : null}
                  <button className="primary-button" type="submit" disabled={allocationLoading}>
                    {allocationLoading ? 'Dang allocate...' : 'Allocate batches'}
                  </button>
                </form>

                <ApiResult
                  title="Batch links cua active offer"
                  loading={activeOfferBatchLinks.loading}
                  error={activeOfferBatchLinks.error}
                  data={activeOfferBatchLinks.data}
                />
              </>
            )}
          </PageSection>

          <PageSection
            title="Offer media"
            description="Lay upload signature truoc, upload file len provider, roi quay lai day de luu metadata media vao offer."
          >
            {!activeOfferId ? (
              <div className="empty-state">Chua co active offer.</div>
            ) : (
              <>
                <form className="panel-form two-columns" onSubmit={requestMediaUploadSignature}>
                  <label>
                    <span>Asset type</span>
                    <select
                      value={mediaSignatureForm.assetType}
                      onChange={(event) => setMediaSignatureForm({ assetType: event.target.value })}
                    >
                      <option value="IMAGE">IMAGE</option>
                      <option value="VIDEO">VIDEO</option>
                    </select>
                  </label>
                  <button className="primary-button full-width" type="submit">
                    Lay media upload signature
                  </button>
                </form>

                {mediaMessage ? <div className="empty-state">{mediaMessage}</div> : null}
                {mediaSignatureResult ? (
                  <ApiResult title="Media upload signature" loading={false} error={null} data={mediaSignatureResult} />
                ) : null}

                <form className="panel-form two-columns" onSubmit={saveOfferMediaMetadata}>
                  <label>
                    <span>Asset type</span>
                    <select
                      value={mediaMetadataForm.assetType}
                      onChange={(event) =>
                        setMediaMetadataForm((prev) => ({ ...prev, assetType: event.target.value }))
                      }
                    >
                      <option value="IMAGE">IMAGE</option>
                      <option value="VIDEO">VIDEO</option>
                    </select>
                  </label>
                  <label>
                    <span>Mime type</span>
                    <input
                      value={mediaMetadataForm.mimeType}
                      onChange={(event) =>
                        setMediaMetadataForm((prev) => ({ ...prev, mimeType: event.target.value }))
                      }
                      required
                    />
                  </label>
                  <label className="full-width">
                    <span>File URL</span>
                    <input
                      value={mediaMetadataForm.fileUrl}
                      onChange={(event) =>
                        setMediaMetadataForm((prev) => ({ ...prev, fileUrl: event.target.value }))
                      }
                      required
                    />
                  </label>
                  <label className="full-width">
                    <span>Public ID</span>
                    <input
                      value={mediaMetadataForm.publicId}
                      onChange={(event) =>
                        setMediaMetadataForm((prev) => ({ ...prev, publicId: event.target.value }))
                      }
                      required
                    />
                  </label>
                  <label>
                    <span>Media type</span>
                    <input
                      value={mediaMetadataForm.mediaType}
                      onChange={(event) =>
                        setMediaMetadataForm((prev) => ({ ...prev, mediaType: event.target.value }))
                      }
                    />
                  </label>
                  <label>
                    <span>Phash</span>
                    <input
                      value={mediaMetadataForm.phash}
                      onChange={(event) =>
                        setMediaMetadataForm((prev) => ({ ...prev, phash: event.target.value }))
                      }
                    />
                  </label>
                  <button className="primary-button full-width" type="submit">
                    Luu media metadata
                  </button>
                </form>
              </>
            )}
          </PageSection>

          <PageSection
            title="Offer documents"
            description="Documents duoc tach thanh 2 buoc: xin upload signature roi luu metadata sau khi upload."
          >
            {!activeOfferId ? (
              <div className="empty-state">Chua co active offer.</div>
            ) : (
              <>
                <form className="panel-form two-columns" onSubmit={requestDocumentUploadSignature}>
                  <label>
                    <span>Document type</span>
                    <input
                      value={documentSignatureForm.docType}
                      onChange={(event) => setDocumentSignatureForm({ docType: event.target.value })}
                      required
                    />
                  </label>
                  <button className="primary-button full-width" type="submit">
                    Lay document upload signature
                  </button>
                </form>

                {documentMessage ? <div className="empty-state">{documentMessage}</div> : null}
                {documentSignatureResult ? (
                  <ApiResult title="Document upload signature" loading={false} error={null} data={documentSignatureResult} />
                ) : null}

                <form className="panel-form two-columns" onSubmit={saveOfferDocumentMetadata}>
                  <label>
                    <span>Document type</span>
                    <input
                      value={documentMetadataForm.docType}
                      onChange={(event) =>
                        setDocumentMetadataForm((prev) => ({ ...prev, docType: event.target.value }))
                      }
                      required
                    />
                  </label>
                  <label>
                    <span>Mime type</span>
                    <input
                      value={documentMetadataForm.mimeType}
                      onChange={(event) =>
                        setDocumentMetadataForm((prev) => ({ ...prev, mimeType: event.target.value }))
                      }
                      required
                    />
                  </label>
                  <label className="full-width">
                    <span>File URL</span>
                    <input
                      value={documentMetadataForm.fileUrl}
                      onChange={(event) =>
                        setDocumentMetadataForm((prev) => ({ ...prev, fileUrl: event.target.value }))
                      }
                      required
                    />
                  </label>
                  <label className="full-width">
                    <span>Public ID</span>
                    <input
                      value={documentMetadataForm.publicId}
                      onChange={(event) =>
                        setDocumentMetadataForm((prev) => ({ ...prev, publicId: event.target.value }))
                      }
                      required
                    />
                  </label>
                  <label>
                    <span>Issuer name</span>
                    <input
                      value={documentMetadataForm.issuerName}
                      onChange={(event) =>
                        setDocumentMetadataForm((prev) => ({ ...prev, issuerName: event.target.value }))
                      }
                    />
                  </label>
                  <label>
                    <span>Document number</span>
                    <input
                      value={documentMetadataForm.documentNumber}
                      onChange={(event) =>
                        setDocumentMetadataForm((prev) => ({ ...prev, documentNumber: event.target.value }))
                      }
                    />
                  </label>
                  <button className="primary-button full-width" type="submit">
                    Luu document metadata
                  </button>
                </form>
              </>
            )}
          </PageSection>
        </>
      ) : null}
    </div>
  );
}
