import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ApiResult } from '../components/api-result';
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
  docType?: string;
  fileUrl?: string;
  reviewStatus?: string;
  reviewNote?: string | null;
  uploadedAt?: string;
  [key: string]: unknown;
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
    registeredCategories?: Array<{
      categoryId?: string;
      categoryName?: string;
      registrationStatus?: string;
    }>;
  };
  summary?: VerificationSummaryRecord;
  shopDocuments?: ShopDocumentRecord[];
  categoryDocuments?: CategoryDocumentRecord[];
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
  const [shopReviewMessage, setShopReviewMessage] = useState<string | null>(null);
  const [categoryReviewMessage, setCategoryReviewMessage] = useState<string | null>(null);

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
  const selectedPendingShop = useMemo(
    () => pendingShopList.find((shop) => String(shop.id || '') === selectedPendingShopId) ?? null,
    [pendingShopList, selectedPendingShopId],
  );
  const verificationDetail = useApiQuery<VerificationDetailRecord>(
    selectedPendingShopId ? `/shops/admin/${encodeURIComponent(selectedPendingShopId)}/verification-detail` : '',
    Boolean(selectedPendingShopId),
  );

  const detailShopDocuments = useMemo(
    () => normalizeList<ShopDocumentRecord>(verificationDetail.data?.shopDocuments, ['items', 'data', 'documents']),
    [verificationDetail.data?.shopDocuments],
  );
  const detailCategoryDocuments = useMemo(
    () =>
      normalizeList<CategoryDocumentRecord>(verificationDetail.data?.categoryDocuments, ['items', 'data', 'documents']),
    [verificationDetail.data?.categoryDocuments],
  );
  const detailSummary = verificationDetail.data?.summary;

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

      setBrandMessage('Tao brand thanh cong.');
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

      setCategoryMessage('Tao category thanh cong.');
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

      setProductModelMessage('Tao product model thanh cong.');
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

  return (
    <div className="page-stack">
      <header className="page-header">
        <p className="eyebrow">Admin</p>
        <h1>Moderation va operations</h1>
      </header>

      <PageSection title="Shop moderation workspace" description="Duyet shop document va category verification ngay tai day.">
        {pendingShops.loading ? (
          <div className="empty-state">Dang tai pending shops...</div>
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
                      {isSelected ? <span className="tag highlight">Dang xem</span> : null}
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
                  <div className="empty-state">Dang tai verification detail...</div>
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
                            : 'Khong con requirement nao'}
                        </p>
                      </div>
                    </div>

                    <div className="page-stack">
                      <label>
                        <span>Shop document review note</span>
                        <input
                          value={reviewShopDocumentNote}
                          onChange={(event) => setReviewShopDocumentNote(event.target.value)}
                          placeholder="Ly do approve/reject cho shop document"
                        />
                      </label>
                      {shopReviewMessage ? <div className="empty-state">{shopReviewMessage}</div> : null}
                      {detailShopDocuments.length ? (
                        <div className="entity-grid">
                          {detailShopDocuments.map((document) => (
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
                              <div className="storefront-card-actions">
                                <button
                                  className="primary-button"
                                  type="button"
                                  onClick={() =>
                                    void reviewShopDocument(
                                      selectedPendingShopId,
                                      String(document.id || ''),
                                      'approved',
                                    )
                                  }
                                >
                                  Approve document
                                </button>
                                <button
                                  className="secondary-button"
                                  type="button"
                                  onClick={() =>
                                    void reviewShopDocument(
                                      selectedPendingShopId,
                                      String(document.id || ''),
                                      'rejected',
                                    )
                                  }
                                >
                                  Reject document
                                </button>
                              </div>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <div className="empty-state">Shop nay chua nop shop document.</div>
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
                                  <div className="empty-state">Chua co category document.</div>
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
                        <div className="empty-state">Khong co category verification de duyet.</div>
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

      <PageSection title="Tao brand" description="Tao brand truoc, sau do dung brand nay de tao product model.">
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
            Tao brand
          </button>
        </form>
      </PageSection>

      <PageSection title="Danh sach brand">
        {brands.loading ? (
          <div className="empty-state">Dang tai brands...</div>
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
                  Dung brand nay
                </button>
              </article>
            ))}
          </div>
        ) : (
          <ApiResult title="Brands" loading={brands.loading} error={brands.error} data={brands.data} />
        )}
      </PageSection>

      <PageSection title="Tao category" description="Them category de seller khong phai go categoryId bang tay khi tao offer.">
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
              <option value="">Khong co</option>
              {categoryList.map((category) => (
                <option key={String(category.id)} value={String(category.id || '')}>
                  {category.name || category.id}
                </option>
              ))}
            </select>
          </label>
          {categoryMessage ? <div className="empty-state full-width">{categoryMessage}</div> : null}
          <button className="primary-button full-width" type="submit">
            Tao category
          </button>
        </form>
      </PageSection>

      <PageSection title="Danh sach category">
        {categories.loading ? (
          <div className="empty-state">Dang tai categories...</div>
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
        title="Tao product model"
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
            Tao product model
          </button>
        </form>
      </PageSection>

      <PageSection title="Product models hien co">
        {productModels.loading ? (
          <div className="empty-state">Dang tai product models...</div>
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

      <PageSection title="Open disputes">
        <ApiResult
          title="Open disputes"
          loading={openDisputes.loading}
          error={openDisputes.error}
          data={openDisputes.data}
        />
      </PageSection>

      <PageSection title="Pending KYC">
        <ApiResult title="Pending KYC" loading={pendingKyc.loading} error={pendingKyc.error} data={pendingKyc.data} />
      </PageSection>
    </div>
  );
}
