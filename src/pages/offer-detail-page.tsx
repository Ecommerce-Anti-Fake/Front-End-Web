import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { BreadcrumbNav } from '../components/breadcrumb-nav';
import { addToCart } from '../lib/cart';
import { useApiQuery } from '../hooks/use-api-query';
import { useAuth } from '../modules/auth/auth-context';

const ACTIVE_OFFER_KEY = 'eaf-active-offer-id';

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

export function OfferDetailPage() {
  const params = useParams<{ offerId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const offerId = params.offerId || '';
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState<string | null>(null);

  const offerDetail = useApiQuery<OfferRecord>(offerId ? `/products/offers/${offerId}` : '', Boolean(offerId));
  const offerMedia = useApiQuery(offerId ? `/products/offers/${offerId}/media` : '', Boolean(offerId));
  const offerDocuments = useApiQuery(offerId ? `/products/offers/${offerId}/documents` : '', Boolean(offerId));

  const mediaList = useMemo(
    () => normalizeList<OfferMediaRecord>(offerMedia.data, ['items', 'data', 'media']),
    [offerMedia.data],
  );
  const documentList = useMemo(
    () => normalizeList<OfferDocumentRecord>(offerDocuments.data, ['items', 'data', 'documents']),
    [offerDocuments.data],
  );
  const primaryImage = mediaList.find((media) => media.fileUrl)?.fileUrl || null;
  const offer = offerDetail.data;

  useEffect(() => {
    if (offerId) {
      window.localStorage.setItem(ACTIVE_OFFER_KEY, offerId);
    }
  }, [offerId]);

  async function handleAddToCart() {
    if (!offer?.id) {
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
      await addToCart({
        offerId: String(offer.id),
        quantity,
      });
      setMessage('Đã thêm sản phẩm vào giỏ hàng.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Thêm vào giỏ hàng thất bại.');
    }
  }

  return (
    <div className="product-detail-page">
      <BreadcrumbNav items={[{ label: 'Trang chủ', to: '/' }, { label: 'Sản phẩm', to: '/products' }, { label: 'Chi tiết sản phẩm' }]} />

      {offerDetail.loading ? (
        <div className="empty-state">Đang tải chi tiết sản phẩm...</div>
      ) : offerDetail.error ? (
        <div className="empty-state error">{offerDetail.error}</div>
      ) : (
        <>
          <section className="product-detail-layout">
            <div className="product-gallery">
              <div className="product-main-image">
                {primaryImage ? (
                  <img src={primaryImage} alt={offer?.title || 'Product'} />
                ) : (
                  <span>{offer?.categoryName?.slice(0, 2).toUpperCase() || 'AF'}</span>
                )}
              </div>
              <div className="product-thumbs">
                {(mediaList.length ? mediaList : [{ id: 'placeholder', assetType: 'IMAGE' }]).slice(0, 4).map((media) => (
                  <div key={String(media.id || media.fileUrl)} className="product-thumb-small">
                    {media.fileUrl ? <img src={media.fileUrl} alt={offer?.title || 'Product media'} /> : <span>AF</span>}
                  </div>
                ))}
              </div>
            </div>

            <div className="product-info-panel">
              <button className="text-link" type="button" onClick={() => navigate('/products')}>
                Quay lại catalog
              </button>
              <span className="stock-line">
                <span />
                {Number(offer?.availableQuantity ?? 0) > 0 ? 'còn hàng' : 'kiểm tra tồn kho'}
              </span>
              <h1>{offer?.title || 'Sản phẩm chưa đặt tên'}</h1>
              <p>{offer?.description || 'Sản phẩm đang được shop cập nhật mô tả chi tiết.'}</p>
              <div className="product-rating">★★★★★ <span>Đã xác thực bởi hệ thống AntiFake</span></div>
              <strong className="product-detail-price">
                {String(offer?.price ?? '-')} {offer?.currency || 'VND'}
              </strong>
              <div className="product-meta-list">
                <span>Shop: {offer?.shopName || offer?.shopId || '-'}</span>
                <span>Danh mục: {offer?.categoryName || offer?.categoryId || '-'}</span>
                <span>Chế độ bán: {String(offer?.salesMode || '-')}</span>
                <span>Xác thực: {String(offer?.verificationLevel || '-')}</span>
                {offer?.minWholesaleQty ? <span>Sỉ tối thiểu: {String(offer.minWholesaleQty)}</span> : null}
              </div>

              <div className="product-purchase-row">
                <label>
                  <span>Số lượng</span>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(event) => setQuantity(Math.max(1, Number(event.target.value)))}
                  />
                </label>
                <button className="primary-button" type="button" onClick={() => void handleAddToCart()}>
                  Thêm vào giỏ
                </button>
                <Link className="secondary-button link-button" to="/cart">
                  Xem giỏ hàng
                </Link>
              </div>
              {message ? <div className="empty-state">{message}</div> : null}
            </div>
          </section>

          <section className="product-tabs">
            <div>
              <h2>Thông tin sản phẩm</h2>
              <p>{offer?.description || 'Thông tin chi tiết sẽ được shop cập nhật thêm.'}</p>
            </div>
            <div>
              <h2>Tài liệu xác thực</h2>
              {offerDocuments.loading ? (
                <p>Đang tải tài liệu...</p>
              ) : documentList.length ? (
                <div className="document-list">
                  {documentList.map((document) => (
                    <a key={String(document.id || document.fileUrl)} href={document.fileUrl || '#'} target="_blank" rel="noreferrer">
                      <strong>{document.docType || 'DOCUMENT'}</strong>
                      <span>{document.issuerName || 'Đơn vị cấp chưa cập nhật'} • {document.reviewStatus || 'pending'}</span>
                    </a>
                  ))}
                </div>
              ) : (
                <p>Shop chưa bổ sung tài liệu công khai cho offer này.</p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
