import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiResult } from '../components/api-result';
import { PageSection } from '../components/page-section';
import { useApiQuery } from '../hooks/use-api-query';
import { apiRequest } from '../lib/api-client';
import { useAuth } from '../modules/auth/auth-context';

const ACTIVE_SHOP_KEY = 'eaf-active-shop-id';

const initialShopForm = {
  shopName: '',
  registrationType: 'NORMAL',
  businessType: 'COMPANY',
  categoryIds: [] as string[],
  taxCode: '',
};

type ShopRecord = {
  id?: string;
  shopName?: string;
  registrationType?: string;
  shopStatus?: string;
  verificationStatus?: string;
  businessType?: string;
  taxCode?: string | null;
  [key: string]: unknown;
};

type CategoryRecord = {
  id?: string;
  name?: string;
  riskTier?: string;
  [key: string]: unknown;
};

type KycRecord = {
  verificationStatus?: string;
  documents?: Array<{
    side?: 'FRONT' | 'BACK';
  }>;
  [key: string]: unknown;
};

type ShopVerificationCategoryRecord = {
  categoryId?: string;
  categoryName?: string;
  riskTier?: string;
  requiredVerification?: boolean;
  registrationStatus?: string;
  approvedDocumentCount?: number;
  documentCount?: number;
  reviewNote?: string | null;
  [key: string]: unknown;
};

type ShopVerificationSummaryRecord = {
  shopId?: string;
  shopStatus?: string;
  registrationType?: string;
  canOperate?: boolean;
  kycStatus?: string;
  hasRequiredKycDocuments?: boolean;
  requiresShopDocuments?: boolean;
  hasApprovedShopDocument?: boolean;
  totalShopDocuments?: number;
  approvedShopDocuments?: number;
  missingRequirements?: string[];
  categories?: ShopVerificationCategoryRecord[];
  [key: string]: unknown;
};

type UploadSignatureRecord = {
  cloudName?: string;
  apiKey?: string;
  timestamp?: number;
  folder?: string;
  publicId?: string;
  uploadResourceType?: string;
  signature?: string;
  [key: string]: unknown;
};

type ShopDocumentRecord = {
  id?: string;
  docType?: string;
  fileUrl?: string;
  reviewStatus?: string;
  reviewNote?: string | null;
  uploadedAt?: string;
  [key: string]: unknown;
};

type CategoryDocumentRecord = {
  id?: string;
  documentType?: string;
  fileUrl?: string;
  reviewStatus?: string;
  reviewNote?: string | null;
  uploadedAt?: string;
  [key: string]: unknown;
};

function normalizeShops(data: unknown): ShopRecord[] {
  if (Array.isArray(data)) {
    return data as ShopRecord[];
  }

  if (data && typeof data === 'object') {
    const possibleItems = ['items', 'data', 'shops'];

    for (const key of possibleItems) {
      const value = (data as Record<string, unknown>)[key];

      if (Array.isArray(value)) {
        return value as ShopRecord[];
      }
    }
  }

  return [];
}

function normalizeCategories(data: unknown): CategoryRecord[] {
  if (Array.isArray(data)) {
    return data as CategoryRecord[];
  }

  if (data && typeof data === 'object') {
    const possibleItems = ['items', 'data', 'categories'];

    for (const key of possibleItems) {
      const value = (data as Record<string, unknown>)[key];

      if (Array.isArray(value)) {
        return value as CategoryRecord[];
      }
    }
  }

  return [];
}

function normalizeItems<T>(data: unknown, keys: string[]): T[] {
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

export function ShopsPage() {
  const { session } = useAuth();
  const myShops = useApiQuery('/shops/mine');
  const pending = useApiQuery('/shops/admin/pending-verification');
  const categories = useApiQuery('/products/categories');
  const kyc = useApiQuery<KycRecord | null>('/user/kyc');

  const [form, setForm] = useState(initialShopForm);
  const [message, setMessage] = useState<string | null>(null);
  const [activeShopId, setActiveShopId] = useState(() => window.localStorage.getItem(ACTIVE_SHOP_KEY) || '');
  const [shopDocumentType, setShopDocumentType] = useState('BUSINESS_LICENSE');
  const [shopDocumentForm, setShopDocumentForm] = useState({
    docType: 'BUSINESS_LICENSE',
    mimeType: 'image/jpeg',
    fileUrl: '',
    publicId: '',
  });
  const [shopDocumentMessage, setShopDocumentMessage] = useState<string | null>(null);
  const [shopSignatureResult, setShopSignatureResult] = useState<UploadSignatureRecord[] | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [categoryDocumentType, setCategoryDocumentType] = useState('CATEGORY_CERTIFICATE');
  const [categoryDocumentForm, setCategoryDocumentForm] = useState({
    documentType: 'CATEGORY_CERTIFICATE',
    mimeType: 'image/jpeg',
    fileUrl: '',
    publicId: '',
    documentNumber: '',
    issuedBy: '',
    issuedAt: '',
    expiresAt: '',
  });
  const [categoryDocumentMessage, setCategoryDocumentMessage] = useState<string | null>(null);
  const [categorySignatureResult, setCategorySignatureResult] = useState<UploadSignatureRecord[] | null>(null);

  const shopList = useMemo(() => normalizeShops(myShops.data), [myShops.data]);
  const categoryList = useMemo(() => normalizeCategories(categories.data), [categories.data]);
  const activeShop = shopList.find((shop) => shop.id === activeShopId) ?? null;
  const verificationSummary = useApiQuery<ShopVerificationSummaryRecord>(
    activeShopId ? `/shops/${encodeURIComponent(activeShopId)}/verification-summary` : '',
    Boolean(activeShopId),
  );
  const shopDocuments = useApiQuery<ShopDocumentRecord[]>(
    activeShopId ? `/shops/${encodeURIComponent(activeShopId)}/documents` : '',
    Boolean(activeShopId),
  );

  const selectedCategories = useMemo(
    () => categoryList.filter((category) => form.categoryIds.includes(String(category.id || ''))),
    [categoryList, form.categoryIds],
  );
  const regulatedCategories = useMemo(
    () =>
      selectedCategories.filter((category) => String(category.riskTier || '').trim().toLowerCase() !== 'low'),
    [selectedCategories],
  );
  const verificationCategories = Array.isArray(verificationSummary.data?.categories)
    ? verificationSummary.data.categories
    : [];
  const missingRequirements = Array.isArray(verificationSummary.data?.missingRequirements)
    ? verificationSummary.data.missingRequirements
    : [];
  const hasApprovedKyc =
    String(kyc.data?.verificationStatus || '').toLowerCase() === 'approved' &&
    (kyc.data?.documents?.some((document) => document.side === 'FRONT') ?? false) &&
    (kyc.data?.documents?.some((document) => document.side === 'BACK') ?? false);
  const requiresShopDocuments =
    form.registrationType === 'MANUFACTURER' || form.registrationType === 'DISTRIBUTOR';
  const actionableCategories = useMemo(
    () => verificationCategories.filter((category) => category.requiredVerification),
    [verificationCategories],
  );
  const activeCategoryId = selectedCategoryId || String(actionableCategories[0]?.categoryId || '');
  const categoryDocuments = useApiQuery<CategoryDocumentRecord[]>(
    activeShopId && activeCategoryId
      ? `/shops/${encodeURIComponent(activeShopId)}/categories/${encodeURIComponent(activeCategoryId)}/documents`
      : '',
    Boolean(activeShopId && activeCategoryId),
  );
  const shopDocumentList = useMemo(
    () => normalizeItems<ShopDocumentRecord>(shopDocuments.data, ['items', 'data', 'documents']),
    [shopDocuments.data],
  );
  const categoryDocumentList = useMemo(
    () => normalizeItems<CategoryDocumentRecord>(categoryDocuments.data, ['items', 'data', 'documents']),
    [categoryDocuments.data],
  );

  useEffect(() => {
    if (activeShopId) {
      window.localStorage.setItem(ACTIVE_SHOP_KEY, activeShopId);
      return;
    }

    window.localStorage.removeItem(ACTIVE_SHOP_KEY);
  }, [activeShopId]);

  useEffect(() => {
    if (!activeShopId && shopList[0]?.id) {
      setActiveShopId(String(shopList[0].id));
    }
  }, [activeShopId, shopList]);

  useEffect(() => {
    if (!actionableCategories.length) {
      setSelectedCategoryId('');
      return;
    }

    setSelectedCategoryId((prev) =>
      actionableCategories.some((category) => String(category.categoryId || '') === prev)
        ? prev
        : String(actionableCategories[0]?.categoryId || ''),
    );
  }, [actionableCategories]);

  async function handleCreateShop(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      await apiRequest('/shops', {
        method: 'POST',
        accessToken: session?.accessToken,
        body: {
          shopName: form.shopName,
          registrationType: form.registrationType,
          businessType: form.businessType,
          taxCode: form.taxCode || null,
          categoryIds: form.categoryIds,
        },
      });

      setMessage('Tao shop thanh cong.');
      setForm(initialShopForm);
      await myShops.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Create shop failed');
    }
  }

  function toggleCategory(categoryId: string) {
    setForm((prev) => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(categoryId)
        ? prev.categoryIds.filter((item) => item !== categoryId)
        : [...prev.categoryIds, categoryId],
    }));
  }

  async function handleGetShopDocumentSignature(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeShopId) {
      setShopDocumentMessage('Can chon active shop truoc.');
      return;
    }

    try {
      const response = await apiRequest<UploadSignatureRecord[]>(
        `/shops/${encodeURIComponent(activeShopId)}/documents/upload-signatures`,
        {
          method: 'POST',
          accessToken: session?.accessToken,
          body: {
            items: [{ docType: shopDocumentType }],
          },
        },
      );
      setShopSignatureResult(response);
      setShopDocumentForm((prev) => ({ ...prev, docType: shopDocumentType }));
      setShopDocumentMessage('Lay shop document upload signature thanh cong.');
    } catch (error) {
      setShopDocumentMessage(error instanceof Error ? error.message : 'Get shop document signature failed');
    }
  }

  async function handleSubmitShopDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeShopId) {
      setShopDocumentMessage('Can chon active shop truoc.');
      return;
    }

    try {
      await apiRequest(`/shops/${encodeURIComponent(activeShopId)}/documents`, {
        method: 'POST',
        accessToken: session?.accessToken,
        body: {
          items: [
            {
              docType: shopDocumentForm.docType,
              mimeType: shopDocumentForm.mimeType,
              fileUrl: shopDocumentForm.fileUrl,
              publicId: shopDocumentForm.publicId,
            },
          ],
        },
      });
      setShopDocumentMessage('Nop shop document thanh cong.');
      setShopDocumentForm({
        docType: shopDocumentType,
        mimeType: 'image/jpeg',
        fileUrl: '',
        publicId: '',
      });
      await Promise.all([shopDocuments.reload(), verificationSummary.reload(), myShops.reload()]);
    } catch (error) {
      setShopDocumentMessage(error instanceof Error ? error.message : 'Submit shop document failed');
    }
  }

  async function handleGetCategoryDocumentSignature(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeShopId || !activeCategoryId) {
      setCategoryDocumentMessage('Can chon active shop va category truoc.');
      return;
    }

    try {
      const response = await apiRequest<UploadSignatureRecord[]>(
        `/shops/${encodeURIComponent(activeShopId)}/categories/${encodeURIComponent(activeCategoryId)}/documents/upload-signatures`,
        {
          method: 'POST',
          accessToken: session?.accessToken,
          body: {
            items: [{ documentType: categoryDocumentType }],
          },
        },
      );
      setCategorySignatureResult(response);
      setCategoryDocumentForm((prev) => ({ ...prev, documentType: categoryDocumentType }));
      setCategoryDocumentMessage('Lay category document upload signature thanh cong.');
    } catch (error) {
      setCategoryDocumentMessage(error instanceof Error ? error.message : 'Get category document signature failed');
    }
  }

  async function handleSubmitCategoryDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeShopId || !activeCategoryId) {
      setCategoryDocumentMessage('Can chon active shop va category truoc.');
      return;
    }

    try {
      await apiRequest(
        `/shops/${encodeURIComponent(activeShopId)}/categories/${encodeURIComponent(activeCategoryId)}/documents`,
        {
          method: 'POST',
          accessToken: session?.accessToken,
          body: {
            items: [
              {
                documentType: categoryDocumentForm.documentType,
                mimeType: categoryDocumentForm.mimeType,
                fileUrl: categoryDocumentForm.fileUrl,
                publicId: categoryDocumentForm.publicId,
                documentNumber: categoryDocumentForm.documentNumber || undefined,
                issuedBy: categoryDocumentForm.issuedBy || undefined,
                issuedAt: categoryDocumentForm.issuedAt || undefined,
                expiresAt: categoryDocumentForm.expiresAt || undefined,
              },
            ],
          },
        },
      );
      setCategoryDocumentMessage('Nop category document thanh cong.');
      setCategoryDocumentForm({
        documentType: categoryDocumentType,
        mimeType: 'image/jpeg',
        fileUrl: '',
        publicId: '',
        documentNumber: '',
        issuedBy: '',
        issuedAt: '',
        expiresAt: '',
      });
      await Promise.all([categoryDocuments.reload(), verificationSummary.reload(), myShops.reload()]);
    } catch (error) {
      setCategoryDocumentMessage(error instanceof Error ? error.message : 'Submit category document failed');
    }
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <p className="eyebrow">Shops</p>
        <h1>Shops workspace</h1>
        <p className="muted">
          Trang nay da dua rule verification len ro hon: thieu KYC thi pending_kyc, category rui ro cao thi can ho so
          category, manufacturer va distributor thi can them ho so shop.
        </p>
      </header>

      <PageSection title="Dieu kien truoc khi mo shop">
        <div className="context-grid">
          <div className="context-card">
            <p className="eyebrow">KYC cua user</p>
            <strong>{kyc.data?.verificationStatus || 'missing'}</strong>
            <p className="muted">
              {hasApprovedKyc
                ? 'Da du KYC de shop co the tien sang verification hoac active.'
                : 'Neu tao shop luc nay, shop se vao pending_kyc cho den khi KYC duoc duyet.'}
            </p>
            {!hasApprovedKyc ? (
              <Link className="secondary-button link-button" to="/user">
                Bo sung KYC
              </Link>
            ) : null}
          </div>
          <div className="context-card">
            <p className="eyebrow">Rule category</p>
            <strong>{regulatedCategories.length}</strong>
            <p className="muted">
              Moi category co risk tier khac `low` deu se can ho so category va admin review.
            </p>
          </div>
        </div>
      </PageSection>

      <PageSection title="Active shop">
        {activeShop ? (
          <div className="focus-card">
            <div>
              <p className="eyebrow">Dang duoc chon</p>
              <h3>{activeShop.shopName || 'Unnamed shop'}</h3>
              <p className="muted">
                {activeShop.registrationType || '-'} | {activeShop.businessType || '-'}
              </p>
            </div>
            <div className="tag-row">
              <span className="tag">ID: {String(activeShop.id)}</span>
              <span className="tag">Status: {String(activeShop.shopStatus || activeShop.verificationStatus || '-')}</span>
            </div>
          </div>
        ) : (
          <div className="empty-state">Chua co active shop. Tao shop moi hoac chon mot shop ben duoi.</div>
        )}
      </PageSection>

      {activeShopId ? (
        <PageSection
          title="Verification cua active shop"
          description="Tong hop chinh xac shop dang thieu dieu kien nao de duoc active."
        >
          {verificationSummary.loading ? (
            <div className="empty-state">Dang tai verification summary...</div>
          ) : verificationSummary.error ? (
            <div className="empty-state error">{verificationSummary.error}</div>
          ) : verificationSummary.data ? (
            <>
              <div className="context-grid">
                <div className="context-card">
                  <p className="eyebrow">Shop status</p>
                  <strong>{verificationSummary.data.shopStatus || '-'}</strong>
                  <p className="muted">
                    {verificationSummary.data.canOperate ? 'Shop da co the hoat dong.' : 'Shop chua du dieu kien hoat dong.'}
                  </p>
                </div>
                <div className="context-card">
                  <p className="eyebrow">Shop documents</p>
                  <strong>
                    {String(verificationSummary.data.approvedShopDocuments ?? 0)} / {String(verificationSummary.data.totalShopDocuments ?? 0)}
                  </strong>
                  <p className="muted">
                    {verificationSummary.data.requiresShopDocuments
                      ? 'Loai shop nay can ho so shop duoc admin duyet.'
                      : 'Loai shop nay khong bat buoc ho so shop o muc co ban.'}
                  </p>
                </div>
              </div>

              {missingRequirements.length ? (
                <div className="compact-list">
                  {missingRequirements.map((requirement) => (
                    <div key={requirement} className="compact-item">
                      <strong>{requirement}</strong>
                      <span className="muted">
                        {requirement === 'KYC_APPROVAL_REQUIRED'
                          ? 'Can vao trang User de nop va doi duyet KYC.'
                          : requirement === 'SHOP_DOCUMENT_APPROVAL_REQUIRED'
                            ? 'Can nop ho so shop va cho admin duyet.'
                            : requirement === 'CATEGORY_APPROVAL_REQUIRED'
                              ? 'Can nop giay to cho category rui ro cao va cho admin duyet.'
                              : 'Con thieu mot dieu kien verification.'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">Khong con requirement nao dang thieu.</div>
              )}

              {verificationCategories.length ? (
                <div className="entity-grid">
                  {verificationCategories.map((category) => (
                    <article key={String(category.categoryId || category.categoryName)} className="entity-card">
                      <div className="entity-card-header">
                        <div>
                          <h3>{category.categoryName || category.categoryId || 'Category'}</h3>
                          <p className="muted">Risk tier {category.riskTier || '-'}</p>
                        </div>
                      </div>
                      <div className="tag-row">
                        <span className="tag">Registration: {String(category.registrationStatus || '-')}</span>
                        <span className="tag">
                          Docs: {String(category.approvedDocumentCount ?? 0)} / {String(category.documentCount ?? 0)}
                        </span>
                        <span className="tag">
                          {category.requiredVerification ? 'Can verification' : 'Khong can verification them'}
                        </span>
                      </div>
                      {category.reviewNote ? <p className="muted">{category.reviewNote}</p> : null}
                    </article>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <div className="empty-state">Chua co verification summary.</div>
          )}
        </PageSection>
      ) : null}

      {activeShopId ? (
        <PageSection
          title="Ho so shop"
          description="Dung cho manufacturer va distributor, hoac khi shop dang bi thieu shop document approval."
        >
          <form className="panel-form two-columns" onSubmit={handleGetShopDocumentSignature}>
            <label>
              <span>Document type</span>
              <input value={shopDocumentType} onChange={(event) => setShopDocumentType(event.target.value)} required />
            </label>
            <button className="secondary-button full-width" type="submit">
              Lay shop document upload signature
            </button>
          </form>

          {shopDocumentMessage ? <div className="empty-state">{shopDocumentMessage}</div> : null}
          {shopSignatureResult ? (
            <ApiResult title="Shop document signatures" loading={false} error={null} data={shopSignatureResult} />
          ) : null}

          <form className="panel-form two-columns" onSubmit={handleSubmitShopDocument}>
            <label>
              <span>Document type</span>
              <input
                value={shopDocumentForm.docType}
                onChange={(event) => setShopDocumentForm((prev) => ({ ...prev, docType: event.target.value }))}
                required
              />
            </label>
            <label>
              <span>Mime type</span>
              <input
                value={shopDocumentForm.mimeType}
                onChange={(event) => setShopDocumentForm((prev) => ({ ...prev, mimeType: event.target.value }))}
                required
              />
            </label>
            <label className="full-width">
              <span>File URL</span>
              <input
                value={shopDocumentForm.fileUrl}
                onChange={(event) => setShopDocumentForm((prev) => ({ ...prev, fileUrl: event.target.value }))}
                required
              />
            </label>
            <label className="full-width">
              <span>Public ID</span>
              <input
                value={shopDocumentForm.publicId}
                onChange={(event) => setShopDocumentForm((prev) => ({ ...prev, publicId: event.target.value }))}
                required
              />
            </label>
            <button className="primary-button full-width" type="submit">
              Nop shop document
            </button>
          </form>

          {shopDocumentList.length ? (
            <div className="entity-grid">
              {shopDocumentList.map((document) => (
                <article key={String(document.id || document.fileUrl)} className="entity-card">
                  <div className="entity-card-header">
                    <div>
                      <h3>{document.docType || 'SHOP_DOCUMENT'}</h3>
                      <p className="muted">{document.fileUrl || '-'}</p>
                    </div>
                  </div>
                  <div className="tag-row">
                    <span className="tag">Status: {String(document.reviewStatus || '-')}</span>
                    <span className="tag">Uploaded: {String(document.uploadedAt || '-')}</span>
                  </div>
                  {document.reviewNote ? <p className="muted">{document.reviewNote}</p> : null}
                </article>
              ))}
            </div>
          ) : (
            <ApiResult title="Shop documents" loading={shopDocuments.loading} error={shopDocuments.error} data={shopDocuments.data} />
          )}
        </PageSection>
      ) : null}

      {activeShopId ? (
        <PageSection
          title="Ho so category rui ro cao"
          description="Chon category dang can verification, lay upload signature, upload file len storage roi nop metadata o day."
        >
          {!actionableCategories.length ? (
            <div className="empty-state">Shop nay hien tai khong co category nao can verification bo sung.</div>
          ) : (
            <>
              <form className="panel-form two-columns" onSubmit={handleGetCategoryDocumentSignature}>
                <label>
                  <span>Category</span>
                  <select value={activeCategoryId} onChange={(event) => setSelectedCategoryId(event.target.value)} required>
                    {actionableCategories.map((category) => (
                      <option key={String(category.categoryId)} value={String(category.categoryId || '')}>
                        {category.categoryName || category.categoryId} | {category.registrationStatus || '-'}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Document type</span>
                  <input
                    value={categoryDocumentType}
                    onChange={(event) => setCategoryDocumentType(event.target.value)}
                    required
                  />
                </label>
                <button className="secondary-button full-width" type="submit">
                  Lay category document upload signature
                </button>
              </form>

              {categoryDocumentMessage ? <div className="empty-state">{categoryDocumentMessage}</div> : null}
              {categorySignatureResult ? (
                <ApiResult title="Category document signatures" loading={false} error={null} data={categorySignatureResult} />
              ) : null}

              <form className="panel-form two-columns" onSubmit={handleSubmitCategoryDocument}>
                <label>
                  <span>Document type</span>
                  <input
                    value={categoryDocumentForm.documentType}
                    onChange={(event) =>
                      setCategoryDocumentForm((prev) => ({ ...prev, documentType: event.target.value }))
                    }
                    required
                  />
                </label>
                <label>
                  <span>Mime type</span>
                  <input
                    value={categoryDocumentForm.mimeType}
                    onChange={(event) =>
                      setCategoryDocumentForm((prev) => ({ ...prev, mimeType: event.target.value }))
                    }
                    required
                  />
                </label>
                <label className="full-width">
                  <span>File URL</span>
                  <input
                    value={categoryDocumentForm.fileUrl}
                    onChange={(event) =>
                      setCategoryDocumentForm((prev) => ({ ...prev, fileUrl: event.target.value }))
                    }
                    required
                  />
                </label>
                <label className="full-width">
                  <span>Public ID</span>
                  <input
                    value={categoryDocumentForm.publicId}
                    onChange={(event) =>
                      setCategoryDocumentForm((prev) => ({ ...prev, publicId: event.target.value }))
                    }
                    required
                  />
                </label>
                <label>
                  <span>Document number</span>
                  <input
                    value={categoryDocumentForm.documentNumber}
                    onChange={(event) =>
                      setCategoryDocumentForm((prev) => ({ ...prev, documentNumber: event.target.value }))
                    }
                  />
                </label>
                <label>
                  <span>Issued by</span>
                  <input
                    value={categoryDocumentForm.issuedBy}
                    onChange={(event) =>
                      setCategoryDocumentForm((prev) => ({ ...prev, issuedBy: event.target.value }))
                    }
                  />
                </label>
                <label>
                  <span>Issued at</span>
                  <input
                    type="date"
                    value={categoryDocumentForm.issuedAt}
                    onChange={(event) =>
                      setCategoryDocumentForm((prev) => ({ ...prev, issuedAt: event.target.value }))
                    }
                  />
                </label>
                <label>
                  <span>Expires at</span>
                  <input
                    type="date"
                    value={categoryDocumentForm.expiresAt}
                    onChange={(event) =>
                      setCategoryDocumentForm((prev) => ({ ...prev, expiresAt: event.target.value }))
                    }
                  />
                </label>
                <button className="primary-button full-width" type="submit">
                  Nop category document
                </button>
              </form>

              {categoryDocumentList.length ? (
                <div className="entity-grid">
                  {categoryDocumentList.map((document) => (
                    <article key={String(document.id || document.fileUrl)} className="entity-card">
                      <div className="entity-card-header">
                        <div>
                          <h3>{document.documentType || 'CATEGORY_DOCUMENT'}</h3>
                          <p className="muted">{document.fileUrl || '-'}</p>
                        </div>
                      </div>
                      <div className="tag-row">
                        <span className="tag">Status: {String(document.reviewStatus || '-')}</span>
                        <span className="tag">Uploaded: {String(document.uploadedAt || '-')}</span>
                      </div>
                      {document.reviewNote ? <p className="muted">{document.reviewNote}</p> : null}
                    </article>
                  ))}
                </div>
              ) : (
                <ApiResult
                  title="Category documents"
                  loading={categoryDocuments.loading}
                  error={categoryDocuments.error}
                  data={categoryDocuments.data}
                />
              )}
            </>
          )}
        </PageSection>
      ) : null}

      <PageSection title="Tao shop moi" description="Form nay da hien ro truoc shop se can KYC, ho so shop hay ho so category.">
        <form className="panel-form two-columns" onSubmit={handleCreateShop}>
          <label>
            <span>Shop name</span>
            <input
              value={form.shopName}
              onChange={(event) => setForm((prev) => ({ ...prev, shopName: event.target.value }))}
              required
            />
          </label>
          <label>
            <span>Registration type</span>
            <select
              value={form.registrationType}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, registrationType: event.target.value }))
              }
            >
              <option value="NORMAL">NORMAL</option>
              <option value="HANDMADE">HANDMADE</option>
              <option value="MANUFACTURER">MANUFACTURER</option>
              <option value="DISTRIBUTOR">DISTRIBUTOR</option>
            </select>
          </label>
          <label>
            <span>Business type</span>
            <input
              value={form.businessType}
              onChange={(event) => setForm((prev) => ({ ...prev, businessType: event.target.value }))}
              required
            />
          </label>
          <label>
            <span>Tax code</span>
            <input
              value={form.taxCode}
              onChange={(event) => setForm((prev) => ({ ...prev, taxCode: event.target.value }))}
            />
          </label>
          <label className="full-width">
            <span>Categories</span>
            {categories.loading ? (
              <div className="empty-state">Dang tai categories...</div>
            ) : categories.error ? (
              <div className="empty-state error">{categories.error}</div>
            ) : categoryList.length ? (
              <div className="compact-list">
                {categoryList.map((category) => {
                  const categoryId = String(category.id || '');
                  const checked = form.categoryIds.includes(categoryId);

                  return (
                    <label key={categoryId} className="compact-item">
                      <span>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCategory(categoryId)}
                        />{' '}
                        {category.name || categoryId}
                      </span>
                      <span className="muted">Risk tier: {String(category.riskTier || '-')}</span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">Chua co category de dang ky.</div>
            )}
          </label>

          {!hasApprovedKyc ? (
            <div className="empty-state full-width">
              User nay chua co KYC approved. Neu tao shop bay gio, shop se vao `pending_kyc`.
            </div>
          ) : null}

          {requiresShopDocuments ? (
            <div className="empty-state full-width">
              Loai shop `{form.registrationType}` se can ho so shop va admin review truoc khi active.
            </div>
          ) : null}

          {regulatedCategories.length ? (
            <div className="empty-state full-width">
              Category rui ro cao da chon: {regulatedCategories.map((category) => category.name || category.id).join(', ')}.
              Sau khi tao shop, ban phai nop giay to cho cac category nay.
            </div>
          ) : null}

          {message ? <div className="empty-state full-width">{message}</div> : null}
          <button className="primary-button full-width" type="submit" disabled={!form.categoryIds.length}>
            Tao shop
          </button>
        </form>
      </PageSection>

      <PageSection title="My shops" description="Bam 'Dung shop nay' de luu shop dang thao tac cho cac page tiep theo.">
        {myShops.loading ? (
          <div className="empty-state">Dang tai shops...</div>
        ) : myShops.error ? (
          <div className="empty-state error">{myShops.error}</div>
        ) : shopList.length ? (
          <div className="entity-grid">
            {shopList.map((shop) => {
              const isActive = shop.id === activeShopId;

              return (
                <article key={String(shop.id)} className={isActive ? 'entity-card active' : 'entity-card'}>
                  <div className="entity-card-header">
                    <div>
                      <h3>{shop.shopName || 'Unnamed shop'}</h3>
                      <p className="muted">{shop.registrationType || '-'} | {shop.businessType || '-'}</p>
                    </div>
                    {isActive ? <span className="tag highlight">Active</span> : null}
                  </div>
                  <div className="tag-row">
                    <span className="tag">ID: {String(shop.id || '-')}</span>
                    <span className="tag">Status: {String(shop.shopStatus || shop.verificationStatus || '-')}</span>
                  </div>
                  <button className="secondary-button" type="button" onClick={() => setActiveShopId(String(shop.id || ''))}>
                    Dung shop nay
                  </button>
                </article>
              );
            })}
          </div>
        ) : (
          <ApiResult title="My shops" loading={myShops.loading} error={myShops.error} data={myShops.data} />
        )}
      </PageSection>

      <PageSection title="Pending verification">
        <ApiResult title="Pending shops" loading={pending.loading} error={pending.error} data={pending.data} />
      </PageSection>
    </div>
  );
}
