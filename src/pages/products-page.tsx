import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { BreadcrumbNav } from '../components/breadcrumb-nav';
import { addToCart } from '../lib/cart';
import { useApiQuery } from '../hooks/use-api-query';
import { useAuth } from '../modules/auth/auth-context';

const ACTIVE_OFFER_KEY = 'eaf-active-offer-id';
const DEFAULT_SORT = 'featured';

type CategoryRecord = {
  id?: string;
  name?: string;
  riskTier?: string;
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
  productModelName?: string;
  categoryId?: string;
  categoryName?: string;
  createdAt?: string;
  [key: string]: unknown;
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

export function ProductsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const categories = useApiQuery('/products/categories');
  const offers = useApiQuery('/products/offers');
  const [search, setSearch] = useState(() => searchParams.get('q') || '');
  const [selectedCategoryId, setSelectedCategoryId] = useState(() => searchParams.get('categoryId') || '');
  const [sortBy, setSortBy] = useState(() => searchParams.get('sort') || DEFAULT_SORT);
  const [message, setMessage] = useState<string | null>(null);

  const categoryList = useMemo(
    () => normalizeList<CategoryRecord>(categories.data, ['items', 'data', 'categories']),
    [categories.data],
  );
  const offerList = useMemo(
    () => normalizeList<OfferRecord>(offers.data, ['items', 'data', 'offers']),
    [offers.data],
  );

  const filteredOffers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const nextOffers = offerList.filter((offer) => {
      if (selectedCategoryId && String(offer.categoryId || '') !== selectedCategoryId) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [offer.title, offer.description, offer.shopName, offer.productModelName, offer.categoryName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch);
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
      return 0;
    });
  }, [offerList, search, selectedCategoryId, sortBy]);

  const featuredOffer = filteredOffers[0] ?? null;

  useEffect(() => {
    const nextParams = new URLSearchParams();
    if (search.trim()) {
      nextParams.set('q', search.trim());
    }
    if (selectedCategoryId) {
      nextParams.set('categoryId', selectedCategoryId);
    }
    if (sortBy !== DEFAULT_SORT) {
      nextParams.set('sort', sortBy);
    }

    if (searchParams.toString() !== nextParams.toString()) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [search, searchParams, selectedCategoryId, setSearchParams, sortBy]);

  async function handleAddToCart(offer: OfferRecord) {
    if (!offer.id) {
      return;
    }

    if (!isAuthenticated) {
      navigate('/auth', {
        state: {
          nextPath: `${location.pathname}${location.search}`,
        },
      });
      return;
    }

    try {
      setMessage(null);
      window.localStorage.setItem(ACTIVE_OFFER_KEY, String(offer.id));
      await addToCart({ offerId: String(offer.id), quantity: 1 });
      setMessage(`Đã thêm "${offer.title || 'sản phẩm'}" vào giỏ hàng.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Thêm vào giỏ hàng thất bại.');
    }
  }

  return (
    <div className="catalog-page">
      <BreadcrumbNav items={[{ label: 'Trang chủ', to: '/' }, { label: 'Sản phẩm' }]} />
      <section className="catalog-hero">
        <div>
          <span>Danh mục đã xác thực</span>
          <h1>Sản phẩm chính hãng đã được kiểm chứng.</h1>
          <p>Lọc theo danh mục, chọn offer phù hợp, xem chi tiết nguồn gốc rồi thêm vào giỏ hàng.</p>
        </div>
        {featuredOffer ? (
          <Link className="catalog-feature-card" to={`/products/${String(featuredOffer.id || '')}`}>
            <small>Offer nổi bật</small>
            <strong>{featuredOffer.title}</strong>
            <span>
              {String(featuredOffer.price ?? '-')} {featuredOffer.currency || 'VND'}
            </span>
          </Link>
        ) : null}
      </section>

      <section className="catalog-toolbar">
        <label>
          <span>Tìm kiếm</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tên sản phẩm, shop, model..."
          />
        </label>
        <label>
          <span>Danh mục</span>
          <select value={selectedCategoryId} onChange={(event) => setSelectedCategoryId(event.target.value)}>
            <option value="">Tất cả danh mục</option>
            {categoryList.map((category) => (
              <option key={String(category.id)} value={String(category.id || '')}>
                {category.name || category.id}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Sắp xếp</span>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="featured">Nổi bật</option>
            <option value="newest">Mới nhất</option>
            <option value="price-asc">Giá thấp đến cao</option>
            <option value="price-desc">Giá cao đến thấp</option>
          </select>
        </label>
      </section>

      {message ? <div className="empty-state">{message}</div> : null}

      <section className="catalog-layout">
        <aside className="catalog-sidebar">
          <h3>Danh mục</h3>
          <button className={!selectedCategoryId ? 'active' : ''} type="button" onClick={() => setSelectedCategoryId('')}>
            Tất cả sản phẩm
          </button>
          {categoryList.slice(0, 12).map((category) => (
            <button
              key={String(category.id)}
              className={selectedCategoryId === String(category.id || '') ? 'active' : ''}
              type="button"
              onClick={() => setSelectedCategoryId(String(category.id || ''))}
            >
              {category.name || category.id}
            </button>
          ))}
          <Link to="/shops" className="catalog-side-link">
            Bạn là người bán? Mở shop
          </Link>
        </aside>

        <main className="catalog-results">
          <div className="catalog-result-head">
            <strong>{filteredOffers.length} sản phẩm</strong>
            <span>Hiển thị offer đang bán trên hệ thống</span>
          </div>
          {offers.loading ? (
            <div className="empty-state">Đang tải sản phẩm...</div>
          ) : offers.error ? (
            <div className="empty-state error">{offers.error}</div>
          ) : filteredOffers.length ? (
            <div className="catalog-grid">
              {filteredOffers.map((offer) => (
                <article key={String(offer.id)} className="catalog-card">
                  <Link className="catalog-thumb link-reset" to={`/products/${String(offer.id || '')}`}>
                    <span>{offer.categoryName?.slice(0, 2).toUpperCase() || 'AF'}</span>
                  </Link>
                  <div className="stock-line">
                    <span />
                    <small>{Number(offer.availableQuantity ?? 0) > 0 ? 'còn hàng' : 'kiểm tra tồn kho'}</small>
                  </div>
                  <Link className="catalog-title" to={`/products/${String(offer.id || '')}`}>
                    {offer.title || 'Sản phẩm chưa đặt tên'}
                  </Link>
                  <p>{offer.shopName || 'Shop đã xác thực'}</p>
                  <strong className="catalog-price">
                    {String(offer.price ?? '-')} {offer.currency || 'VND'}
                  </strong>
                  <div className="catalog-card-actions">
                    <button type="button" onClick={() => void handleAddToCart(offer)}>
                      Thêm vào giỏ
                    </button>
                    <Link to={`/products/${String(offer.id || '')}`}>Chi tiết</Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">Không tìm thấy sản phẩm phù hợp.</div>
          )}
        </main>
      </section>
    </div>
  );
}
