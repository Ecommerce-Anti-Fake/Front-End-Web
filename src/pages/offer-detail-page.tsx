import { useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PageSection } from '../components/page-section';
import { addToCart } from '../lib/cart';
import { useApiQuery } from '../hooks/use-api-query';

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
  productModelId?: string;
  productModelName?: string;
  categoryId?: string;
  categoryName?: string;
  createdAt?: string;
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
  const offerId = params.offerId || '';

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
  const primaryImage = mediaList[0]?.fileUrl || null;
  const offer = offerDetail.data;

  useEffect(() => {
    if (!offerId) {
      return;
    }

    window.localStorage.setItem(ACTIVE_OFFER_KEY, offerId);
  }, [offerId]);

  async function handleAddToCart() {
    if (!offer?.id) {
      return;
    }

    await addToCart({
      offerId: String(offer.id),
      quantity: 1,
    });
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <p className="eyebrow">Offer detail</p>
        <h1>{offer?.title || offerId || 'Chi tiet offer'}</h1>
        <p className="muted">
          Trang chi tiet danh cho buyer. Offer duoc luu thanh active offer de di tiep sang trang Orders khi can.
        </p>
      </header>

      <div className="offer-detail-toolbar">
        <button className="secondary-button" type="button" onClick={() => navigate('/products')}>
          Quay lai catalog
        </button>
        <button className="secondary-button" type="button" onClick={() => void handleAddToCart()}>
          Them vao gio
        </button>
        <Link className="primary-button link-button" to="/orders">
          Dat hang voi offer nay
        </Link>
      </div>

      <PageSection title="Tong quan offer">
        {offerDetail.loading ? (
          <div className="empty-state">Dang tai chi tiet offer...</div>
        ) : offerDetail.error ? (
          <div className="empty-state error">{offerDetail.error}</div>
        ) : (
          <div className="offer-detail-layout">
            <div className="offer-gallery-panel">
              {primaryImage ? (
                <img src={primaryImage} alt={offer?.title || 'Offer image'} className="storefront-image" />
              ) : (
                <div className="storefront-placeholder">
                  <strong>{offer?.productModelName || 'Offer media'}</strong>
                  <p className="muted">Offer nay chua co media dai dien.</p>
                </div>
              )}
            </div>

            <div className="offer-summary-panel">
              <span className="eyebrow">{offer?.categoryName || offer?.categoryId || 'Category'}</span>
              <h2>{offer?.title || '-'}</h2>
              <p className="muted">{offer?.description || 'Khong co mo ta chi tiet.'}</p>
              <div className="offer-price-block">
                <strong>
                  {String(offer?.price ?? '-')} {offer?.currency || 'VND'}
                </strong>
                <span className="muted">Ban boi {offer?.shopName || offer?.shopId || '-'}</span>
              </div>
              <div className="tag-row">
                <span className="tag">Mode: {String(offer?.salesMode ?? '-')}</span>
                <span className="tag">Qty: {String(offer?.availableQuantity ?? '-')}</span>
                <span className="tag">Status: {String(offer?.offerStatus ?? '-')}</span>
                <span className="tag">Verification: {String(offer?.verificationLevel ?? '-')}</span>
                {offer?.minWholesaleQty ? (
                  <span className="tag">Min wholesale: {String(offer.minWholesaleQty)}</span>
                ) : null}
              </div>
              <div className="offer-actions">
                <button className="secondary-button" type="button" onClick={() => void handleAddToCart()}>
                  Them vao gio
                </button>
                <Link className="primary-button link-button" to="/cart">
                  Mo gio hang
                </Link>
              </div>
            </div>
          </div>
        )}
      </PageSection>

      <PageSection title="Media va tai lieu">
        <div className="evidence-grid">
          <div className="evidence-panel">
            <div className="section-header compact">
              <div>
                <h2>Gallery</h2>
                <p className="muted">Hinh anh va media dinh kem cua offer.</p>
              </div>
            </div>
            {offerMedia.loading ? (
              <div className="empty-state">Dang tai media...</div>
            ) : offerMedia.error ? (
              <div className="empty-state error">{offerMedia.error}</div>
            ) : mediaList.length ? (
              <div className="offer-gallery-grid">
                {mediaList.map((media) => (
                  <article key={String(media.id || media.fileUrl)} className="offer-gallery-item">
                    {media.assetType === 'IMAGE' && media.fileUrl ? (
                      <img src={media.fileUrl} alt={offer?.title || 'Offer media'} className="offer-media-image" />
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
              <div className="empty-state">Chua co media.</div>
            )}
          </div>

          <div className="evidence-panel">
            <div className="section-header compact">
              <div>
                <h2>Tai lieu xac thuc</h2>
                <p className="muted">Tai lieu buyer co the mo truc tiep de doi chieu.</p>
              </div>
            </div>
            {offerDocuments.loading ? (
              <div className="empty-state">Dang tai documents...</div>
            ) : offerDocuments.error ? (
              <div className="empty-state error">{offerDocuments.error}</div>
            ) : documentList.length ? (
              <div className="evidence-list">
                {documentList.map((document) => (
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
      </PageSection>
    </div>
  );
}
