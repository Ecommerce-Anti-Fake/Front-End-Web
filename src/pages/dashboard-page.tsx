import { Link } from 'react-router-dom';
import { StatCard } from '../components/stat-card';
import { PageSection } from '../components/page-section';
import { useApiQuery } from '../hooks/use-api-query';

const ACTIVE_OFFER_KEY = 'eaf-active-offer-id';

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
  shopName?: string;
  productModelName?: string;
  categoryName?: string;
  offerStatus?: string;
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

export function DashboardPage() {
  const categories = useApiQuery('/products/categories');
  const offers = useApiQuery('/products/offers');
  const activeOfferId = window.localStorage.getItem(ACTIVE_OFFER_KEY) || '';

  const categoryList = normalizeList<CategoryRecord>(categories.data, ['items', 'data', 'categories']);
  const offerList = normalizeList<OfferRecord>(offers.data, ['items', 'data', 'offers']);
  const activeOffer = offerList.find((offer) => String(offer.id || '') === activeOfferId) ?? null;
  const featuredOffers = offerList.slice(0, 4);

  return (
    <div className="page-stack">
      <header className="page-header">
        <p className="eyebrow">Buyer home</p>
        <h1>Kham pha offer chinh hang va di thang vao luong mua hang</h1>
        <p className="muted">
          Dashboard bay gio dong vai tro landing page cho buyer: xem nhanh offer noi bat, category va offer dang duoc chon.
        </p>
      </header>

      <div className="storefront-hero">
        <div className="storefront-copy">
          <p className="eyebrow">Spotlight</p>
          <h2>{activeOffer?.title || featuredOffers[0]?.title || 'Chon mot offer de bat dau'}</h2>
          <p className="muted">
            {activeOffer?.description ||
              featuredOffers[0]?.description ||
              'Vao Products de duyet catalog, mo chi tiet offer, roi qua Orders de tao retail hoac wholesale order.'}
          </p>
          <div className="tag-row">
            <span className="tag">Offers: {offerList.length}</span>
            <span className="tag">Categories: {categoryList.length}</span>
            <span className="tag">Active offer: {activeOffer ? 'Co' : 'Chua chon'}</span>
          </div>
        </div>
        <div className="storefront-visual">
          <div className="storefront-placeholder">
            <strong>{activeOffer?.productModelName || featuredOffers[0]?.productModelName || 'Catalog storefront'}</strong>
            <p className="muted">
              {activeOffer?.shopName || featuredOffers[0]?.shopName || 'Bat dau tu buyer catalog de chon san pham phu hop.'}
            </p>
            <Link className="primary-button link-button" to={activeOfferId ? `/products/${activeOfferId}` : '/products'}>
              {activeOfferId ? 'Mo active offer' : 'Vao catalog'}
            </Link>
          </div>
        </div>
      </div>

      <section className="stats-grid">
        <StatCard label="Catalog" value={String(offerList.length)} helper="So offer dang hien thi tren san" />
        <StatCard label="Categories" value={String(categoryList.length)} helper="Nhom san pham co the duyet" />
        <StatCard label="Orders" value={activeOfferId ? 'Ready' : 'Pick offer'} helper="Chon offer truoc khi dat hang" />
        <StatCard label="Verification" value="On" helper="Media va tai lieu co the xem o trang chi tiet offer" />
      </section>

      <PageSection title="Offer noi bat" description="Diem vao nhanh cho buyer.">
        {offers.loading ? (
          <div className="empty-state">Dang tai offers...</div>
        ) : offers.error ? (
          <div className="empty-state error">{offers.error}</div>
        ) : featuredOffers.length ? (
          <div className="featured-offers-grid">
            {featuredOffers.map((offer) => (
              <Link key={String(offer.id)} className="featured-offer-card link-reset" to={`/products/${String(offer.id || '')}`}>
                <span className="eyebrow">{offer.categoryName || 'Category'}</span>
                <strong>{offer.title || 'Untitled offer'}</strong>
                <span className="muted">
                  {offer.shopName || '-'} | {String(offer.price ?? '-')} {offer.currency || 'VND'}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state">Chua co offer de hien thi.</div>
        )}
      </PageSection>

      <PageSection title="Duyet theo category">
        {categories.loading ? (
          <div className="empty-state">Dang tai categories...</div>
        ) : categories.error ? (
          <div className="empty-state error">{categories.error}</div>
        ) : categoryList.length ? (
          <div className="entity-grid">
            {categoryList.slice(0, 6).map((category) => (
              <article key={String(category.id)} className="entity-card">
                <div className="entity-card-header">
                  <div>
                    <h3>{category.name || 'Unnamed category'}</h3>
                    <p className="muted">Risk tier {category.riskTier || '-'}</p>
                  </div>
                </div>
                <Link
                  className="secondary-button link-button"
                  to={`/products?categoryId=${encodeURIComponent(String(category.id || ''))}`}
                >
                  Xem offer trong category
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">Chua co category.</div>
        )}
      </PageSection>

      <PageSection title="Loi tat buyer flow">
        <div className="highlight-grid">
          <article className="highlight-card">
            <h3>1. Duyet catalog</h3>
            <p>Vao Products de tim offer theo category, shop va model.</p>
          </article>
          <article className="highlight-card">
            <h3>2. Xem chi tiet</h3>
            <p>Mo trang offer detail de xem media, tai lieu va thong tin xac thuc.</p>
          </article>
          <article className="highlight-card">
            <h3>3. Dat hang</h3>
            <p>Qua Orders de tao retail order hoac wholesale order tu active offer.</p>
          </article>
        </div>
      </PageSection>
    </div>
  );
}
