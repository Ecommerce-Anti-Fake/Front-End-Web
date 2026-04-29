import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ApiResult } from '../components/api-result';
import { KeyValueList } from '../components/key-value-list';
import { PageSection } from '../components/page-section';
import { useApiQuery } from '../hooks/use-api-query';
import { apiRequest } from '../lib/api-client';
import { useAuth } from '../modules/auth/auth-context';

const initialBrandForm = {
  name: '',
  registryStatus: 'verified',
};

const initialCategoryForm = {
  name: '',
  parentId: '',
  riskTier: 'medium',
};

const initialProductModelForm = {
  brandId: '',
  categoryId: '',
  modelName: '',
  gtin: '',
  verificationPolicy: 'manual_review',
  approvalStatus: 'approved',
};

type BrandRecord = {
  id?: string;
  name?: string;
  registryStatus?: string;
  [key: string]: unknown;
};

type CategoryRecord = {
  id?: string;
  parentId?: string | null;
  name?: string;
  riskTier?: string;
  [key: string]: unknown;
};

type ProductModelRecord = {
  id?: string;
  modelName?: string;
  brandName?: string;
  categoryId?: string;
  categoryName?: string;
  verificationPolicy?: string;
  approvalStatus?: string;
  [key: string]: unknown;
};

type PendingShopRecord = {
  id?: string;
  shopName?: string;
  ownerDisplayName?: string | null;
  ownerEmail?: string | null;
  ownerPhone?: string | null;
  registrationType?: string;
  shopStatus?: string;
  shopDocumentCount?: number;
  approvedShopDocumentCount?: number;
  registeredCategories?: Array<{
    categoryId?: string;
    categoryName?: string;
    registrationStatus?: string;
  }>;
  [key: string]: unknown;
};

type PaginatedPendingShopsRecord = {
  items?: PendingShopRecord[];
  total?: number;
  page?: number;
  pageSize?: number;
  [key: string]: unknown;
};

type VerificationSummaryRecord = {
  shopId?: string;
  shopStatus?: string;
  canOperate?: boolean;
  missingRequirements?: string[];
  approvedShopDocuments?: number;
  totalShopDocuments?: number;
  categories?: Array<{
    categoryId?: string;
    categoryName?: string;
    riskTier?: string;
    requiredVerification?: boolean;
    registrationStatus?: string;
    approvedDocumentCount?: number;
    documentCount?: number;
    reviewNote?: string | null;
  }>;
  [key: string]: unknown;
};

type ShopDocumentRecord = {
  id?: string;
  requirementId?: string | null;
  docType?: string;
  fileUrl?: string;
  files?: Array<{
    id?: string;
    fileUrl?: string;
    mediaAssetId?: string;
    sortOrder?: number;
  }>;
  reviewStatus?: string;
  reviewNote?: string | null;
  uploadedAt?: string;
  [key: string]: unknown;
};

type ShopDocumentRequirementRecord = {
  id?: string;
  code?: string;
  name?: string;
  description?: string | null;
  required?: boolean;
  multipleFilesAllowed?: boolean;
  document?: ShopDocumentRecord | null;
};

type CategoryDocumentRecord = {
  id?: string;
  categoryId?: string;
  categoryName?: string;
  documentType?: string;
  fileUrl?: string;
  reviewStatus?: string;
  reviewNote?: string | null;
  uploadedAt?: string;
  [key: string]: unknown;
};

type VerificationDetailRecord = {
  shop?: {
    id?: string;
    shopName?: string;
    registrationType?: string;
    businessType?: string;
    taxCode?: string | null;
    shopStatus?: string;
    shopType?: {
      id?: string;
      code?: string;
      name?: string;
      description?: string | null;
    } | null;
    registeredCategories?: Array<{
      categoryId?: string;
      categoryName?: string;
      registrationStatus?: string;
    }>;
  };
  summary?: VerificationSummaryRecord;
  shopDocumentRequirements?: ShopDocumentRequirementRecord[];
  shopDocuments?: ShopDocumentRecord[];
  categoryDocuments?: CategoryDocumentRecord[];
  [key: string]: unknown;
};

type BrandAuthorizationRecord = {
  id?: string;
  shopId?: string;
  shopName?: string | null;
  shopRegistrationType?: string | null;
  brandId?: string;
  brandName?: string | null;
  authorizationType?: string;
  fileUrl?: string | null;
  verificationStatus?: string;
  reviewNote?: string | null;
  createdAt?: string;
  verifiedAt?: string | null;
  [key: string]: unknown;
};

type AdminOpenDisputeRecord = {
  id?: string;
  orderId?: string;
  reason?: string;
  disputeStatus?: string;
  resolution?: string | null;
  assignedAdminUserId?: string | null;
  buyerUserId?: string;
  sellerShopId?: string;
  sellerShopName?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

type AdminDisputeDetailRecord = {
  dispute?: AdminOpenDisputeRecord;
  moderationCase?: {
    id?: string;
    caseStatus?: string;
    assignedAdminUserId?: string | null;
    internalNote?: string | null;
    [key: string]: unknown;
  } | null;
  order?: {
    id?: string;
    orderStatus?: string;
    paymentStatus?: string;
    totalAmount?: number | string;
    buyerPayableAmount?: number | string;
    sellerReceivableAmount?: number | string;
    [key: string]: unknown;
  } | null;
  evidence?: unknown[];
  timeline?: unknown[];
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

function adminStatusLabel(status?: string) {
  const value = String(status || '').toLowerCase();
  if (value === 'approved') {
    return 'Đã duyệt';
  }
  if (value === 'pending') {
    return 'Chờ duyệt';
  }
  if (value === 'rejected') {
    return 'Bị từ chối';
  }
  if (value === 'active') {
    return 'Đang hoạt động';
  }
  if (value === 'pending_verification') {
    return 'Chờ xác minh';
  }
  if (value === 'pending_kyc') {
    return 'Chờ KYC';
  }
  return status || 'Chưa có';
}

export function AdminPage() {
  const { session } = useAuth();
  const dashboard = useApiQuery('/admin/dashboard');
  const moderation = useApiQuery('/admin/moderation-summary');
  const openDisputes = useApiQuery('/orders/admin/disputes/open');
  const pendingShops = useApiQuery<PaginatedPendingShopsRecord>('/shops/admin/pending-verification');
  const pendingKyc = useApiQuery('/user/admin/kyc/pending');
  const brands = useApiQuery('/products/brands');
  const categories = useApiQuery('/products/categories');
  const productModels = useApiQuery('/products/models');

  const [brandForm, setBrandForm] = useState(initialBrandForm);
  const [categoryForm, setCategoryForm] = useState(initialCategoryForm);
  const [productModelForm, setProductModelForm] = useState(initialProductModelForm);
  const [brandMessage, setBrandMessage] = useState<string | null>(null);
  const [categoryMessage, setCategoryMessage] = useState<string | null>(null);
  const [productModelMessage, setProductModelMessage] = useState<string | null>(null);

  const [selectedPendingShopId, setSelectedPendingShopId] = useState('');
  const [reviewShopDocumentNote, setReviewShopDocumentNote] = useState('');
  const [reviewCategoryNote, setReviewCategoryNote] = useState('');
  const [brandAuthorizationStatus, setBrandAuthorizationStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [brandAuthorizationReviewNote, setBrandAuthorizationReviewNote] = useState('');
  const [brandAuthorizationMessage, setBrandAuthorizationMessage] = useState<string | null>(null);
  const [shopReviewMessage, setShopReviewMessage] = useState<string | null>(null);
  const [categoryReviewMessage, setCategoryReviewMessage] = useState<string | null>(null);
  const [selectedDisputeId, setSelectedDisputeId] = useState('');
  const [adminDisputeNote, setAdminDisputeNote] = useState('');
  const [adminDisputeCaseStatus, setAdminDisputeCaseStatus] = useState('IN_REVIEW');
  const [adminDisputeResolution, setAdminDisputeResolution] = useState('RESOLVED');
  const [adminDisputeMessage, setAdminDisputeMessage] = useState<string | null>(null);
  const [adminDisputeLoading, setAdminDisputeLoading] = useState(false);

  const brandList = useMemo(() => normalizeList<BrandRecord>(brands.data, ['items', 'data', 'brands']), [brands.data]);
  const categoryList = useMemo(
    () => normalizeList<CategoryRecord>(categories.data, ['items', 'data', 'categories']),
    [categories.data],
  );
  const productModelList = useMemo(
    () => normalizeList<ProductModelRecord>(productModels.data, ['items', 'data', 'models']),
    [productModels.data],
  );
  const pendingShopList = useMemo(
    () => normalizeList<PendingShopRecord>(pendingShops.data, ['items', 'data', 'shops']),
    [pendingShops.data],
  );
  const openDisputeList = useMemo(
    () => normalizeList<AdminOpenDisputeRecord>(openDisputes.data, ['items', 'data', 'disputes']),
    [openDisputes.data],
  );
  const selectedOpenDispute = useMemo(
    () => openDisputeList.find((dispute) => String(dispute.id || '') === selectedDisputeId) ?? null,
    [openDisputeList, selectedDisputeId],
  );
  const selectedPendingShop = useMemo(
    () => pendingShopList.find((shop) => String(shop.id || '') === selectedPendingShopId) ?? null,
    [pendingShopList, selectedPendingShopId],
  );
  const verificationDetail = useApiQuery<VerificationDetailRecord>(
    selectedPendingShopId ? `/shops/admin/${encodeURIComponent(selectedPendingShopId)}/verification-detail` : '',
    Boolean(selectedPendingShopId),
  );
  const adminDisputeDetail = useApiQuery<AdminDisputeDetailRecord>(
    selectedDisputeId ? `/orders/admin/disputes/${encodeURIComponent(selectedDisputeId)}` : '',
    Boolean(selectedDisputeId),
  );
  const brandAuthorizations = useApiQuery<BrandAuthorizationRecord[]>(
    `/shops/admin/brand-authorizations?verificationStatus=${encodeURIComponent(brandAuthorizationStatus)}`,
  );

  const detailShopDocuments = useMemo(
    () => normalizeList<ShopDocumentRecord>(verificationDetail.data?.shopDocuments, ['items', 'data', 'documents']),
    [verificationDetail.data?.shopDocuments],
  );
  const detailShopDocumentRequirements = useMemo(
    () =>
      normalizeList<ShopDocumentRequirementRecord>(verificationDetail.data?.shopDocumentRequirements, [
        'items',
        'data',
        'requirements',
      ]),
    [verificationDetail.data?.shopDocumentRequirements],
  );
  const detailCategoryDocuments = useMemo(
    () =>
      normalizeList<CategoryDocumentRecord>(verificationDetail.data?.categoryDocuments, ['items', 'data', 'documents']),
    [verificationDetail.data?.categoryDocuments],
  );
  const detailSummary = verificationDetail.data?.summary;
  const brandAuthorizationList = useMemo(
    () => normalizeList<BrandAuthorizationRecord>(brandAuthorizations.data, ['items', 'data', 'authorizations']),
    [brandAuthorizations.data],
  );

  useEffect(() => {
    if (!pendingShopList.length) {
      setSelectedPendingShopId('');
      return;
    }

    setSelectedPendingShopId((prev) =>
      pendingShopList.some((shop) => String(shop.id || '') === prev)
        ? prev
        : String(pendingShopList[0]?.id || ''),
    );
  }, [pendingShopList]);

  useEffect(() => {
    if (!openDisputeList.length) {
      setSelectedDisputeId('');
      return;
    }

    setSelectedDisputeId((prev) =>
      openDisputeList.some((dispute) => String(dispute.id || '') === prev)
        ? prev
        : String(openDisputeList[0]?.id || ''),
    );
  }, [openDisputeList]);

  async function handleCreateBrand(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const created = await apiRequest<BrandRecord>('/products/brands', {
        method: 'POST',
        accessToken: session?.accessToken,
        body: {
          name: brandForm.name,
          registryStatus: brandForm.registryStatus,
        },
      });

      setBrandMessage('Tạo brand thành công.');
      setBrandForm(initialBrandForm);
      if (created.id) {
        setProductModelForm((prev) => ({
          ...prev,
          brandId: String(created.id),
        }));
      }
      await brands.reload();
    } catch (error) {
      setBrandMessage(error instanceof Error ? error.message : 'Create brand failed');
    }
  }

  async function handleCreateCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      await apiRequest('/products/categories', {
        method: 'POST',
        accessToken: session?.accessToken,
        body: {
          name: categoryForm.name,
          parentId: categoryForm.parentId || null,
          riskTier: categoryForm.riskTier,
        },
      });

      setCategoryMessage('Tạo category thành công.');
      setCategoryForm(initialCategoryForm);
      await categories.reload();
    } catch (error) {
      setCategoryMessage(error instanceof Error ? error.message : 'Create category failed');
    }
  }

  async function handleCreateProductModel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      await apiRequest('/products/models', {
        method: 'POST',
        accessToken: session?.accessToken,
        body: {
          brandId: productModelForm.brandId,
          categoryId: productModelForm.categoryId,
          modelName: productModelForm.modelName,
          gtin: productModelForm.gtin || null,
          verificationPolicy: productModelForm.verificationPolicy,
          approvalStatus: productModelForm.approvalStatus,
        },
      });

      setProductModelMessage('Tạo product model thành công.');
      setProductModelForm((prev) => ({
        ...initialProductModelForm,
        brandId: prev.brandId,
      }));
      await productModels.reload();
    } catch (error) {
      setProductModelMessage(error instanceof Error ? error.message : 'Create product model failed');
    }
  }

  async function reviewShopDocument(shopId: string, documentId: string, reviewStatus: 'approved' | 'rejected') {
    try {
      setShopReviewMessage(null);
      await apiRequest(`/shops/${encodeURIComponent(shopId)}/documents/${encodeURIComponent(documentId)}/review`, {
        method: 'POST',
        accessToken: session?.accessToken,
        body: {
          reviewStatus,
          reviewNote: reviewShopDocumentNote || undefined,
        },
      });
      setShopReviewMessage(`Da ${reviewStatus} shop document.`);
      setReviewShopDocumentNote('');
      await Promise.all([pendingShops.reload(), verificationDetail.reload()]);
    } catch (error) {
      setShopReviewMessage(error instanceof Error ? error.message : 'Review shop document failed');
    }
  }

  async function reviewCategory(shopId: string, categoryId: string, registrationStatus: 'approved' | 'rejected') {
    try {
      setCategoryReviewMessage(null);
      await apiRequest(`/shops/${encodeURIComponent(shopId)}/categories/${encodeURIComponent(categoryId)}/review`, {
        method: 'POST',
        accessToken: session?.accessToken,
        body: {
          registrationStatus,
          reviewNote: reviewCategoryNote || undefined,
        },
      });
      setCategoryReviewMessage(`Da ${registrationStatus} category registration.`);
      setReviewCategoryNote('');
      await Promise.all([pendingShops.reload(), verificationDetail.reload()]);
    } catch (error) {
      setCategoryReviewMessage(error instanceof Error ? error.message : 'Review category failed');
    }
  }

  async function reviewBrandAuthorization(authorizationId: string, verificationStatus: 'approved' | 'rejected') {
    try {
      setBrandAuthorizationMessage(null);
      await apiRequest(`/shops/brand-authorizations/${encodeURIComponent(authorizationId)}/review`, {
        method: 'POST',
        accessToken: session?.accessToken,
        body: {
          verificationStatus,
          reviewNote: brandAuthorizationReviewNote || undefined,
        },
      });
      setBrandAuthorizationMessage(
        verificationStatus === 'approved' ? 'Đã duyệt hồ sơ ủy quyền thương hiệu.' : 'Đã từ chối hồ sơ ủy quyền thương hiệu.',
      );
      setBrandAuthorizationReviewNote('');
      await brandAuthorizations.reload();
    } catch (error) {
      setBrandAuthorizationMessage(error instanceof Error ? error.message : 'Review brand authorization failed');
    }
  }

  async function assignAdminDispute() {
    if (!selectedDisputeId) {
      setAdminDisputeMessage('Cần chọn dispute trước.');
      return;
    }

    try {
      setAdminDisputeLoading(true);
      setAdminDisputeMessage(null);
      await apiRequest(`/orders/admin/disputes/${encodeURIComponent(selectedDisputeId)}/assign`, {
        method: 'POST',
        accessToken: session?.accessToken,
        body: {
          internalNote: adminDisputeNote || undefined,
        },
      });
      setAdminDisputeMessage('Da assign dispute cho admin hien tai.');
      setAdminDisputeNote('');
      await Promise.all([openDisputes.reload(), adminDisputeDetail.reload()]);
    } catch (error) {
      setAdminDisputeMessage(error instanceof Error ? error.message : 'Assign dispute failed');
    } finally {
      setAdminDisputeLoading(false);
    }
  }

  async function updateAdminDisputeCase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedDisputeId) {
      setAdminDisputeMessage('Cần chọn dispute trước.');
      return;
    }

    try {
      setAdminDisputeLoading(true);
      setAdminDisputeMessage(null);
      await apiRequest(`/orders/admin/disputes/${encodeURIComponent(selectedDisputeId)}/case`, {
        method: 'POST',
        accessToken: session?.accessToken,
        body: {
          caseStatus: adminDisputeCaseStatus,
          internalNote: adminDisputeNote || undefined,
        },
      });
      setAdminDisputeMessage('Da cap nhat case status.');
      setAdminDisputeNote('');
      await Promise.all([openDisputes.reload(), adminDisputeDetail.reload()]);
    } catch (error) {
      setAdminDisputeMessage(error instanceof Error ? error.message : 'Update dispute case failed');
    } finally {
      setAdminDisputeLoading(false);
    }
  }

  async function resolveAdminDispute(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedDisputeId) {
      setAdminDisputeMessage('Cần chọn dispute trước.');
      return;
    }

    try {
      setAdminDisputeLoading(true);
      setAdminDisputeMessage(null);
      await apiRequest(`/orders/admin/disputes/${encodeURIComponent(selectedDisputeId)}/resolve`, {
        method: 'POST',
        accessToken: session?.accessToken,
        body: {
          resolution: adminDisputeResolution,
          internalNote: adminDisputeNote || undefined,
        },
      });
      setAdminDisputeMessage('Da resolve dispute bang quyen admin.');
      setAdminDisputeNote('');
      await Promise.all([openDisputes.reload(), adminDisputeDetail.reload()]);
    } catch (error) {
      setAdminDisputeMessage(error instanceof Error ? error.message : 'Resolve admin dispute failed');
    } finally {
      setAdminDisputeLoading(false);
    }
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <p className="eyebrow">Admin</p>
        <h1>Moderation va operations</h1>
      </header>

      <PageSection
        title="Duyệt ủy quyền thương hiệu"
        description="Admin kiểm tra giấy tờ chứng minh shop được phép bán hoặc sở hữu một thương hiệu cụ thể."
      >
        <div className="panel-form two-columns">
          <label>
            <span>Trạng thái hồ sơ</span>
            <select
              value={brandAuthorizationStatus}
              onChange={(event) =>
                setBrandAuthorizationStatus(event.target.value as 'pending' | 'approved' | 'rejected')
              }
            >
              <option value="pending">Chờ duyệt</option>
              <option value="approved">Đã duyệt</option>
              <option value="rejected">Đã từ chối</option>
            </select>
          </label>
          <label>
            <span>Ghi chú review</span>
            <input
              value={brandAuthorizationReviewNote}
              onChange={(event) => setBrandAuthorizationReviewNote(event.target.value)}
              placeholder="Nhập lý do duyệt hoặc từ chối"
            />
          </label>
        </div>

        {brandAuthorizationMessage ? <div className="empty-state">{brandAuthorizationMessage}</div> : null}

        {brandAuthorizations.loading ? (
          <div className="empty-state">Đang tải hồ sơ ủy quyền thương hiệu...</div>
        ) : brandAuthorizations.error ? (
          <div className="empty-state error">{brandAuthorizations.error}</div>
        ) : brandAuthorizationList.length ? (
          <div className="entity-grid">
            {brandAuthorizationList.map((authorization) => (
              <article key={String(authorization.id)} className="entity-card">
                <div className="entity-card-header">
                  <div>
                    <h3>{authorization.brandName || authorization.brandId || 'Thương hiệu'}</h3>
                    <p className="muted">
                      {authorization.shopName || authorization.shopId || '-'} | {authorization.shopRegistrationType || '-'}
                    </p>
                  </div>
                  <span className="tag highlight">{authorization.verificationStatus || '-'}</span>
                </div>
                <div className="tag-row">
                  <span className="tag">Loại: {authorization.authorizationType || '-'}</span>
                  <span className="tag">Tạo lúc: {authorization.createdAt || '-'}</span>
                  <span className="tag">Shop: {authorization.shopId || '-'}</span>
                </div>
                {authorization.reviewNote ? <p className="muted">{authorization.reviewNote}</p> : null}
                <div className="storefront-card-actions">
                  {authorization.fileUrl ? (
                    <a className="secondary-button link-button" href={authorization.fileUrl} target="_blank" rel="noreferrer">
                      Xem hồ sơ
                    </a>
                  ) : null}
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => void reviewBrandAuthorization(String(authorization.id || ''), 'approved')}
                  >
                    Duyệt
                  </button>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => void reviewBrandAuthorization(String(authorization.id || ''), 'rejected')}
                  >
                    Từ chối
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">Không có hồ sơ ủy quyền thương hiệu ở trạng thái này.</div>
        )}
      </PageSection>

      <PageSection
        title="Dispute moderation workspace"
        description="Admin xem chi tiet dispute, evidence, timeline, assign case va resolve khi can refund/ket thuc tranh chap."
      >
        {openDisputes.loading ? (
          <div className="empty-state">Đang tải dispute đang mở...</div>
        ) : openDisputes.error ? (
          <div className="empty-state error">{openDisputes.error}</div>
        ) : openDisputeList.length ? (
          <>
            <div className="entity-grid">
              {openDisputeList.map((dispute) => {
                const isSelected = String(dispute.id || '') === selectedDisputeId;
                return (
                  <article key={String(dispute.id)} className={isSelected ? 'entity-card active' : 'entity-card'}>
                    <div className="entity-card-header">
                      <div>
                        <h3>{dispute.reason || 'Dispute'}</h3>
                        <p className="muted">
                          Order {String(dispute.orderId || '-')} | Seller {dispute.sellerShopName || dispute.sellerShopId || '-'}
                        </p>
                      </div>
                      {isSelected ? <span className="tag highlight">Đang xem</span> : null}
                    </div>
                    <div className="tag-row">
                      <span className="tag">Status: {String(dispute.disputeStatus || '-')}</span>
                      <span className="tag">Assigned: {String(dispute.assignedAdminUserId || 'Unassigned')}</span>
                    </div>
                    <button className="secondary-button" type="button" onClick={() => setSelectedDisputeId(String(dispute.id || ''))}>
                      Xem dispute
                    </button>
                  </article>
                );
              })}
            </div>

            {selectedDisputeId ? (
              <div className="page-stack">
                {adminDisputeDetail.loading ? (
                  <div className="empty-state">Đang tải chi tiết dispute...</div>
                ) : adminDisputeDetail.error ? (
                  <div className="empty-state error">{adminDisputeDetail.error}</div>
                ) : adminDisputeDetail.data ? (
                  <>
                    <div className="context-grid">
                      <div className="context-card">
                        <p className="eyebrow">Dispute</p>
                        <strong>{adminDisputeDetail.data.dispute?.reason || selectedOpenDispute?.reason || '-'}</strong>
                        <p className="muted">
                          {adminDisputeDetail.data.dispute?.disputeStatus || selectedOpenDispute?.disputeStatus || '-'} | ID {selectedDisputeId}
                        </p>
                      </div>
                      <div className="context-card">
                        <p className="eyebrow">Moderation case</p>
                        <strong>{adminDisputeDetail.data.moderationCase?.caseStatus || 'Chưa có case'}</strong>
                        <p className="muted">
                          Assigned {adminDisputeDetail.data.moderationCase?.assignedAdminUserId || selectedOpenDispute?.assignedAdminUserId || 'Unassigned'}
                        </p>
                      </div>
                    </div>

                    <KeyValueList
                      items={[
                        { label: 'Order id', value: adminDisputeDetail.data.order?.id || adminDisputeDetail.data.dispute?.orderId },
                        { label: 'Order status', value: adminDisputeDetail.data.order?.orderStatus },
                        { label: 'Payment status', value: adminDisputeDetail.data.order?.paymentStatus },
                        { label: 'Buyer payable', value: adminDisputeDetail.data.order?.buyerPayableAmount || adminDisputeDetail.data.order?.totalAmount },
                        { label: 'Seller receivable', value: adminDisputeDetail.data.order?.sellerReceivableAmount },
                        { label: 'Resolution', value: adminDisputeDetail.data.dispute?.resolution },
                      ]}
                    />

                    <label>
                      <span>Internal note</span>
                      <textarea
                        value={adminDisputeNote}
                        onChange={(event) => setAdminDisputeNote(event.target.value)}
                        placeholder="Ghi chu noi bo cho assign/case/resolve"
                      />
                    </label>

                    <div className="storefront-card-actions">
                      <button
                        className="primary-button"
                        type="button"
                        disabled={adminDisputeLoading || !selectedDisputeId}
                        onClick={() => void assignAdminDispute()}
                      >
                        Assign cho toi
                      </button>
                    </div>

                    <form className="panel-form two-columns" onSubmit={updateAdminDisputeCase}>
                      <label>
                        <span>Case status</span>
                        <select
                          value={adminDisputeCaseStatus}
                          onChange={(event) => setAdminDisputeCaseStatus(event.target.value)}
                        >
                          <option value="ASSIGNED">ASSIGNED</option>
                          <option value="IN_REVIEW">IN_REVIEW</option>
                          <option value="ESCALATED">ESCALATED</option>
                          <option value="RESOLVED">RESOLVED</option>
                          <option value="CLOSED">CLOSED</option>
                        </select>
                      </label>
                      <button className="secondary-button" type="submit" disabled={adminDisputeLoading || !selectedDisputeId}>
                        Cap nhat case
                      </button>
                    </form>

                    <form className="panel-form two-columns" onSubmit={resolveAdminDispute}>
                      <label>
                        <span>Resolution</span>
                        <select
                          value={adminDisputeResolution}
                          onChange={(event) => setAdminDisputeResolution(event.target.value)}
                        >
                          <option value="RESOLVED">RESOLVED</option>
                          <option value="REFUNDED">REFUNDED</option>
                        </select>
                      </label>
                      <button className="secondary-button" type="submit" disabled={adminDisputeLoading || !selectedDisputeId}>
                        Admin resolve
                      </button>
                    </form>

                    {adminDisputeMessage ? <div className="empty-state">{adminDisputeMessage}</div> : null}

                    <div className="data-grid">
                      <ApiResult
                        title="Evidence"
                        loading={adminDisputeDetail.loading}
                        error={adminDisputeDetail.error}
                        data={adminDisputeDetail.data.evidence}
                      />
                      <ApiResult
                        title="Timeline"
                        loading={adminDisputeDetail.loading}
                        error={adminDisputeDetail.error}
                        data={adminDisputeDetail.data.timeline}
                      />
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}
          </>
        ) : (
          <ApiResult title="Open disputes" loading={openDisputes.loading} error={openDisputes.error} data={openDisputes.data} />
        )}
      </PageSection>

      <PageSection title="Duyệt xác minh shop" description="Kiểm tra checklist hồ sơ theo loại shop, duyệt giấy tờ và danh mục kinh doanh.">
        {pendingShops.loading ? (
          <div className="empty-state">Đang tải shop chờ duyệt...</div>
        ) : pendingShops.error ? (
          <div className="empty-state error">{pendingShops.error}</div>
        ) : pendingShopList.length ? (
          <>
            <div className="entity-grid">
              {pendingShopList.map((shop) => {
                const isSelected = String(shop.id || '') === selectedPendingShopId;
                return (
                  <article key={String(shop.id)} className={isSelected ? 'entity-card active' : 'entity-card'}>
                    <div className="entity-card-header">
                      <div>
                        <h3>{shop.shopName || 'Unnamed shop'}</h3>
                        <p className="muted">
                          {shop.ownerDisplayName || shop.ownerEmail || '-'} | {shop.registrationType || '-'}
                        </p>
                      </div>
                      {isSelected ? <span className="tag highlight">Đang xem</span> : null}
                    </div>
                    <div className="tag-row">
                      <span className="tag">Status: {String(shop.shopStatus || '-')}</span>
                      <span className="tag">
                        Shop docs: {String(shop.approvedShopDocumentCount ?? 0)} / {String(shop.shopDocumentCount ?? 0)}
                      </span>
                    </div>
                    <button className="secondary-button" type="button" onClick={() => setSelectedPendingShopId(String(shop.id || ''))}>
                      Xem verification
                    </button>
                  </article>
                );
              })}
            </div>

            {selectedPendingShopId ? (
              <div className="page-stack">
                {verificationDetail.loading ? (
                  <div className="empty-state">Đang tải chi tiết xác minh...</div>
                ) : verificationDetail.error ? (
                  <div className="empty-state error">{verificationDetail.error}</div>
                ) : verificationDetail.data ? (
                  <>
                    <div className="context-grid">
                      <div className="context-card">
                        <p className="eyebrow">Shop dang duyet</p>
                        <strong>{verificationDetail.data.shop?.shopName || selectedPendingShop?.shopName || '-'}</strong>
                        <p className="muted">
                          {verificationDetail.data.shop?.registrationType || '-'} | {verificationDetail.data.shop?.businessType || '-'}
                        </p>
                      </div>
                      <div className="context-card">
                        <p className="eyebrow">Missing requirements</p>
                        <strong>
                          {Array.isArray(detailSummary?.missingRequirements) && detailSummary?.missingRequirements.length
                            ? detailSummary.missingRequirements.length
                            : 0}
                        </strong>
                        <p className="muted">
                          {Array.isArray(detailSummary?.missingRequirements) && detailSummary?.missingRequirements.length
                            ? detailSummary.missingRequirements.join(', ')
                            : 'Không còn requirement nào'}
                        </p>
                      </div>
                    </div>

                    <div className="page-stack">
                      <label>
                        <span>Ghi chú duyệt hồ sơ shop</span>
                        <input
                          value={reviewShopDocumentNote}
                          onChange={(event) => setReviewShopDocumentNote(event.target.value)}
                          placeholder="Nhập lý do duyệt hoặc từ chối hồ sơ"
                        />
                      </label>
                      {shopReviewMessage ? <div className="empty-state">{shopReviewMessage}</div> : null}
                      {detailShopDocumentRequirements.length ? (
                        <div className="admin-requirement-grid">
                          {detailShopDocumentRequirements.map((requirement) => {
                            const document = requirement.document ?? null;
                            const files = document?.files?.length
                              ? document.files
                              : document?.fileUrl
                                ? [{ id: document.id, fileUrl: document.fileUrl }]
                                : [];
                            const isMissing = !document;

                            return (
                              <article
                                key={String(requirement.id || requirement.code)}
                                className={isMissing ? 'admin-requirement-card missing' : 'admin-requirement-card'}
                              >
                                <div className="entity-card-header">
                                  <div>
                                    <h3>
                                      {requirement.name || requirement.code || 'Hồ sơ'}
                                      {requirement.required ? ' *' : ''}
                                    </h3>
                                    <p className="muted">{requirement.description || 'Không có mô tả yêu cầu.'}</p>
                                  </div>
                                  <span className="tag highlight">
                                    {document ? adminStatusLabel(document.reviewStatus) : 'Chưa nộp'}
                                  </span>
                                </div>

                                {files.length ? (
                                  <div className="admin-document-files">
                                    {files.map((file, fileIndex) => (
                                      <a key={String(file.id || file.fileUrl)} href={file.fileUrl} target="_blank" rel="noreferrer">
                                        Ảnh {fileIndex + 1}
                                      </a>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="empty-state">Shop chưa nộp giấy tờ này.</div>
                                )}

                                {document?.reviewNote ? <p className="muted">{document.reviewNote}</p> : null}
                                {document ? (
                                  <div className="storefront-card-actions">
                                    <button
                                      className="primary-button"
                                      type="button"
                                      onClick={() =>
                                        void reviewShopDocument(selectedPendingShopId, String(document.id || ''), 'approved')
                                      }
                                    >
                                      Duyệt giấy tờ
                                    </button>
                                    <button
                                      className="secondary-button"
                                      type="button"
                                      onClick={() =>
                                        void reviewShopDocument(selectedPendingShopId, String(document.id || ''), 'rejected')
                                      }
                                    >
                                      Từ chối giấy tờ
                                    </button>
                                  </div>
                                ) : null}
                              </article>
                            );
                          })}
                        </div>
                      ) : detailShopDocuments.length ? (
                        <div className="admin-requirement-grid">
                          {detailShopDocuments.map((document) => (
                            <article key={String(document.id || document.fileUrl)} className="admin-requirement-card">
                              <div className="entity-card-header">
                                <div>
                                  <h3>{document.docType || 'Hồ sơ shop'}</h3>
                                  <p className="muted">{adminStatusLabel(document.reviewStatus)}</p>
                                </div>
                              </div>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <div className="empty-state">Shop này chưa nộp hồ sơ shop.</div>
                      )}
                    </div>

                    <div className="page-stack">
                      <label>
                        <span>Category review note</span>
                        <input
                          value={reviewCategoryNote}
                          onChange={(event) => setReviewCategoryNote(event.target.value)}
                          placeholder="Ly do approve/reject category"
                        />
                      </label>
                      {categoryReviewMessage ? <div className="empty-state">{categoryReviewMessage}</div> : null}
                      {Array.isArray(detailSummary?.categories) && detailSummary.categories.length ? (
                        <div className="entity-grid">
                          {detailSummary.categories.map((category) => {
                            const relatedDocuments = detailCategoryDocuments.filter(
                              (document) => String(document.categoryId || '') === String(category.categoryId || ''),
                            );

                            return (
                              <article key={String(category.categoryId || category.categoryName)} className="entity-card">
                                <div className="entity-card-header">
                                  <div>
                                    <h3>{category.categoryName || category.categoryId || 'Category'}</h3>
                                    <p className="muted">Risk {category.riskTier || '-'}</p>
                                  </div>
                                </div>
                                <div className="tag-row">
                                  <span className="tag">Registration: {String(category.registrationStatus || '-')}</span>
                                  <span className="tag">
                                    Docs: {String(category.approvedDocumentCount ?? 0)} / {String(category.documentCount ?? 0)}
                                  </span>
                                </div>
                                {category.reviewNote ? <p className="muted">{category.reviewNote}</p> : null}
                                {relatedDocuments.length ? (
                                  <div className="compact-list">
                                    {relatedDocuments.map((document) => (
                                      <div key={String(document.id || document.fileUrl)} className="compact-item">
                                        <strong>{document.documentType || 'CATEGORY_DOCUMENT'}</strong>
                                        <span className="muted">
                                          {document.reviewStatus || '-'} | {document.fileUrl || '-'}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="empty-state">Chưa có hồ sơ category.</div>
                                )}
                                <div className="storefront-card-actions">
                                  <button
                                    className="primary-button"
                                    type="button"
                                    onClick={() =>
                                      void reviewCategory(
                                        selectedPendingShopId,
                                        String(category.categoryId || ''),
                                        'approved',
                                      )
                                    }
                                  >
                                    Approve category
                                  </button>
                                  <button
                                    className="secondary-button"
                                    type="button"
                                    onClick={() =>
                                      void reviewCategory(
                                        selectedPendingShopId,
                                        String(category.categoryId || ''),
                                        'rejected',
                                      )
                                    }
                                  >
                                    Reject category
                                  </button>
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="empty-state">Không có category verification để duyệt.</div>
                      )}
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}
          </>
        ) : (
          <ApiResult title="Pending shops" loading={pendingShops.loading} error={pendingShops.error} data={pendingShops.data} />
        )}
      </PageSection>

      <PageSection title="Tạo brand" description="Tạo brand trước, sau đó dùng brand này để tạo product model.">
        <form className="panel-form two-columns" onSubmit={handleCreateBrand}>
          <label>
            <span>Brand name</span>
            <input
              value={brandForm.name}
              onChange={(event) => setBrandForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
          </label>
          <label>
            <span>Registry status</span>
            <input
              value={brandForm.registryStatus}
              onChange={(event) =>
                setBrandForm((prev) => ({ ...prev, registryStatus: event.target.value }))
              }
            />
          </label>
          {brandMessage ? <div className="empty-state full-width">{brandMessage}</div> : null}
          <button className="primary-button full-width" type="submit">
            Tạo brand
          </button>
        </form>
      </PageSection>

      <PageSection title="Danh sach brand">
        {brands.loading ? (
          <div className="empty-state">Đang tải brand...</div>
        ) : brands.error ? (
          <div className="empty-state error">{brands.error}</div>
        ) : brandList.length ? (
          <div className="entity-grid">
            {brandList.map((brand) => (
              <article key={String(brand.id)} className="entity-card">
                <div className="entity-card-header">
                  <div>
                    <h3>{brand.name || 'Unnamed brand'}</h3>
                    <p className="muted">Registry: {brand.registryStatus || '-'}</p>
                  </div>
                </div>
                <div className="tag-row">
                  <span className="tag">ID: {String(brand.id || '-')}</span>
                </div>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() =>
                    setProductModelForm((prev) => ({
                      ...prev,
                      brandId: String(brand.id || ''),
                    }))
                  }
                >
                  Dùng brand này
                </button>
              </article>
            ))}
          </div>
        ) : (
          <ApiResult title="Brands" loading={brands.loading} error={brands.error} data={brands.data} />
        )}
      </PageSection>

      <PageSection title="Tạo category" description="Thêm category để người bán không phải gõ categoryId bằng tay khi tạo offer.">
        <form className="panel-form two-columns" onSubmit={handleCreateCategory}>
          <label>
            <span>Category name</span>
            <input
              value={categoryForm.name}
              onChange={(event) =>
                setCategoryForm((prev) => ({ ...prev, name: event.target.value }))
              }
              required
            />
          </label>
          <label>
            <span>Risk tier</span>
            <input
              value={categoryForm.riskTier}
              onChange={(event) =>
                setCategoryForm((prev) => ({ ...prev, riskTier: event.target.value }))
              }
            />
          </label>
          <label className="full-width">
            <span>Parent category</span>
            <select
              value={categoryForm.parentId}
              onChange={(event) =>
                setCategoryForm((prev) => ({ ...prev, parentId: event.target.value }))
              }
            >
              <option value="">Không có</option>
              {categoryList.map((category) => (
                <option key={String(category.id)} value={String(category.id || '')}>
                  {category.name || category.id}
                </option>
              ))}
            </select>
          </label>
          {categoryMessage ? <div className="empty-state full-width">{categoryMessage}</div> : null}
          <button className="primary-button full-width" type="submit">
            Tạo category
          </button>
        </form>
      </PageSection>

      <PageSection title="Danh sach category">
        {categories.loading ? (
          <div className="empty-state">Đang tải category...</div>
        ) : categories.error ? (
          <div className="empty-state error">{categories.error}</div>
        ) : categoryList.length ? (
          <div className="entity-grid">
            {categoryList.map((category) => (
              <article key={String(category.id)} className="entity-card">
                <div className="entity-card-header">
                  <div>
                    <h3>{category.name || 'Unnamed category'}</h3>
                    <p className="muted">Risk tier: {category.riskTier || '-'}</p>
                  </div>
                </div>
                <div className="tag-row">
                  <span className="tag">ID: {String(category.id || '-')}</span>
                  <span className="tag">Parent: {String(category.parentId || '-')}</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <ApiResult
            title="Categories"
            loading={categories.loading}
            error={categories.error}
            data={categories.data}
          />
        )}
      </PageSection>

      <PageSection
        title="Tạo product model"
        description="Sau khi tao model o day, seller co the qua trang Products va dung model do de tao offer."
      >
        <form className="panel-form two-columns" onSubmit={handleCreateProductModel}>
          <label>
            <span>Brand</span>
            <select
              value={productModelForm.brandId}
              onChange={(event) =>
                setProductModelForm((prev) => ({ ...prev, brandId: event.target.value }))
              }
              required
            >
              <option value="">Chon brand</option>
              {brandList.map((brand) => (
                <option key={String(brand.id)} value={String(brand.id || '')}>
                  {brand.name || brand.id}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Category</span>
            <select
              value={productModelForm.categoryId}
              onChange={(event) =>
                setProductModelForm((prev) => ({ ...prev, categoryId: event.target.value }))
              }
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
            <span>Model name</span>
            <input
              value={productModelForm.modelName}
              onChange={(event) =>
                setProductModelForm((prev) => ({ ...prev, modelName: event.target.value }))
              }
              required
            />
          </label>
          <label>
            <span>GTIN</span>
            <input
              value={productModelForm.gtin}
              onChange={(event) =>
                setProductModelForm((prev) => ({ ...prev, gtin: event.target.value }))
              }
            />
          </label>
          <label>
            <span>Verification policy</span>
            <input
              value={productModelForm.verificationPolicy}
              onChange={(event) =>
                setProductModelForm((prev) => ({
                  ...prev,
                  verificationPolicy: event.target.value,
                }))
              }
            />
          </label>
          <label>
            <span>Approval status</span>
            <input
              value={productModelForm.approvalStatus}
              onChange={(event) =>
                setProductModelForm((prev) => ({
                  ...prev,
                  approvalStatus: event.target.value,
                }))
              }
            />
          </label>
          {productModelMessage ? <div className="empty-state full-width">{productModelMessage}</div> : null}
          <button className="primary-button full-width" type="submit">
            Tạo product model
          </button>
        </form>
      </PageSection>

      <PageSection title="Product models hien co">
        {productModels.loading ? (
          <div className="empty-state">Đang tải product model...</div>
        ) : productModels.error ? (
          <div className="empty-state error">{productModels.error}</div>
        ) : productModelList.length ? (
          <div className="entity-grid">
            {productModelList.map((model) => (
              <article key={String(model.id)} className="entity-card">
                <div className="entity-card-header">
                  <div>
                    <h3>{model.modelName || 'Unnamed model'}</h3>
                    <p className="muted">{model.brandName || 'Unknown brand'}</p>
                  </div>
                </div>
                <div className="tag-row">
                  <span className="tag">ID: {String(model.id || '-')}</span>
                  <span className="tag">Category: {String(model.categoryName || model.categoryId || '-')}</span>
                  <span className="tag">Policy: {String(model.verificationPolicy || '-')}</span>
                  <span className="tag">Status: {String(model.approvalStatus || '-')}</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <ApiResult
            title="Product models"
            loading={productModels.loading}
            error={productModels.error}
            data={productModels.data}
          />
        )}
      </PageSection>

      <PageSection title="Dashboard">
        <ApiResult title="Admin dashboard" loading={dashboard.loading} error={dashboard.error} data={dashboard.data} />
      </PageSection>

      <PageSection title="Moderation summary">
        <ApiResult
          title="Moderation summary"
          loading={moderation.loading}
          error={moderation.error}
          data={moderation.data}
        />
      </PageSection>

      <PageSection title="Pending KYC">
        <ApiResult title="Pending KYC" loading={pendingKyc.loading} error={pendingKyc.error} data={pendingKyc.data} />
      </PageSection>
    </div>
  );
}
