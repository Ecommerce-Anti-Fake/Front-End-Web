import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BreadcrumbNav } from '../components/breadcrumb-nav';
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

const shopDocumentTypeOptions = [
  {
    value: 'BUSINESS_LICENSE',
    label: 'Giấy phép kinh doanh',
    description: 'Dùng cho công ty, hộ kinh doanh, nhà sản xuất hoặc đại lý cần xác minh tư cách bán hàng.',
  },
  {
    value: 'TAX_REGISTRATION',
    label: 'Giấy đăng ký thuế',
    description: 'Dùng khi shop cần bổ sung mã số thuế hoặc thông tin pháp lý của đơn vị kinh doanh.',
  },
  {
    value: 'DISTRIBUTION_LICENSE',
    label: 'Giấy phép phân phối',
    description: 'Dùng cho đại lý hoặc đơn vị được phép phân phối hàng hóa trong phạm vi cụ thể.',
  },
  {
    value: 'OTHER',
    label: 'Giấy tờ khác',
    description: 'Dùng khi admin yêu cầu thêm giấy tờ ngoài các loại có sẵn.',
  },
];

type ShopDocumentDraft = {
  id: string;
  docType: string;
  required: boolean;
  locked: boolean;
  files: Array<{
    id: string;
    file: File;
    mimeType: string;
    fileUrl: string;
    publicId: string;
    uploading: boolean;
  }>;
};

function createShopDocumentDraft(
  docType = 'BUSINESS_LICENSE',
  options: { required?: boolean; locked?: boolean } = {},
): ShopDocumentDraft {
  return {
    id: `draft-${docType}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    docType,
    required: options.required ?? false,
    locked: options.locked ?? false,
    files: [],
  };
}

function createShopDocumentDraftFile(file: File) {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    file,
    mimeType: file.type || 'image/jpeg',
    fileUrl: '',
    publicId: '',
    uploading: false,
  };
}

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
  documents?: Array<{ side?: 'FRONT' | 'BACK' }>;
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
  shopStatus?: string;
  registrationType?: string;
  canOperate?: boolean;
  kycStatus?: string;
  requiresShopDocuments?: boolean;
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
  publicId?: string;
  folder?: string;
  uploadResourceType?: string;
  signature?: string;
  [key: string]: unknown;
};

type CloudinaryUploadResponse = {
  secure_url?: string;
  url?: string;
  public_id?: string;
  error?: {
    message?: string;
  };
};

type ShopDocumentRecord = {
  id?: string;
  docType?: string;
  fileUrl?: string;
  files?: Array<{ id?: string; fileUrl?: string; mediaAssetId?: string; sortOrder?: number }>;
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
  document?: {
    id?: string;
    reviewStatus?: string;
    reviewNote?: string | null;
    fileCount?: number;
  } | null;
};

type ShopDocumentRequirementsResponse = {
  shopType?: {
    id?: string;
    code?: string;
    name?: string;
    description?: string | null;
  } | null;
  requirements?: ShopDocumentRequirementRecord[];
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

type BrandRecord = {
  id?: string;
  name?: string;
  [key: string]: unknown;
};

type BrandAuthorizationRecord = {
  id?: string;
  brandId?: string;
  authorizationType?: string;
  fileUrl?: string | null;
  verificationStatus?: string;
  reviewNote?: string | null;
  publicId?: string | null;
  [key: string]: unknown;
};

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

function statusLabel(status?: string) {
  const value = String(status || '').toLowerCase();

  if (value === 'active' || value === 'approved') {
    return 'Đã duyệt';
  }
  if (value === 'pending_kyc') {
    return 'Chờ KYC';
  }
  if (value === 'pending_verification' || value === 'pending') {
    return 'Chờ xác minh';
  }
  if (value === 'rejected') {
    return 'Bị từ chối';
  }

  return status || 'Chưa có';
}

function registrationLabel(value?: string) {
  switch (value) {
    case 'MANUFACTURER':
      return 'Nhà sản xuất';
    case 'DISTRIBUTOR':
      return 'Đại lý';
    case 'HANDMADE':
      return 'Thủ công';
    case 'NORMAL':
      return 'Shop thường';
    default:
      return value || '-';
  }
}

function shopDocumentTypeLabel(value?: string) {
  return shopDocumentTypeOptions.find((option) => option.value === value)?.label || value || 'Hồ sơ shop';
}

function missingRequirementLabel(requirement: string) {
  if (requirement === 'KYC_APPROVAL_REQUIRED') {
    return 'Cần hoàn tất KYC cá nhân';
  }
  if (requirement === 'SHOP_DOCUMENT_APPROVAL_REQUIRED') {
    return 'Cần hồ sơ shop được duyệt';
  }
  if (requirement === 'CATEGORY_APPROVAL_REQUIRED') {
    return 'Cần giấy tờ cho danh mục rủi ro cao';
  }
  return requirement;
}

function brandAuthorizationTypeLabel(value?: string) {
  if (value === 'DISTRIBUTOR_AUTHORIZATION') {
    return 'Ủy quyền phân phối';
  }
  if (value === 'MANUFACTURER_OWNERSHIP') {
    return 'Chứng minh sở hữu thương hiệu';
  }
  return value || 'Ủy quyền thương hiệu';
}

function defaultBrandAuthorizationType(registrationType?: string) {
  if (registrationType === 'MANUFACTURER') {
    return 'MANUFACTURER_OWNERSHIP';
  }

  return 'DISTRIBUTOR_AUTHORIZATION';
}

function brandAuthorizationDescription(registrationType?: string) {
  if (registrationType === 'MANUFACTURER') {
    return 'Nhà sản xuất dùng mục này để chứng minh quyền sở hữu hoặc quyền sử dụng thương hiệu của mình.';
  }

  if (registrationType === 'DISTRIBUTOR') {
    return 'Đại lý dùng mục này để nộp giấy ủy quyền từ thương hiệu hoặc nhà sản xuất trước khi bán hàng.';
  }

  return 'Mục này dùng để chứng minh shop được phép bán sản phẩm của một thương hiệu cụ thể.';
}

export function ShopsPage() {
  const { session } = useAuth();
  const myShops = useApiQuery('/shops/mine');
  const categories = useApiQuery('/products/categories');
  const brands = useApiQuery('/products/brands');
  const kyc = useApiQuery<KycRecord | null>('/user/kyc');

  const [form, setForm] = useState(initialShopForm);
  const [message, setMessage] = useState<string | null>(null);
  const [activeShopId, setActiveShopId] = useState(() => window.localStorage.getItem(ACTIVE_SHOP_KEY) || '');
  const [shopDocumentDrafts, setShopDocumentDrafts] = useState<ShopDocumentDraft[]>(() => [
    createShopDocumentDraft(),
  ]);
  const [shopDocumentMessage, setShopDocumentMessage] = useState<string | null>(null);
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
  const [selectedBrandId, setSelectedBrandId] = useState('');
  const [brandAuthorizationType, setBrandAuthorizationType] = useState('DISTRIBUTOR_AUTHORIZATION');
  const [brandAuthorizationForm, setBrandAuthorizationForm] = useState({
    authorizationType: 'DISTRIBUTOR_AUTHORIZATION',
    mimeType: 'application/pdf',
    fileUrl: '',
    publicId: '',
  });
  const [brandAuthorizationMessage, setBrandAuthorizationMessage] = useState<string | null>(null);
  const [brandSignatureResult, setBrandSignatureResult] = useState<UploadSignatureRecord[] | null>(null);

  const shopList = useMemo(() => normalizeItems<ShopRecord>(myShops.data, ['items', 'data', 'shops']), [myShops.data]);
  const categoryList = useMemo(
    () => normalizeItems<CategoryRecord>(categories.data, ['items', 'data', 'categories']),
    [categories.data],
  );
  const brandList = useMemo(
    () => normalizeItems<BrandRecord>(brands.data, ['items', 'data', 'brands']),
    [brands.data],
  );
  const hasExistingShop = shopList.length > 0;
  const activeShop = shopList.find((shop) => shop.id === activeShopId) ?? shopList[0] ?? null;
  const effectiveShopId = String(activeShop?.id || activeShopId || '');
  const shouldShowBrandAuthorization =
    activeShop?.registrationType === 'MANUFACTURER' || activeShop?.registrationType === 'DISTRIBUTOR';
  const suggestedBrandAuthorizationType = defaultBrandAuthorizationType(activeShop?.registrationType);
  const uploadedShopDocumentFileCount = shopDocumentDrafts.reduce(
    (total, draft) => total + draft.files.filter((file) => file.fileUrl && file.publicId).length,
    0,
  );
  const totalShopDocumentFileCount = shopDocumentDrafts.reduce((total, draft) => total + draft.files.length, 0);
  const canSubmitShopDocuments = shopDocumentDrafts.every((draft) => {
    if (!draft.required && draft.files.length === 0) {
      return true;
    }

    return draft.files.length > 0 && draft.files.every((file) => file.fileUrl && file.publicId);
  });

  const verificationSummary = useApiQuery<ShopVerificationSummaryRecord>(
    effectiveShopId ? `/shops/${encodeURIComponent(effectiveShopId)}/verification-summary` : '',
    Boolean(effectiveShopId),
  );
  const shopDocuments = useApiQuery<ShopDocumentRecord[]>(
    effectiveShopId ? `/shops/${encodeURIComponent(effectiveShopId)}/documents` : '',
    Boolean(effectiveShopId),
  );
  const shopDocumentRequirements = useApiQuery<ShopDocumentRequirementsResponse>(
    effectiveShopId ? `/shops/${encodeURIComponent(effectiveShopId)}/document-requirements` : '',
    Boolean(effectiveShopId),
  );

  const selectedCategories = useMemo(
    () => categoryList.filter((category) => form.categoryIds.includes(String(category.id || ''))),
    [categoryList, form.categoryIds],
  );
  const regulatedCategories = useMemo(
    () => selectedCategories.filter((category) => String(category.riskTier || '').trim().toLowerCase() !== 'low'),
    [selectedCategories],
  );
  const hasApprovedKyc =
    String(kyc.data?.verificationStatus || '').toLowerCase() === 'approved' &&
    (kyc.data?.documents?.some((document) => document.side === 'FRONT') ?? false) &&
    (kyc.data?.documents?.some((document) => document.side === 'BACK') ?? false);
  const requiresShopDocuments = form.registrationType === 'MANUFACTURER' || form.registrationType === 'DISTRIBUTOR';
  const verificationCategories = Array.isArray(verificationSummary.data?.categories)
    ? verificationSummary.data.categories
    : [];
  const missingRequirements = Array.isArray(verificationSummary.data?.missingRequirements)
    ? verificationSummary.data.missingRequirements
    : [];
  const actionableCategories = verificationCategories.filter((category) => category.requiredVerification);
  const activeCategoryId = selectedCategoryId || String(actionableCategories[0]?.categoryId || '');
  const categoryDocuments = useApiQuery<CategoryDocumentRecord[]>(
    effectiveShopId && activeCategoryId
      ? `/shops/${encodeURIComponent(effectiveShopId)}/categories/${encodeURIComponent(activeCategoryId)}/documents`
      : '',
    Boolean(effectiveShopId && activeCategoryId),
  );
  const brandAuthorizations = useApiQuery<BrandAuthorizationRecord[]>(
    effectiveShopId ? `/shops/${encodeURIComponent(effectiveShopId)}/brand-authorizations` : '',
    Boolean(effectiveShopId),
  );
  const shopDocumentList = useMemo(
    () => normalizeItems<ShopDocumentRecord>(shopDocuments.data, ['items', 'data', 'documents']),
    [shopDocuments.data],
  );
  const shopRequirementOptions = useMemo(() => {
    const requirements = shopDocumentRequirements.data?.requirements ?? [];
    if (!requirements.length) {
      return shopDocumentTypeOptions;
    }

    return requirements.map((requirement) => ({
      value: String(requirement.code || ''),
      label: `${requirement.name || requirement.code || 'Hồ sơ'}${requirement.required ? ' *' : ''}`,
      description: requirement.description || 'Giấy tờ theo yêu cầu xác minh của loại shop này.',
    }));
  }, [shopDocumentRequirements.data]);
  const shopRequirementLabelByCode = useMemo(
    () => new Map(shopRequirementOptions.map((option) => [option.value, option.label.replace(/\s\*$/, '')])),
    [shopRequirementOptions],
  );
  const categoryDocumentList = useMemo(
    () => normalizeItems<CategoryDocumentRecord>(categoryDocuments.data, ['items', 'data', 'documents']),
    [categoryDocuments.data],
  );
  const brandAuthorizationList = useMemo(
    () => normalizeItems<BrandAuthorizationRecord>(brandAuthorizations.data, ['items', 'data', 'authorizations']),
    [brandAuthorizations.data],
  );
  const selectedBrand = useMemo(
    () => brandList.find((brand) => String(brand.id || '') === selectedBrandId) ?? null,
    [brandList, selectedBrandId],
  );
  const approvedBrandAuthorizationCount = useMemo(
    () =>
      brandAuthorizationList.filter(
        (authorization) => String(authorization.verificationStatus || '').toLowerCase() === 'approved',
      ).length,
    [brandAuthorizationList],
  );

  useEffect(() => {
    if (effectiveShopId) {
      window.localStorage.setItem(ACTIVE_SHOP_KEY, effectiveShopId);
      if (effectiveShopId !== activeShopId) {
        setActiveShopId(effectiveShopId);
      }
      return;
    }

    window.localStorage.removeItem(ACTIVE_SHOP_KEY);
  }, [activeShopId, effectiveShopId]);

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

  useEffect(() => {
    if (!brandList.length) {
      setSelectedBrandId('');
      return;
    }

    setSelectedBrandId((prev) =>
      brandList.some((brand) => String(brand.id || '') === prev)
        ? prev
        : String(brandList[0]?.id || ''),
    );
  }, [brandList]);

  useEffect(() => {
    if (!activeShop?.registrationType) {
      return;
    }

    if (activeShop.registrationType === 'MANUFACTURER') {
      setBrandAuthorizationType('MANUFACTURER_OWNERSHIP');
      setBrandAuthorizationForm((prev) => ({
        ...prev,
        authorizationType: 'MANUFACTURER_OWNERSHIP',
      }));
      return;
    }

    if (activeShop.registrationType === 'DISTRIBUTOR') {
      setBrandAuthorizationType('DISTRIBUTOR_AUTHORIZATION');
      setBrandAuthorizationForm((prev) => ({
        ...prev,
        authorizationType: 'DISTRIBUTOR_AUTHORIZATION',
      }));
    }
  }, [activeShop?.registrationType]);

  useEffect(() => {
    const requirements = shopDocumentRequirements.data?.requirements ?? [];
    if (!requirements.length) {
      return;
    }

    setShopDocumentDrafts((prev) => {
      const previousByDocType = new Map(prev.map((draft) => [draft.docType, draft]));
      const requirementDrafts = requirements.map((requirement) => {
        const docType = String(requirement.code || '');
        const previous = previousByDocType.get(docType);
        return {
          ...(previous ?? createShopDocumentDraft(docType)),
          docType,
          required: Boolean(requirement.required),
          locked: true,
        };
      });
      const extraDrafts = prev.filter((draft) => !requirements.some((requirement) => requirement.code === draft.docType));

      return [...requirementDrafts, ...extraDrafts];
    });
  }, [shopDocumentRequirements.data?.requirements]);

  async function handleCreateShop(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (hasExistingShop) {
      setMessage('Tài khoản này đã có shop. Mỗi tài khoản chỉ được tạo một shop.');
      return;
    }

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

      setMessage('Tạo shop thành công.');
      setForm(initialShopForm);
      await myShops.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Tạo shop thất bại.');
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

  function updateShopDocumentDraft(id: string, updater: (draft: ShopDocumentDraft) => ShopDocumentDraft) {
    setShopDocumentDrafts((prev) => prev.map((draft) => (draft.id === id ? updater(draft) : draft)));
  }

  function handleAddShopDocumentDraft() {
    setShopDocumentDrafts((prev) => [
      ...prev,
      createShopDocumentDraft(shopRequirementOptions[0]?.value, { required: false, locked: false }),
    ]);
    setShopDocumentMessage(null);
  }

  function handleRemoveShopDocumentDraft(id: string) {
    setShopDocumentDrafts((prev) => {
      const draft = prev.find((item) => item.id === id);
      if (draft?.locked && draft.required) {
        return prev;
      }

      const next = prev.filter((item) => item.id !== id);
      return next.length ? next : [createShopDocumentDraft(shopRequirementOptions[0]?.value)];
    });
    setShopDocumentMessage(null);
  }

  async function requestShopDocumentSignatures(docType: string) {
    if (!effectiveShopId) {
      throw new Error('Cần có shop trước khi nộp hồ sơ.');
    }

    const response = await apiRequest<UploadSignatureRecord[]>(
      `/shops/${encodeURIComponent(effectiveShopId)}/documents/upload-signatures`,
      {
        method: 'POST',
        accessToken: session?.accessToken,
        body: {
          items: [{ docType }],
        },
      },
    );

    return response;
  }

  async function uploadShopDocumentImage(file: File, signature: UploadSignatureRecord) {
    if (!signature.cloudName || !signature.apiKey || !signature.timestamp || !signature.folder || !signature.publicId || !signature.signature) {
      throw new Error('Thông tin upload chưa đầy đủ. Hãy bấm chuẩn bị upload lại.');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', signature.apiKey);
    formData.append('timestamp', String(signature.timestamp));
    formData.append('folder', signature.folder);
    formData.append('public_id', signature.publicId);
    formData.append('signature', signature.signature);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${signature.cloudName}/${signature.uploadResourceType || 'image'}/upload`,
      {
        method: 'POST',
        body: formData,
      },
    );
    const payload = (await response.json()) as CloudinaryUploadResponse;

    if (!response.ok) {
      throw new Error(payload.error?.message || 'Upload giấy tờ shop thất bại.');
    }

    return {
      fileUrl: String(payload.secure_url || payload.url || ''),
      publicId: String(payload.public_id || signature.publicId),
    };
  }

  async function handleUploadShopDocumentFile(draftId: string) {
    if (!effectiveShopId) {
      setShopDocumentMessage('Cần có shop trước khi upload hồ sơ.');
      return;
    }

    const draft = shopDocumentDrafts.find((item) => item.id === draftId);
    const pendingFiles = draft?.files.filter((file) => !file.fileUrl || !file.publicId) ?? [];

    if (!draft || !draft.files.length) {
      setShopDocumentMessage('Vui lòng chọn ít nhất một ảnh cho giấy tờ này trước khi upload.');
      return;
    }

    if (!pendingFiles.length) {
      setShopDocumentMessage('Tất cả ảnh của giấy tờ này đã upload.');
      return;
    }

    try {
      const pendingFileIds = new Set(pendingFiles.map((file) => file.id));
      updateShopDocumentDraft(draftId, (item) => ({
        ...item,
        files: item.files.map((file) => (pendingFileIds.has(file.id) ? { ...file, uploading: true } : file)),
      }));
      setShopDocumentMessage('Đang upload ảnh giấy tờ...');
      const signatures = await apiRequest<UploadSignatureRecord[]>(
        `/shops/${encodeURIComponent(effectiveShopId)}/documents/upload-signatures`,
        {
          method: 'POST',
          accessToken: session?.accessToken,
          body: {
            items: pendingFiles.map(() => ({ docType: draft.docType })),
          },
        },
      );

      if (signatures.length !== pendingFiles.length) {
        throw new Error('Không lấy được thông tin upload. Hãy thử lại.');
      }

      const uploadedFiles = await Promise.all(
        pendingFiles.map(async (file, index) => ({
          id: file.id,
          ...(await uploadShopDocumentImage(file.file, signatures[index])),
        })),
      );
      const uploadedById = new Map(uploadedFiles.map((file) => [file.id, file]));

      updateShopDocumentDraft(draftId, (item) => ({
        ...item,
        files: item.files.map((file) => {
          const uploaded = uploadedById.get(file.id);
          return uploaded
            ? {
                ...file,
                fileUrl: uploaded.fileUrl,
                publicId: uploaded.publicId,
                uploading: false,
              }
            : file;
        }),
      }));
      setShopDocumentMessage('Upload ảnh giấy tờ thành công. Bạn có thể upload thêm giấy tờ khác hoặc nộp tất cả hồ sơ.');
    } catch (error) {
      updateShopDocumentDraft(draftId, (item) => ({
        ...item,
        files: item.files.map((file) => ({ ...file, uploading: false })),
      }));
      setShopDocumentMessage(error instanceof Error ? error.message : 'Upload giấy tờ shop thất bại.');
    }
  }

  async function handleSubmitShopDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!effectiveShopId) {
      setShopDocumentMessage('Cần có shop trước khi nộp hồ sơ.');
      return;
    }

    if (!canSubmitShopDocuments) {
      setShopDocumentMessage('Vui lòng upload đủ ảnh cho các giấy tờ bắt buộc trước khi nộp hồ sơ.');
      return;
    }

    try {
      await apiRequest(`/shops/${encodeURIComponent(effectiveShopId)}/documents`, {
        method: 'POST',
        accessToken: session?.accessToken,
        body: {
          items: shopDocumentDrafts.flatMap((draft) =>
            draft.files.map((file) => ({
              docType: draft.docType,
              mimeType: file.mimeType,
              fileUrl: file.fileUrl,
              publicId: file.publicId,
            })),
          ),
        },
      });
      setShopDocumentMessage('Nộp hồ sơ shop thành công. Hồ sơ đang chờ admin duyệt.');
      setShopDocumentDrafts([createShopDocumentDraft()]);
      await Promise.all([shopDocuments.reload(), verificationSummary.reload(), myShops.reload()]);
    } catch (error) {
      setShopDocumentMessage(error instanceof Error ? error.message : 'Nộp hồ sơ shop thất bại.');
    }
  }

  async function handleGetCategoryDocumentSignature(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!effectiveShopId || !activeCategoryId) {
      setCategoryDocumentMessage('Cần chọn danh mục cần xác minh trước.');
      return;
    }

    try {
      const response = await apiRequest<UploadSignatureRecord[]>(
        `/shops/${encodeURIComponent(effectiveShopId)}/categories/${encodeURIComponent(activeCategoryId)}/documents/upload-signatures`,
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
      setCategoryDocumentMessage('Đã lấy thông tin upload. Sau khi upload file, hãy dán File URL và Public ID bên dưới.');
    } catch (error) {
      setCategoryDocumentMessage(error instanceof Error ? error.message : 'Lấy thông tin upload hồ sơ danh mục thất bại.');
    }
  }

  async function handleSubmitCategoryDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!effectiveShopId || !activeCategoryId) {
      setCategoryDocumentMessage('Cần chọn danh mục cần xác minh trước.');
      return;
    }

    try {
      await apiRequest(
        `/shops/${encodeURIComponent(effectiveShopId)}/categories/${encodeURIComponent(activeCategoryId)}/documents`,
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
      setCategoryDocumentMessage('Nộp hồ sơ danh mục thành công. Hồ sơ đang chờ admin duyệt.');
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
      setCategoryDocumentMessage(error instanceof Error ? error.message : 'Nộp hồ sơ danh mục thất bại.');
    }
  }

  async function handleGetBrandAuthorizationSignature(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!effectiveShopId || !selectedBrandId) {
      setBrandAuthorizationMessage('Cần chọn thương hiệu trước khi nộp ủy quyền.');
      return;
    }

    try {
      const response = await apiRequest<UploadSignatureRecord[]>(
        `/shops/${encodeURIComponent(effectiveShopId)}/brands/${encodeURIComponent(selectedBrandId)}/authorization/upload-signatures`,
        {
          method: 'POST',
          accessToken: session?.accessToken,
        },
      );
      setBrandSignatureResult(response);
      setBrandAuthorizationForm((prev) => ({ ...prev, authorizationType: brandAuthorizationType }));
      setBrandAuthorizationMessage('Đã lấy thông tin upload. Sau khi upload file, hãy dán File URL và Public ID bên dưới.');
    } catch (error) {
      setBrandAuthorizationMessage(error instanceof Error ? error.message : 'Lấy thông tin upload ủy quyền thương hiệu thất bại.');
    }
  }

  async function handleSubmitBrandAuthorization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!effectiveShopId || !selectedBrandId) {
      setBrandAuthorizationMessage('Cần chọn thương hiệu trước khi nộp ủy quyền.');
      return;
    }

    try {
      await apiRequest(
        `/shops/${encodeURIComponent(effectiveShopId)}/brands/${encodeURIComponent(selectedBrandId)}/authorization`,
        {
          method: 'POST',
          accessToken: session?.accessToken,
          body: {
            authorizationType: brandAuthorizationForm.authorizationType,
            mimeType: brandAuthorizationForm.mimeType,
            fileUrl: brandAuthorizationForm.fileUrl,
            publicId: brandAuthorizationForm.publicId,
          },
        },
      );
      setBrandAuthorizationMessage('Đã nộp hồ sơ ủy quyền thương hiệu. Hồ sơ đang chờ admin duyệt.');
      setBrandAuthorizationForm({
        authorizationType: brandAuthorizationType,
        mimeType: 'application/pdf',
        fileUrl: '',
        publicId: '',
      });
      await brandAuthorizations.reload();
    } catch (error) {
      setBrandAuthorizationMessage(error instanceof Error ? error.message : 'Nộp ủy quyền thương hiệu thất bại.');
    }
  }

  return (
    <div className="shop-page">
      <BreadcrumbNav
        items={[
          { label: 'Trang chủ', to: '/' },
          { label: 'Tài khoản của tôi', to: '/user' },
          { label: 'Cửa hàng của tôi' },
        ]}
      />

      <section className="shop-hero-panel">
        <div>
          <span className="section-kicker">Cửa hàng của tôi</span>
          <h1>{activeShop?.shopName || 'Mở cửa hàng trên AntiFake'}</h1>
          <p>
            Quản lý hồ sơ shop, điều kiện KYC, danh mục kinh doanh và giấy tờ xác minh để shop đủ điều kiện bán hàng.
          </p>
        </div>
        <div className="shop-hero-status">
          <span>Trạng thái</span>
          <strong>{statusLabel(activeShop?.shopStatus || verificationSummary.data?.shopStatus)}</strong>
          <small>{activeShop ? registrationLabel(activeShop.registrationType) : 'Chưa có shop'}</small>
        </div>
      </section>

      {myShops.loading ? <div className="empty-state">Đang tải thông tin shop...</div> : null}
      {myShops.error ? <div className="empty-state error">{myShops.error}</div> : null}

      {!activeShop ? (
        <section className="shop-onboarding-layout">
          <div className="shop-onboarding-card">
            <h2>Trước khi mở shop</h2>
            <div className="shop-checklist">
              <ChecklistItem done={hasApprovedKyc} title="Hoàn tất KYC cá nhân" helper="Cần ảnh CCCD mặt trước và mặt sau." />
              <ChecklistItem
                done={form.categoryIds.length > 0}
                title="Chọn danh mục kinh doanh"
                helper="Danh mục rủi ro cao sẽ cần thêm giấy tờ."
              />
              <ChecklistItem
                done={!requiresShopDocuments}
                title="Hồ sơ doanh nghiệp"
                helper="Nhà sản xuất hoặc đại lý cần giấy phép kinh doanh."
              />
            </div>
            {!hasApprovedKyc ? (
              <Link className="secondary-button link-button" to="/user">
                Bổ sung KYC
              </Link>
            ) : null}
          </div>

          <form className="shop-create-card" onSubmit={handleCreateShop}>
            <h2>Tạo cửa hàng</h2>
            <label>
              <span>Tên cửa hàng</span>
              <input
                value={form.shopName}
                onChange={(event) => setForm((prev) => ({ ...prev, shopName: event.target.value }))}
                placeholder="Ví dụ: AntiFake Foods"
                required
              />
            </label>
            <label>
              <span>Vai trò đăng ký</span>
              <select
                value={form.registrationType}
                onChange={(event) => setForm((prev) => ({ ...prev, registrationType: event.target.value }))}
              >
                <option value="NORMAL">Shop thường</option>
                <option value="HANDMADE">Sản phẩm thủ công</option>
                <option value="MANUFACTURER">Nhà sản xuất</option>
                <option value="DISTRIBUTOR">Đại lý</option>
              </select>
            </label>
            <label>
              <span>Loại hình kinh doanh</span>
              <input
                value={form.businessType}
                onChange={(event) => setForm((prev) => ({ ...prev, businessType: event.target.value }))}
                required
              />
            </label>
            <label>
              <span>Mã số thuế</span>
              <input
                value={form.taxCode}
                onChange={(event) => setForm((prev) => ({ ...prev, taxCode: event.target.value }))}
                placeholder="Không bắt buộc"
              />
            </label>

            <div className="shop-category-picker">
              <span>Danh mục đăng ký</span>
              {categories.loading ? (
                <div className="empty-state">Đang tải danh mục...</div>
              ) : categories.error ? (
                <div className="empty-state error">{categories.error}</div>
              ) : categoryList.length ? (
                <div className="shop-category-list">
                  {categoryList.map((category) => {
                    const categoryId = String(category.id || '');
                    const checked = form.categoryIds.includes(categoryId);

                    return (
                      <label key={categoryId} className={checked ? 'active' : ''}>
                        <input type="checkbox" checked={checked} onChange={() => toggleCategory(categoryId)} />
                        <span>{category.name || categoryId}</span>
                        <small>{String(category.riskTier || 'LOW')}</small>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state">Chưa có danh mục để đăng ký.</div>
              )}
            </div>

            {regulatedCategories.length ? (
              <div className="empty-state">
                Danh mục rủi ro cao đã chọn: {regulatedCategories.map((category) => category.name || category.id).join(', ')}.
                Sau khi tạo shop, bạn cần nộp giấy tờ cho các danh mục này.
              </div>
            ) : null}
            {message ? <div className="empty-state">{message}</div> : null}
            <button className="primary-button" type="submit" disabled={!form.categoryIds.length}>
              Gửi đăng ký mở shop
            </button>
          </form>
        </section>
      ) : (
        <div className="shop-dashboard-layout">
          <aside className="shop-side-panel">
            <div className="shop-avatar-card">
              <span>{String(activeShop.shopName || 'S').slice(0, 2).toUpperCase()}</span>
              <strong>{activeShop.shopName || 'Shop chưa đặt tên'}</strong>
              <small>{registrationLabel(activeShop.registrationType)}</small>
            </div>
            <a href="#tong-quan">Tổng quan</a>
            <a href="#xac-minh">Xác minh</a>
            <a href="#ho-so-shop">Hồ sơ shop</a>
            <a href="#ho-so-danh-muc">Hồ sơ danh mục</a>
            {shouldShowBrandAuthorization ? <a href="#uy-quyen-thuong-hieu">Ủy quyền thương hiệu</a> : null}
            <Link to="/distribution">Kênh phân phối</Link>
          </aside>

          <main className="shop-main-panel">
            <section id="tong-quan" className="shop-card">
              <div className="shop-card-header">
                <div>
                  <h2>Tổng quan cửa hàng</h2>
                  <p>Thông tin dùng cho các luồng bán hàng, offer và phân phối.</p>
                </div>
                <span className={`shop-status-pill ${verificationSummary.data?.canOperate ? 'success' : ''}`}>
                  {verificationSummary.data?.canOperate ? 'Được phép hoạt động' : statusLabel(activeShop.shopStatus)}
                </span>
              </div>
              <div className="shop-stat-grid">
                <Metric label="Loại shop" value={registrationLabel(activeShop.registrationType)} />
                <Metric label="Loại hình" value={activeShop.businessType || '-'} />
                <Metric label="Mã số thuế" value={activeShop.taxCode || 'Chưa cập nhật'} />
                <Metric label="Shop ID" value={String(activeShop.id || '-')} />
              </div>
            </section>

            <section id="xac-minh" className="shop-card">
              <div className="shop-card-header">
                <div>
                  <h2>Điều kiện xác minh</h2>
                  <p>Shop chỉ nên tạo offer khi các điều kiện chính đã đạt.</p>
                </div>
                <Link className="text-link" to="/user">
                  Cập nhật KYC
                </Link>
              </div>

              {verificationSummary.loading ? (
                <div className="empty-state">Đang tải trạng thái xác minh...</div>
              ) : (
                <div className="shop-checklist">
                  <ChecklistItem done={hasApprovedKyc} title="KYC cá nhân" helper={statusLabel(kyc.data?.verificationStatus)} />
                  <ChecklistItem
                    done={!verificationSummary.data?.requiresShopDocuments || Number(verificationSummary.data?.approvedShopDocuments || 0) > 0}
                    title="Hồ sơ shop"
                    helper={`${String(verificationSummary.data?.approvedShopDocuments ?? 0)} / ${String(
                      verificationSummary.data?.totalShopDocuments ?? 0,
                    )} hồ sơ đã duyệt`}
                  />
                  <ChecklistItem
                    done={!missingRequirements.includes('CATEGORY_APPROVAL_REQUIRED')}
                    title="Danh mục kinh doanh"
                    helper={
                      missingRequirements.includes('CATEGORY_APPROVAL_REQUIRED')
                        ? 'Còn danh mục cần nộp giấy tờ'
                        : 'Không còn yêu cầu danh mục'
                    }
                  />
                </div>
              )}

              {missingRequirements.length ? (
                <div className="shop-warning-list">
                  {missingRequirements.map((requirement) => (
                    <span key={requirement}>{missingRequirementLabel(requirement)}</span>
                  ))}
                </div>
              ) : (
                <div className="empty-state">Không còn điều kiện nào đang thiếu.</div>
              )}

              {verificationCategories.length ? (
                <div className="shop-category-status-grid">
                  {verificationCategories.map((category) => (
                    <article key={String(category.categoryId || category.categoryName)}>
                      <strong>{category.categoryName || category.categoryId || 'Danh mục'}</strong>
                      <span>{statusLabel(category.registrationStatus)}</span>
                      <small>
                        Hồ sơ: {String(category.approvedDocumentCount ?? 0)} / {String(category.documentCount ?? 0)}
                      </small>
                      {category.reviewNote ? <p>{category.reviewNote}</p> : null}
                    </article>
                  ))}
                </div>
              ) : null}
            </section>

            <section id="ho-so-shop" className="shop-card">
              <div className="shop-card-header">
                <div>
                  <h2>Hồ sơ shop</h2>
                  <p>Nộp giấy tờ pháp lý để admin xác minh shop trước khi bán hàng hoặc mở kênh phân phối.</p>
                </div>
              </div>

              <div className="shop-upload-flow">
                <div className="shop-upload-guide">
                  <div>
                    <h3>Cách nộp hồ sơ</h3>
                    <p>
                      {shopDocumentRequirements.data?.shopType?.name
                        ? `Shop loại ${shopDocumentRequirements.data.shopType.name} cần nộp các giấy tờ theo checklist bên dưới.`
                        : 'Mỗi dòng bên dưới là một loại giấy tờ. Một giấy tờ có thể có nhiều ảnh, ví dụ mặt trước, mặt sau hoặc nhiều trang.'}
                    </p>
                  </div>
                  <div className="shop-upload-note">
                    Các mục có dấu * là bắt buộc. Bạn chỉ cần upload đủ ảnh cho các mục bắt buộc trước khi nộp hồ sơ.
                  </div>
                </div>

                {shopDocumentRequirements.data?.requirements?.length ? (
                  <div className="shop-requirement-checklist">
                    {shopDocumentRequirements.data.requirements.map((requirement) => (
                      <article key={requirement.id || requirement.code}>
                        <strong>
                          {requirement.name || requirement.code}
                          {requirement.required ? ' *' : ''}
                        </strong>
                        <span>{requirement.document ? statusLabel(requirement.document.reviewStatus) : 'Chưa nộp'}</span>
                        <small>
                          {requirement.document?.fileCount
                            ? `${requirement.document.fileCount} ảnh đã nộp`
                            : requirement.description || 'Chưa có hồ sơ cho yêu cầu này'}
                        </small>
                      </article>
                    ))}
                  </div>
                ) : null}

                <form className="shop-upload-step" onSubmit={handleSubmitShopDocument}>
                  <div>
                    <h3>Giấy tờ cần nộp</h3>
                    <p>
                      “Upload ảnh” chỉ lưu file lên kho lưu trữ. Sau khi tất cả ảnh trong từng giấy tờ có trạng thái “Đã
                      upload”, bấm “Nộp tất cả hồ sơ” để gửi cho admin duyệt.
                    </p>
                    <div className="shop-document-draft-list">
                      {shopDocumentDrafts.map((draft, index) => {
                        const documentOption =
                          shopRequirementOptions.find((option) => option.value === draft.docType) ??
                          shopRequirementOptions[0];
                        const uploadedFileCount = draft.files.filter((file) => file.fileUrl && file.publicId).length;
                        const isDraftUploaded = draft.files.length > 0 && uploadedFileCount === draft.files.length;
                        const isDraftUploading = draft.files.some((file) => file.uploading);
                        const draftStatus = isDraftUploaded
                          ? 'Đã upload'
                          : draft.files.length
                            ? `Đã upload ${uploadedFileCount} / ${draft.files.length} ảnh`
                            : 'Chưa chọn ảnh';

                        return (
                          <article className="shop-document-draft" key={draft.id}>
                            <div className="shop-document-draft-header">
                              <div>
                                <strong>
                                  {shopRequirementLabelByCode.get(draft.docType) || `Giấy tờ ${index + 1}`}
                                  {draft.required ? ' *' : ''}
                                </strong>
                                <span className={isDraftUploaded ? 'shop-draft-status success' : 'shop-draft-status'}>
                                  {draftStatus}
                                </span>
                              </div>
                              {!draft.locked || !draft.required ? (
                                <button type="button" onClick={() => handleRemoveShopDocumentDraft(draft.id)}>
                                  Xóa dòng này
                                </button>
                              ) : null}
                            </div>
                            <label>
                              <span>Loại giấy tờ</span>
                              <select
                                value={draft.docType}
                                disabled={draft.locked}
                                onChange={(event) => {
                                  const docType = event.target.value;
                                  updateShopDocumentDraft(draft.id, (item) => ({
                                    ...item,
                                    docType,
                                    files: item.files.map((file) => ({ ...file, fileUrl: '', publicId: '' })),
                                  }));
                                  setShopDocumentMessage(null);
                                }}
                              >
                                {shopRequirementOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                              <small>{documentOption.description}</small>
                            </label>
                            <label className="shop-file-picker">
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={(event) => {
                                  const files = Array.from(event.target.files ?? []).map(createShopDocumentDraftFile);
                                  updateShopDocumentDraft(draft.id, (item) => ({
                                    ...item,
                                    files,
                                  }));
                                  setShopDocumentMessage(null);
                                }}
                              />
                              <span>Ảnh giấy tờ</span>
                              <strong>
                                {draft.files.length
                                  ? `${draft.files.length} ảnh đã chọn`
                                  : 'Chọn một hoặc nhiều ảnh cho giấy tờ này'}
                              </strong>
                              <small>Bắt buộc upload sau khi chọn ảnh. Hỗ trợ JPG, PNG hoặc WEBP.</small>
                            </label>
                            {draft.files.length ? (
                              <div className="shop-selected-file-list">
                                {draft.files.map((file) => (
                                  <span key={file.id}>
                                    {file.file.name}
                                    {file.fileUrl ? ' - đã upload' : ''}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                            <button
                              className="shop-upload-action"
                              type="button"
                              disabled={!draft.files.length || isDraftUploading || isDraftUploaded}
                              onClick={() => handleUploadShopDocumentFile(draft.id)}
                            >
                              {isDraftUploading ? 'Đang upload...' : isDraftUploaded ? 'Đã upload ảnh' : 'Upload ảnh'}
                            </button>
                            {isDraftUploaded ? (
                              <div className="shop-upload-hint success">
                                <strong>Đã upload {shopRequirementLabelByCode.get(draft.docType) || shopDocumentTypeLabel(draft.docType)}</strong>
                                <span>Giấy tờ này có {draft.files.length} ảnh và đã sẵn sàng để nộp duyệt.</span>
                                <div className="shop-uploaded-file-links">
                                  {draft.files.map((file, fileIndex) => (
                                    <a key={file.id} href={file.fileUrl} target="_blank" rel="noreferrer">
                                      Xem ảnh {fileIndex + 1}
                                    </a>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                          </article>
                        );
                      })}
                    </div>
                    <button className="secondary-button" type="button" onClick={handleAddShopDocumentDraft}>
                      Thêm giấy tờ khác
                    </button>
                    <div className="shop-upload-summary">
                      Đã upload {uploadedShopDocumentFileCount} / {totalShopDocumentFileCount} ảnh giấy tờ.
                    </div>
                    <div className="shop-document-form">
                      {shopDocumentMessage ? <div className="empty-state wide">{shopDocumentMessage}</div> : null}
                      <button className="primary-button wide" type="submit" disabled={!canSubmitShopDocuments || totalShopDocumentFileCount === 0}>
                        Nộp tất cả hồ sơ để admin duyệt
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              <DocumentList
                empty="Chưa có hồ sơ shop."
                items={shopDocumentList.map((document) => ({
                  id: document.id || document.fileUrl || '',
                  title: `${shopRequirementLabelByCode.get(String(document.docType || '')) || shopDocumentTypeLabel(document.docType)}${
                    document.files?.length ? ` (${document.files.length} ảnh)` : ''
                  }`,
                  status: document.reviewStatus,
                  fileUrl: document.fileUrl || document.files?.[0]?.fileUrl,
                  note: document.reviewNote,
                }))}
              />
            </section>

            <section id="ho-so-danh-muc" className="shop-card">
              <div className="shop-card-header">
                <div>
                  <h2>Hồ sơ danh mục rủi ro cao</h2>
                  <p>Nộp giấy tờ cho những danh mục đang cần xác minh bổ sung.</p>
                </div>
              </div>

              {!actionableCategories.length ? (
                <div className="empty-state">Shop này hiện không có danh mục nào cần xác minh bổ sung.</div>
              ) : (
                <>
                  <form className="shop-document-form" onSubmit={handleGetCategoryDocumentSignature}>
                    <label>
                      <span>Danh mục</span>
                      <select value={activeCategoryId} onChange={(event) => setSelectedCategoryId(event.target.value)} required>
                        {actionableCategories.map((category) => (
                          <option key={String(category.categoryId)} value={String(category.categoryId || '')}>
                            {category.categoryName || category.categoryId}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Loại tài liệu</span>
                      <input
                        value={categoryDocumentType}
                        onChange={(event) => setCategoryDocumentType(event.target.value)}
                        required
                      />
                    </label>
                    <button className="secondary-button wide" type="submit">
                      Lấy thông tin upload
                    </button>
                  </form>

                  {categorySignatureResult?.length ? (
                    <div className="shop-upload-hint">
                      <strong>Thông tin upload đã sẵn sàng</strong>
                      <span>
                        Public ID gợi ý: {categorySignatureResult.map((item) => item.publicId).filter(Boolean).join(', ')}
                      </span>
                    </div>
                  ) : null}

                  <form className="shop-document-form" onSubmit={handleSubmitCategoryDocument}>
                    <label>
                      <span>Loại tài liệu</span>
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
                    <label className="wide">
                      <span>File URL</span>
                      <input
                        value={categoryDocumentForm.fileUrl}
                        onChange={(event) =>
                          setCategoryDocumentForm((prev) => ({ ...prev, fileUrl: event.target.value }))
                        }
                        required
                      />
                    </label>
                    <label className="wide">
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
                      <span>Số tài liệu</span>
                      <input
                        value={categoryDocumentForm.documentNumber}
                        onChange={(event) =>
                          setCategoryDocumentForm((prev) => ({ ...prev, documentNumber: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      <span>Đơn vị cấp</span>
                      <input
                        value={categoryDocumentForm.issuedBy}
                        onChange={(event) =>
                          setCategoryDocumentForm((prev) => ({ ...prev, issuedBy: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      <span>Ngày cấp</span>
                      <input
                        type="date"
                        value={categoryDocumentForm.issuedAt}
                        onChange={(event) =>
                          setCategoryDocumentForm((prev) => ({ ...prev, issuedAt: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      <span>Ngày hết hạn</span>
                      <input
                        type="date"
                        value={categoryDocumentForm.expiresAt}
                        onChange={(event) =>
                          setCategoryDocumentForm((prev) => ({ ...prev, expiresAt: event.target.value }))
                        }
                      />
                    </label>
                    {categoryDocumentMessage ? <div className="empty-state wide">{categoryDocumentMessage}</div> : null}
                    <button className="primary-button wide" type="submit">
                      Nộp hồ sơ danh mục
                    </button>
                  </form>

                  <DocumentList
                    empty="Chưa có hồ sơ danh mục."
                    items={categoryDocumentList.map((document) => ({
                      id: document.id || document.fileUrl || '',
                      title: document.documentType || 'Hồ sơ danh mục',
                      status: document.reviewStatus,
                      fileUrl: document.fileUrl,
                      note: document.reviewNote,
                    }))}
                  />
                </>
              )}
            </section>

            <section id="uy-quyen-thuong-hieu" className="shop-card">
              <div className="shop-card-header">
                <div>
                  <h2>Ủy quyền thương hiệu</h2>
                  <p>{brandAuthorizationDescription(activeShop?.registrationType)}</p>
                </div>
              </div>

              {!shouldShowBrandAuthorization ? (
                <div className="empty-state">
                  Loại shop hiện tại không bắt buộc dùng luồng ủy quyền thương hiệu. Nếu sau này bạn chuyển sang nhà sản xuất hoặc đại lý, mục này sẽ được mở.
                </div>
              ) : !brandList.length ? (
                <div className="empty-state">Chưa có thương hiệu nào để chọn.</div>
              ) : (
                <>
                  <div className="shop-stat-grid">
                    <article className="shop-stat-card">
                      <span>Loại hồ sơ mặc định</span>
                      <strong>{brandAuthorizationTypeLabel(suggestedBrandAuthorizationType)}</strong>
                      <small>Được gợi ý theo vai trò shop hiện tại.</small>
                    </article>
                    <article className="shop-stat-card">
                      <span>Tổng hồ sơ đã nộp</span>
                      <strong>{brandAuthorizationList.length}</strong>
                      <small>Tất cả hồ sơ ủy quyền/thương hiệu của shop.</small>
                    </article>
                    <article className="shop-stat-card">
                      <span>Đã duyệt</span>
                      <strong>{approvedBrandAuthorizationCount}</strong>
                      <small>Hồ sơ đã được admin xác minh.</small>
                    </article>
                    <article className="shop-stat-card">
                      <span>Brand đang chọn</span>
                      <strong>{selectedBrand?.name || selectedBrandId || '-'}</strong>
                      <small>Thương hiệu áp dụng cho hồ sơ hiện tại.</small>
                    </article>
                  </div>

                  <form className="shop-document-form" onSubmit={handleGetBrandAuthorizationSignature}>
                    <label>
                      <span>Thương hiệu</span>
                      <select value={selectedBrandId} onChange={(event) => setSelectedBrandId(event.target.value)} required>
                        {brandList.map((brand) => (
                          <option key={String(brand.id)} value={String(brand.id || '')}>
                            {brand.name || brand.id}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Loại ủy quyền</span>
                      <select
                        value={brandAuthorizationType}
                        onChange={(event) => setBrandAuthorizationType(event.target.value)}
                        required
                      >
                        {activeShop?.registrationType === 'MANUFACTURER' ? (
                          <option value="MANUFACTURER_OWNERSHIP">Chứng minh sở hữu thương hiệu</option>
                        ) : null}
                        <option value="DISTRIBUTOR_AUTHORIZATION">Ủy quyền phân phối</option>
                      </select>
                    </label>
                    <button className="secondary-button wide" type="submit">
                      Lấy thông tin upload
                    </button>
                  </form>

                  {brandSignatureResult?.length ? (
                    <div className="shop-upload-hint">
                      <strong>Thông tin upload đã sẵn sàng</strong>
                      <span>
                        Public ID gợi ý: {brandSignatureResult.map((item) => item.publicId).filter(Boolean).join(', ')}
                      </span>
                    </div>
                  ) : null}

                  <form className="shop-document-form" onSubmit={handleSubmitBrandAuthorization}>
                    <label>
                      <span>Loại ủy quyền</span>
                      <select
                        value={brandAuthorizationForm.authorizationType}
                        onChange={(event) =>
                          setBrandAuthorizationForm((prev) => ({ ...prev, authorizationType: event.target.value }))
                        }
                        required
                      >
                        {activeShop?.registrationType === 'MANUFACTURER' ? (
                          <option value="MANUFACTURER_OWNERSHIP">Chứng minh sở hữu thương hiệu</option>
                        ) : null}
                        <option value="DISTRIBUTOR_AUTHORIZATION">Ủy quyền phân phối</option>
                      </select>
                    </label>
                    <label>
                      <span>Mime type</span>
                      <input
                        value={brandAuthorizationForm.mimeType}
                        onChange={(event) =>
                          setBrandAuthorizationForm((prev) => ({ ...prev, mimeType: event.target.value }))
                        }
                        required
                      />
                    </label>
                    <label className="wide">
                      <span>File URL</span>
                      <input
                        value={brandAuthorizationForm.fileUrl}
                        onChange={(event) =>
                          setBrandAuthorizationForm((prev) => ({ ...prev, fileUrl: event.target.value }))
                        }
                        required
                      />
                    </label>
                    <label className="wide">
                      <span>Public ID</span>
                      <input
                        value={brandAuthorizationForm.publicId}
                        onChange={(event) =>
                          setBrandAuthorizationForm((prev) => ({ ...prev, publicId: event.target.value }))
                        }
                        required
                      />
                    </label>
                    {brandAuthorizationMessage ? <div className="empty-state wide">{brandAuthorizationMessage}</div> : null}
                    <button className="primary-button wide" type="submit">
                      Nộp ủy quyền thương hiệu
                    </button>
                  </form>

                  <DocumentList
                    empty="Chưa có hồ sơ ủy quyền thương hiệu."
                    items={brandAuthorizationList.map((authorization) => ({
                      id: authorization.id || authorization.fileUrl || '',
                      title: `${brandAuthorizationTypeLabel(authorization.authorizationType)} ⬢ ${brandList.find((brand) => String(brand.id || '') === String(authorization.brandId || ''))?.name || authorization.brandId || '-'}`,
                      status: authorization.verificationStatus,
                      fileUrl: authorization.fileUrl || undefined,
                      note: authorization.reviewNote,
                    }))}
                  />
                </>
              )}
            </section>
          </main>
        </div>
      )}
    </div>
  );
}

function ChecklistItem({ done, title, helper }: { done: boolean; title: string; helper: string }) {
  return (
    <div className={done ? 'shop-check-item done' : 'shop-check-item'}>
      <span>{done ? '✓' : '!'}</span>
      <div>
        <strong>{title}</strong>
        <small>{helper}</small>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="shop-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DocumentList({
  empty,
  items,
}: {
  empty: string;
  items: Array<{ id: string; title: string; status?: string; fileUrl?: string; note?: string | null }>;
}) {
  if (!items.length) {
    return <div className="empty-state">{empty}</div>;
  }

  return (
    <div className="shop-document-list">
      {items.map((item) => (
        <article key={item.id || item.fileUrl}>
          <div>
            <strong>{item.title}</strong>
            <span>{statusLabel(item.status)}</span>
          </div>
          {item.fileUrl ? (
            <a href={item.fileUrl} target="_blank" rel="noreferrer">
              Xem file
            </a>
          ) : null}
          {item.note ? <p>{item.note}</p> : null}
        </article>
      ))}
    </div>
  );
}
