import { Link } from 'react-router-dom';
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

const fallbackCategories: CategoryRecord[] = [
  { name: 'Thực phẩm an toàn' },
  { name: 'Mỹ phẩm chính hãng' },
  { name: 'Thiết bị điện tử' },
  { name: 'Nhà cửa & đời sống' },
  { name: 'Sức khỏe' },
  { name: 'Mẹ và bé' },
  { name: 'Nông sản OCOP' },
  { name: 'Thời trang' },
];

export function DashboardPage() {
  const categories = useApiQuery('/products/categories');
  const offers = useApiQuery('/products/offers');
  const activeOfferId = window.localStorage.getItem(ACTIVE_OFFER_KEY) || '';

  const categoryList = normalizeList<CategoryRecord>(categories.data, ['items', 'data', 'categories']);
  const offerList = normalizeList<OfferRecord>(offers.data, ['items', 'data', 'offers']);
  const activeOffer = offerList.find((offer) => String(offer.id || '') === activeOfferId) ?? null;
  const featuredOffers = offerList.slice(0, 4);
  const bestOffers = offerList.slice(4, 8).length ? offerList.slice(4, 8) : offerList.slice(0, 4);
  const displayCategories = categoryList.length ? categoryList : fallbackCategories;

  return (
    <div className="home-page exclusive-home">
      <section className="exclusive-hero">
        <aside className="hero-category-menu" aria-label="Danh mục nổi bật">
          {displayCategories.slice(0, 9).map((category) => (
            <Link
              key={String(category.id || category.name)}
              to={category.id ? `/products?categoryId=${encodeURIComponent(String(category.id))}` : '/products'}
            >
              {category.name || 'Danh mục'}
            </Link>
          ))}
        </aside>

        <div className="hero-main">
          <div className="hero-copy">
            <span className="hero-brand">AntiFake Market</span>
            <h1>Hàng thật có xác thực, mua lẻ và nhập sỉ trong một nền tảng.</h1>
            <p>
              Kiểm tra KYC shop, chứng từ sản phẩm, batch, offer bán lẻ và chính sách đại lý trước khi đặt hàng.
            </p>
            <Link className="hero-cta" to="/products">
              Mua ngay
            </Link>
          </div>
          <div className="hero-promo-card" aria-hidden="true">
            <span>Verified</span>
            <strong>100%</strong>
            <small>Offer có hồ sơ nguồn gốc</small>
          </div>
        </div>
      </section>

      <section className="store-section-heading">
        <div>
          <span className="section-kicker">Hôm nay</span>
          <h2>Flash Sales</h2>
          <p>Offer mới từ các shop đang được hệ thống quản lý.</p>
        </div>
        <Link to="/products">Xem tất cả</Link>
      </section>

      <section className="tech-product-grid exclusive-product-grid">
        {offers.loading ? (
          <div className="empty-state">Đang tải offer...</div>
        ) : offers.error ? (
          <div className="empty-state error">{offers.error}</div>
        ) : featuredOffers.length ? (
          featuredOffers.map((offer) => <ProductCard key={String(offer.id)} offer={offer} />)
        ) : (
          <div className="empty-state">Chưa có offer để hiển thị.</div>
        )}
      </section>

      <PageSection title="Duyệt theo danh mục">
        {categories.loading ? (
          <div className="empty-state">Đang tải danh mục...</div>
        ) : categories.error ? (
          <div className="empty-state error">{categories.error}</div>
        ) : (
          <div className="category-grid exclusive-category-grid">
            {displayCategories.slice(0, 8).map((category, index) => (
              <Link
                key={String(category.id || category.name)}
                className="category-tile"
                to={category.id ? `/products?categoryId=${encodeURIComponent(String(category.id))}` : '/products'}
              >
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{category.name || 'Danh mục'}</strong>
              </Link>
            ))}
          </div>
        )}
      </PageSection>

      <section className="store-section-heading">
        <div>
          <span className="section-kicker">Tháng này</span>
          <h2>Sản phẩm bán chạy</h2>
          <p>Các offer phù hợp cho người mua lẻ, đại lý và shop nhập hàng.</p>
        </div>
      </section>

      <section className="tech-product-grid exclusive-product-grid">
        {bestOffers.map((offer) => (
          <ProductCard key={`best-${String(offer.id)}`} offer={offer} />
        ))}
      </section>

      <section className="exclusive-banner">
        <div>
          <span>AntiFake Trust</span>
          <h2>Hoàn tất KYC để mua hàng, mở shop và tham gia phân phối.</h2>
        </div>
        <Link className="primary-button link-button" to="/user">
          Cập nhật hồ sơ
        </Link>
      </section>

      <section className="service-row exclusive-service-row">
        <div>
          <span>✓</span>
          <strong>Xác thực sản phẩm</strong>
          <p>Quản lý media, tài liệu và batch theo từng offer.</p>
        </div>
        <div>
          <span>ID</span>
          <strong>Tài khoản cá nhân</strong>
          <p>KYC để mua hàng, mở shop và tham gia đại lý.</p>
        </div>
        <div>
          <span>B2B</span>
          <strong>Giá sỉ theo network</strong>
          <p>Đại lý active được áp chính sách đúng nhà sản xuất.</p>
        </div>
      </section>

      {activeOffer ? (
        <section className="active-offer-strip">
          <div>
            <span className="eyebrow">Đang chọn</span>
            <strong>{activeOffer.title}</strong>
          </div>
          <Link className="primary-button link-button" to={`/products/${activeOfferId}`}>
            Xem chi tiết
          </Link>
        </section>
      ) : null}
    </div>
  );
}

function ProductCard({ offer }: { offer: OfferRecord }) {
  return (
    <Link className="tech-product-card exclusive-product-card link-reset" to={`/products/${String(offer.id || '')}`}>
      <div className="tech-thumb">
        <span>{offer.categoryName?.slice(0, 2).toUpperCase() || 'AF'}</span>
      </div>
      <span className="card-cart-button">
        Thêm vào giỏ
      </span>
      <strong>{offer.title || 'Sản phẩm chưa đặt tên'}</strong>
      <small>{offer.shopName || 'Shop đã xác thực'}</small>
      <div className="rating-line">
        <span>★★★★★</span>
        <small>({String(offer.availableQuantity ?? 0)})</small>
      </div>
      <span className="price-line">
        {String(offer.price ?? '-')} {offer.currency || 'VND'}
      </span>
    </Link>
  );
}
