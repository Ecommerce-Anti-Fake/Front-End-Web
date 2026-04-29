import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiResult } from '../components/api-result';
import { BreadcrumbNav } from '../components/breadcrumb-nav';
import { PageSection } from '../components/page-section';
import { useApiQuery } from '../hooks/use-api-query';
import { apiRequest } from '../lib/api-client';
import { useAuth } from '../modules/auth/auth-context';

const ACTIVE_SHOP_KEY = 'eaf-active-shop-id';
const ACTIVE_MODEL_KEY = 'eaf-active-model-id';
const ACTIVE_NETWORK_KEY = 'eaf-active-network-id';

const initialNetworkForm = {
  brandId: '',
  manufacturerShopId: '',
  networkName: '',
};

const initialBatchForm = {
  shopId: '',
  productModelId: '',
  distributionNodeId: '',
  batchNumber: '',
  quantity: 1,
  sourceName: '',
  countryOfOrigin: '',
  sourceType: 'manufacturer',
  receivedAt: '',
};

const initialPricingForm = {
  networkId: '',
  scope: 'NETWORK_DEFAULT',
  nodeId: '',
  appliesToLevel: '1',
  productModelId: '',
  categoryId: '',
  discountValue: 5,
  minQuantity: '',
  priority: 100,
  startsAt: '',
  endsAt: '',
};

const initialInviteForm = {
  networkId: '',
  shopId: '',
  parentNodeId: '',
};

const initialShipmentForm = {
  networkId: '',
  fromNodeId: '',
  toNodeId: '',
  shipmentCode: '',
  note: '',
  batchId: '',
  productModelId: '',
  quantity: 1,
  unitCost: '',
};

const initialBatchDocumentForm = {
  docType: 'INVOICE',
  mimeType: 'application/pdf',
  fileUrl: '',
  publicId: '',
  issuerName: '',
  documentNumber: '',
};

const initialNodeStatusForm = {
  nodeId: '',
  relationshipStatus: 'SUSPENDED',
};

type ProductModelRecord = {
  id?: string;
  modelName?: string;
  brandName?: string;
  categoryName?: string;
  categoryId?: string;
  [key: string]: unknown;
};

type CategoryRecord = {
  id?: string;
  categoryName?: string;
  [key: string]: unknown;
};

type BatchRecord = {
  id?: string;
  batchNumber?: string;
  shopId?: string;
  productModelId?: string;
  quantity?: number | string;
  quantityOnHand?: number | string;
  allocatedQuantity?: number | string;
  sourceName?: string;
  [key: string]: unknown;
};

type NetworkRecord = {
  id?: string;
  brandId?: string;
  manufacturerShopId?: string;
  networkName?: string;
  networkStatus?: string;
  maxAgentDepth?: number;
  [key: string]: unknown;
};

type NodeRecord = {
  id?: string;
  networkId?: string;
  shopId?: string;
  parentNodeId?: string | null;
  level?: number;
  nodeType?: string;
  relationshipStatus?: string;
  [key: string]: unknown;
};

type MembershipRecord = {
  nodeId?: string;
  networkId?: string;
  networkName?: string;
  manufacturerShopName?: string;
  manufacturerShopId?: string;
  shopId?: string;
  shopName?: string;
  level?: number;
  relationshipStatus?: string;
  [key: string]: unknown;
};

type PricingPolicyRecord = {
  id?: string;
  networkId?: string;
  scope?: string;
  nodeId?: string | null;
  appliesToLevel?: number | null;
  productModelId?: string | null;
  categoryId?: string | null;
  discountValue?: number | string;
  minQuantity?: number | null;
  priority?: number;
  startsAt?: string | null;
  endsAt?: string | null;
  [key: string]: unknown;
};

type ShipmentItemRecord = {
  id?: string;
  batchId?: string;
  productModelId?: string;
  quantity?: number | string;
  unitCost?: number | string | null;
};

type ShipmentRecord = {
  id?: string;
  networkId?: string;
  fromNodeId?: string;
  toNodeId?: string;
  shipmentCode?: string;
  shipmentStatus?: string;
  note?: string | null;
  shippedAt?: string | null;
  receivedAt?: string | null;
  createdAt?: string;
  items?: ShipmentItemRecord[];
};

type BatchDetailRecord = BatchRecord & {
  totalAllocatedQuantity?: number | string;
  totalConsumedQuantity?: number | string;
  availableForAllocation?: number | string;
  allocations?: Array<{
    offerId?: string;
    offerTitle?: string;
    allocatedQuantity?: number | string;
    consumedQuantity?: number | string;
    remainingAllocatedQuantity?: number | string;
  }>;
  consumptions?: Array<{
    orderId?: string;
    orderItemId?: string;
    quantity?: number | string;
    orderStatus?: string;
    createdAt?: string;
  }>;
  shipments?: Array<{
    shipmentId?: string;
    shipmentCode?: string;
    shipmentStatus?: string;
    quantity?: number | string;
    createdAt?: string;
  }>;
};

type BatchDocumentRecord = {
  id?: string;
  batchId?: string;
  docType?: string;
  fileUrl?: string;
  issuerName?: string | null;
  reviewStatus?: string;
  mimeType?: string | null;
  publicId?: string | null;
  uploadedAt?: string;
};

type BatchDocumentUploadSignatureRecord = {
  publicId?: string;
  folder?: string;
  uploadResourceType?: string;
};

type ShopVerificationSummaryRecord = {
  shopStatus?: string;
  canOperate?: boolean;
  missingRequirements?: string[];
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

function formatDistributionActionError(error: unknown) {
  const fallback = error instanceof Error ? error.message : 'Distribution action failed';
  const message = fallback.toLowerCase();

  if (message.includes('not active')) {
    return 'Shop chua active, nen khong the tao batch hoac thao tac distribution. Vao trang Shops de kiem tra verification.';
  }

  if (message.includes('manufacturer shop is invalid')) {
    return 'Chỉ shop nhà sản xuất đang active mới được tạo distribution network.';
  }

  if (message.includes('only manufacturer or distributor shops')) {
    return 'Chỉ shop nhà sản xuất hoặc đại lý đang active mới được tạo supply batch.';
  }

  return fallback;
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('vi-VN');
}

function shipmentStatusLabel(status?: string) {
  const value = String(status || '').toUpperCase();

  if (value === 'DRAFT') {
    return 'Bản nháp';
  }
  if (value === 'IN_TRANSIT') {
    return 'Đang vận chuyển';
  }
  if (value === 'RECEIVED') {
    return 'Đã nhận hàng';
  }
  if (value === 'CANCELLED') {
    return 'Đã hủy';
  }

  return status || '-';
}

function shipmentTimelineSteps(shipment: ShipmentRecord | null) {
  const status = String(shipment?.shipmentStatus || '').toUpperCase();

  return [
    {
      key: 'created',
      label: 'Đã tạo phiếu',
      helper: 'Phiếu chuyển hàng đã được ghi nhận trong network.',
      time: formatDateTime(shipment?.createdAt),
      done: Boolean(shipment?.id),
      active: status === 'DRAFT',
    },
    {
      key: 'dispatched',
      label: 'Đã xuất kho',
      helper: 'Hàng đã rời node gửi và đang chờ node nhận xác nhận.',
      time: formatDateTime(shipment?.shippedAt),
      done: Boolean(shipment?.shippedAt) || status === 'IN_TRANSIT' || status === 'RECEIVED',
      active: status === 'IN_TRANSIT',
    },
    {
      key: 'received',
      label: status === 'CANCELLED' ? 'Phiếu đã hủy' : 'Đã nhận hàng',
      helper: status === 'CANCELLED' ? 'Phiếu chuyển hàng không còn hiệu lực.' : 'Node nhận đã xác nhận nhận hàng.',
      time: formatDateTime(shipment?.receivedAt),
      done: status === 'RECEIVED' || status === 'CANCELLED',
      active: false,
    },
  ];
}

export function DistributionPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const { shipmentId: routeShipmentId } = useParams();
  const activeShopId = window.localStorage.getItem(ACTIVE_SHOP_KEY) || '';
  const activeModelId = window.localStorage.getItem(ACTIVE_MODEL_KEY) || '';
  const storedNetworkId = window.localStorage.getItem(ACTIVE_NETWORK_KEY) || '';
  const activeShopVerification = useApiQuery<ShopVerificationSummaryRecord>(
    activeShopId ? `/shops/${encodeURIComponent(activeShopId)}/verification-summary` : '',
    Boolean(activeShopId),
  );

  const batchQuery = activeShopId
    ? `/distribution/batches?shopId=${encodeURIComponent(activeShopId)}`
    : '/distribution/batches';

  const networks = useApiQuery('/distribution/networks');
  const memberships = useApiQuery('/distribution/my-memberships');
  const inventory = useApiQuery(
    activeShopId ? `/distribution/inventory-summary?shopId=${encodeURIComponent(activeShopId)}` : '/distribution/inventory-summary',
  );
  const productModels = useApiQuery('/products/models');
  const categories = useApiQuery('/products/categories');
  const batches = useApiQuery(batchQuery);

  const [selectedNetworkId, setSelectedNetworkId] = useState(storedNetworkId);
  const [networkForm, setNetworkForm] = useState(initialNetworkForm);
  const [batchForm, setBatchForm] = useState(() => ({
    ...initialBatchForm,
    shopId: activeShopId,
    productModelId: activeModelId,
  }));
  const [pricingForm, setPricingForm] = useState(() => ({
    ...initialPricingForm,
    networkId: storedNetworkId,
  }));
  const [inviteForm, setInviteForm] = useState(() => ({
    ...initialInviteForm,
    networkId: storedNetworkId,
  }));
  const [shipmentForm, setShipmentForm] = useState(() => ({
    ...initialShipmentForm,
    networkId: storedNetworkId,
    productModelId: activeModelId,
  }));
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [selectedShipmentId, setSelectedShipmentId] = useState(routeShipmentId || '');
  const [batchDocumentType, setBatchDocumentType] = useState('INVOICE');
  const [batchDocumentForm, setBatchDocumentForm] = useState(initialBatchDocumentForm);
  const [nodeStatusForm, setNodeStatusForm] = useState(initialNodeStatusForm);
  const [message, setMessage] = useState<string | null>(null);
  const [batchMessage, setBatchMessage] = useState<string | null>(null);
  const [pricingMessage, setPricingMessage] = useState<string | null>(null);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [shipmentMessage, setShipmentMessage] = useState<string | null>(null);
  const [batchDocumentMessage, setBatchDocumentMessage] = useState<string | null>(null);
  const [nodeStatusMessage, setNodeStatusMessage] = useState<string | null>(null);
  const [batchDocumentSignatures, setBatchDocumentSignatures] = useState<BatchDocumentUploadSignatureRecord[] | null>(null);

  const modelList = useMemo(
    () => normalizeList<ProductModelRecord>(productModels.data, ['items', 'data', 'models']),
    [productModels.data],
  );
  const categoryList = useMemo(
    () => normalizeList<CategoryRecord>(categories.data, ['items', 'data', 'categories']),
    [categories.data],
  );
  const batchList = useMemo(
    () => normalizeList<BatchRecord>(batches.data, ['items', 'data', 'batches']),
    [batches.data],
  );
  const networkList = useMemo(
    () => normalizeList<NetworkRecord>(networks.data, ['items', 'data', 'networks']),
    [networks.data],
  );
  const membershipList = useMemo(
    () => normalizeList<MembershipRecord>(memberships.data, ['items', 'data', 'memberships']),
    [memberships.data],
  );

  const nodesQuery = useApiQuery(
    selectedNetworkId ? `/distribution/networks/${encodeURIComponent(selectedNetworkId)}/nodes` : '',
    Boolean(selectedNetworkId),
  );
  const pricingPoliciesQuery = useApiQuery(
    selectedNetworkId ? `/distribution/networks/${encodeURIComponent(selectedNetworkId)}/pricing-policies` : '',
    Boolean(selectedNetworkId),
  );
  const invitations = useApiQuery('/distribution/my-invitations');
  const shipmentsQuery = useApiQuery(
    selectedNetworkId ? `/distribution/networks/${encodeURIComponent(selectedNetworkId)}/shipments` : '',
    Boolean(selectedNetworkId),
  );
  const shipmentDetailQuery = useApiQuery<ShipmentRecord>(
    routeShipmentId ? `/distribution/shipments/${encodeURIComponent(routeShipmentId)}` : '',
    Boolean(routeShipmentId),
  );
  const batchDetail = useApiQuery<BatchDetailRecord>(
    selectedBatchId ? `/distribution/batches/${encodeURIComponent(selectedBatchId)}` : '',
    Boolean(selectedBatchId),
  );
  const batchDocuments = useApiQuery<BatchDocumentRecord[]>(
    selectedBatchId ? `/distribution/batches/${encodeURIComponent(selectedBatchId)}/documents` : '',
    Boolean(selectedBatchId),
  );

  const nodeList = useMemo(
    () => normalizeList<NodeRecord>(nodesQuery.data, ['items', 'data', 'nodes']),
    [nodesQuery.data],
  );
  const pricingPolicyList = useMemo(
    () =>
      normalizeList<PricingPolicyRecord>(pricingPoliciesQuery.data, ['items', 'data', 'pricingPolicies']),
    [pricingPoliciesQuery.data],
  );
  const invitationList = useMemo(
    () => normalizeList<NodeRecord>(invitations.data, ['items', 'data', 'invitations']),
    [invitations.data],
  );
  const shipmentList = useMemo(
    () => normalizeList<ShipmentRecord>(shipmentsQuery.data, ['items', 'data', 'shipments']),
    [shipmentsQuery.data],
  );
  const batchDocumentList = useMemo(
    () => normalizeList<BatchDocumentRecord>(batchDocuments.data, ['items', 'data', 'documents']),
    [batchDocuments.data],
  );
  const selectedModel = useMemo(
    () => modelList.find((model) => String(model.id || '') === pricingForm.productModelId),
    [modelList, pricingForm.productModelId],
  );

  useEffect(() => {
    setBatchForm((prev) => ({
      ...prev,
      shopId: prev.shopId || activeShopId,
      productModelId: prev.productModelId || activeModelId,
    }));
  }, [activeShopId, activeModelId]);

  useEffect(() => {
    if (!networkList.length) {
      return;
    }

    const currentExists = networkList.some((network) => String(network.id || '') === selectedNetworkId);
    if (currentExists) {
      return;
    }

    const preferredNetwork =
      networkList.find((network) => String(network.manufacturerShopId || '') === activeShopId) ??
      networkList[0];

    const nextNetworkId = String(preferredNetwork.id || '');
    setSelectedNetworkId(nextNetworkId);
    window.localStorage.setItem(ACTIVE_NETWORK_KEY, nextNetworkId);
  }, [activeShopId, networkList, selectedNetworkId]);

  useEffect(() => {
    setPricingForm((prev) => ({
      ...prev,
      networkId: selectedNetworkId,
    }));
    setInviteForm((prev) => ({
      ...prev,
      networkId: selectedNetworkId,
    }));
    setShipmentForm((prev) => ({
      ...prev,
      networkId: selectedNetworkId,
    }));
  }, [selectedNetworkId]);

  useEffect(() => {
    if (!selectedModel?.categoryId) {
      return;
    }

    setPricingForm((prev) => ({
      ...prev,
      categoryId: prev.categoryId || String(selectedModel.categoryId),
    }));
  }, [selectedModel]);

  useEffect(() => {
    if (!batchList.length) {
      setSelectedBatchId('');
      return;
    }

    setSelectedBatchId((prev) =>
      batchList.some((batch) => String(batch.id || '') === prev)
        ? prev
        : String(batchList[0]?.id || ''),
    );
  }, [batchList]);

  useEffect(() => {
    if (!shipmentList.length) {
      setSelectedShipmentId('');
      return;
    }

    if (routeShipmentId && shipmentList.some((shipment) => String(shipment.id || '') === routeShipmentId)) {
      setSelectedShipmentId(routeShipmentId);
      return;
    }

    setSelectedShipmentId((prev) =>
      shipmentList.some((shipment) => String(shipment.id || '') === prev)
        ? prev
        : String(shipmentList[0]?.id || ''),
    );
  }, [routeShipmentId, shipmentList]);

  useEffect(() => {
    const manageableNode =
      nodeList.find((node) => Number(node.level ?? 0) > 0 && String(node.relationshipStatus || '').toUpperCase() !== 'TERMINATED') ??
      null;

    if (!manageableNode) {
      setNodeStatusForm(initialNodeStatusForm);
      return;
    }

    setNodeStatusForm((prev) => ({
      nodeId: prev.nodeId || String(manageableNode.id || ''),
      relationshipStatus: prev.relationshipStatus,
    }));
  }, [nodeList]);

  function handleSelectNetwork(networkId: string) {
    setSelectedNetworkId(networkId);
    window.localStorage.setItem(ACTIVE_NETWORK_KEY, networkId);
  }

  function handleSelectShipment(shipmentId: string) {
    setSelectedShipmentId(shipmentId);
    navigate(`/distribution/shipments/${encodeURIComponent(shipmentId)}`);
  }

  async function handleCreateNetwork(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const createdNetwork = await apiRequest<NetworkRecord>('/distribution/networks', {
        method: 'POST',
        accessToken: session?.accessToken,
        body: networkForm,
      });
      setMessage('Tạo distribution network thành công.');
      setNetworkForm(initialNetworkForm);
      await networks.reload();

      const nextNetworkId = String(createdNetwork.id || '');
      if (nextNetworkId) {
        handleSelectNetwork(nextNetworkId);
      }
    } catch (error) {
      setMessage(formatDistributionActionError(error));
    }
  }

  async function handleCreateBatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      await apiRequest('/distribution/batches', {
        method: 'POST',
        accessToken: session?.accessToken,
        body: {
          shopId: batchForm.shopId,
          productModelId: batchForm.productModelId,
          distributionNodeId: batchForm.distributionNodeId || null,
          batchNumber: batchForm.batchNumber,
          quantity: batchForm.quantity,
          sourceName: batchForm.sourceName,
          countryOfOrigin: batchForm.countryOfOrigin,
          sourceType: batchForm.sourceType,
          receivedAt: batchForm.receivedAt,
        },
      });
      setBatchMessage('Tạo supply batch thành công.');
      setBatchForm({
        ...initialBatchForm,
        shopId: activeShopId,
        productModelId: activeModelId,
      });
      await batches.reload();
      await inventory.reload();
    } catch (error) {
      setBatchMessage(formatDistributionActionError(error));
    }
  }

  async function handleCreatePricingPolicy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      await apiRequest('/distribution/pricing-policies', {
        method: 'POST',
        accessToken: session?.accessToken,
        body: {
          networkId: pricingForm.networkId,
          scope: pricingForm.scope,
          nodeId: pricingForm.scope === 'NODE_SPECIFIC' ? pricingForm.nodeId || undefined : undefined,
          appliesToLevel: pricingForm.scope === 'NODE_LEVEL' ? Number(pricingForm.appliesToLevel) : undefined,
          productModelId: pricingForm.productModelId || undefined,
          categoryId: pricingForm.categoryId || undefined,
          discountValue: Number(pricingForm.discountValue),
          minQuantity: pricingForm.minQuantity ? Number(pricingForm.minQuantity) : undefined,
          priority: Number(pricingForm.priority),
          startsAt: pricingForm.startsAt || undefined,
          endsAt: pricingForm.endsAt || undefined,
        },
      });

      setPricingMessage('Tạo pricing policy thành công.');
      setPricingForm({
        ...initialPricingForm,
        networkId: selectedNetworkId,
      });
      await pricingPoliciesQuery.reload();
    } catch (error) {
      setPricingMessage(formatDistributionActionError(error));
    }
  }

  async function handleInviteNode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      await apiRequest(`/distribution/networks/${encodeURIComponent(inviteForm.networkId)}/invitations`, {
        method: 'POST',
        accessToken: session?.accessToken,
        body: {
          shopId: inviteForm.shopId,
          parentNodeId: inviteForm.parentNodeId,
        },
      });
      setInviteMessage('Đã gửi lời mời đại lý tham gia network.');
      setInviteForm({
        ...initialInviteForm,
        networkId: selectedNetworkId,
      });
      await Promise.all([nodesQuery.reload(), invitations.reload()]);
    } catch (error) {
      setInviteMessage(formatDistributionActionError(error));
    }
  }

  async function handleInvitationAction(nodeId: string, action: 'accept-invitation' | 'decline-invitation') {
    try {
      await apiRequest(`/distribution/nodes/${encodeURIComponent(nodeId)}/${action}`, {
        method: 'POST',
        accessToken: session?.accessToken,
      });
      setInviteMessage(action === 'accept-invitation' ? 'Đã chấp nhận lời mời.' : 'Đã từ chối lời mời.');
      await Promise.all([invitations.reload(), memberships.reload(), nodesQuery.reload()]);
    } catch (error) {
      setInviteMessage(formatDistributionActionError(error));
    }
  }

  async function handleCreateShipment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      await apiRequest(`/distribution/networks/${encodeURIComponent(shipmentForm.networkId)}/shipments`, {
        method: 'POST',
        accessToken: session?.accessToken,
        body: {
          fromNodeId: shipmentForm.fromNodeId,
          toNodeId: shipmentForm.toNodeId,
          shipmentCode: shipmentForm.shipmentCode,
          note: shipmentForm.note || undefined,
          items: [
            {
              batchId: shipmentForm.batchId,
              productModelId: shipmentForm.productModelId,
              quantity: Number(shipmentForm.quantity),
              unitCost: shipmentForm.unitCost ? Number(shipmentForm.unitCost) : undefined,
            },
          ],
        },
      });
      setShipmentMessage('Đã tạo shipment mới.');
      setShipmentForm({
        ...initialShipmentForm,
        networkId: selectedNetworkId,
        productModelId: activeModelId,
      });
      await Promise.all([shipmentsQuery.reload(), batchDetail.reload(), batches.reload()]);
    } catch (error) {
      setShipmentMessage(formatDistributionActionError(error));
    }
  }

  async function handleShipmentAction(shipmentId: string, action: 'dispatch' | 'receive' | 'cancel') {
    try {
      await apiRequest(`/distribution/shipments/${encodeURIComponent(shipmentId)}/${action}`, {
        method: 'POST',
        accessToken: session?.accessToken,
      });
      setShipmentMessage(
        action === 'dispatch'
          ? 'Đã chuyển shipment sang trạng thái vận chuyển.'
          : action === 'receive'
            ? 'Đã xác nhận nhận shipment.'
            : 'Đã hủy shipment.',
      );
      await Promise.all([shipmentsQuery.reload(), batchDetail.reload(), batches.reload(), inventory.reload()]);
    } catch (error) {
      setShipmentMessage(formatDistributionActionError(error));
    }
  }

  async function handleGetBatchDocumentSignatures(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedBatchId) {
      setBatchDocumentMessage('Cần chọn batch trước khi nộp tài liệu.');
      return;
    }

    try {
      const response = await apiRequest<BatchDocumentUploadSignatureRecord[]>(
        `/distribution/batches/${encodeURIComponent(selectedBatchId)}/documents/upload-signatures`,
        {
          method: 'POST',
          accessToken: session?.accessToken,
          body: {
            items: [{ docType: batchDocumentType }],
          },
        },
      );
      setBatchDocumentSignatures(response);
      setBatchDocumentForm((prev) => ({ ...prev, docType: batchDocumentType }));
      setBatchDocumentMessage('Đã lấy thông tin upload tài liệu cho batch.');
    } catch (error) {
      setBatchDocumentMessage(formatDistributionActionError(error));
    }
  }

  async function handleSubmitBatchDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedBatchId) {
      setBatchDocumentMessage('Cần chọn batch trước khi nộp tài liệu.');
      return;
    }

    try {
      await apiRequest(`/distribution/batches/${encodeURIComponent(selectedBatchId)}/documents`, {
        method: 'POST',
        accessToken: session?.accessToken,
        body: {
          items: [
            {
              docType: batchDocumentForm.docType,
              mimeType: batchDocumentForm.mimeType,
              fileUrl: batchDocumentForm.fileUrl,
              publicId: batchDocumentForm.publicId,
              issuerName: batchDocumentForm.issuerName || undefined,
              documentNumber: batchDocumentForm.documentNumber || undefined,
            },
          ],
        },
      });
      setBatchDocumentMessage('Đã nộp tài liệu cho batch.');
      setBatchDocumentForm(initialBatchDocumentForm);
      await batchDocuments.reload();
    } catch (error) {
      setBatchDocumentMessage(formatDistributionActionError(error));
    }
  }

  async function handleUpdateNodeStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedNetworkId || !nodeStatusForm.nodeId) {
      setNodeStatusMessage('Cần chọn network và node trước khi cập nhật trạng thái.');
      return;
    }

    try {
      await apiRequest(
        `/distribution/networks/${encodeURIComponent(selectedNetworkId)}/nodes/${encodeURIComponent(nodeStatusForm.nodeId)}/status`,
        {
          method: 'POST',
          accessToken: session?.accessToken,
          body: {
            relationshipStatus: nodeStatusForm.relationshipStatus,
          },
        },
      );
      setNodeStatusMessage('Đã cập nhật trạng thái node.');
      await Promise.all([nodesQuery.reload(), memberships.reload()]);
    } catch (error) {
      setNodeStatusMessage(formatDistributionActionError(error));
    }
  }

  const selectedShipment =
    shipmentDetailQuery.data ??
    shipmentList.find((shipment) => String(shipment.id || '') === selectedShipmentId) ??
    shipmentList[0] ??
    null;
  const selectedShipmentSteps = shipmentTimelineSteps(selectedShipment);
  const selectedShipmentTotalQuantity = (selectedShipment?.items || []).reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0,
  );

  return (
    <div className="page-stack">
      <BreadcrumbNav
        items={[
          { label: 'Trang chủ', to: '/' },
          { label: 'Tài khoản của tôi', to: '/user' },
          { label: 'Cửa hàng của tôi', to: '/shops' },
          { label: 'Kênh phân phối', to: routeShipmentId ? '/distribution' : undefined },
          ...(routeShipmentId ? [{ label: `Phiếu #${String(routeShipmentId).slice(0, 8)}` }] : []),
        ]}
      />
      <section className="shop-hero-panel">
        <div>
          <span className="section-kicker">Kênh phân phối</span>
          <h1>Quản lý đại lý, lô hàng và phiếu chuyển hàng</h1>
          <p>
            Theo dõi network phân phối, node đại lý, chính sách giá bán sỉ, batch nguồn và shipment giữa các cấp đại lý.
          </p>
        </div>
        <div className="shop-hero-status">
          <span>Network đang chọn</span>
          <strong>{selectedNetworkId ? 'Đã chọn' : 'Chưa chọn'}</strong>
          <small>{networkList.find((network) => String(network.id || '') === selectedNetworkId)?.networkName || selectedNetworkId || 'Chọn network để thao tác'}</small>
        </div>
      </section>

      <PageSection title="Tổng quan vận hành">
        <div className="shop-stat-grid">
          <article className="shop-stat-card">
            <span>Shop đang thao tác</span>
            <strong>{activeShopId || 'Chưa chọn shop'}</strong>
            <small>Dùng shop hiện tại để tạo batch và xử lý phân phối.</small>
          </article>
          <article className="shop-stat-card">
            <span>Model đang chọn</span>
            <strong>{activeModelId || 'Chưa chọn model'}</strong>
            <small>Dùng khi tạo batch, shipment hoặc chính sách giá theo model.</small>
          </article>
          <article className="shop-stat-card">
            <span>Network đang chọn</span>
            <strong>{selectedNetworkId || 'Chưa chọn network'}</strong>
            <small>Network quyết định node, lời mời đại lý và shipment.</small>
          </article>
          <article className="shop-stat-card">
            <span>Phiếu chuyển hàng</span>
            <strong>{shipmentList.length}</strong>
            <small>Số shipment trong network đang chọn.</small>
          </article>
        </div>
        {activeShopId ? (
          activeShopVerification.loading ? (
            <div className="empty-state">Đang tải trạng thái xác minh của shop...</div>
          ) : activeShopVerification.data?.canOperate ? (
            <div className="empty-state">Shop đang hoạt động, có thể tiếp tục tạo batch và xử lý kênh phân phối.</div>
          ) : (
            <div className="empty-state error">
              Shop này chưa đủ điều kiện vận hành kênh phân phối.
              {Array.isArray(activeShopVerification.data?.missingRequirements) &&
              activeShopVerification.data?.missingRequirements.length
                ? ` Còn thiếu: ${activeShopVerification.data.missingRequirements.join(', ')}.`
                : ''}
              {' '}Vào trang <Link className="link-inline" to="/shops">Cửa hàng của tôi</Link> để xử lý xác minh trước.
            </div>
          )
        ) : null}
      </PageSection>

      <PageSection title="Mạng phân phối" description="Chọn network để quản lý node và chính sách giá.">
        {networkList.length ? (
          <div className="entity-grid">
            {networkList.map((network) => {
              const networkId = String(network.id || '');
              const isActive = networkId === selectedNetworkId;

              return (
                <article key={networkId} className="entity-card">
                  <div className="entity-card-header">
                    <div>
                      <h3>{network.networkName || networkId}</h3>
                      <p className="muted">
                        Nhà sản xuất {network.manufacturerShopId || '-'} | brand {network.brandId || '-'}
                      </p>
                    </div>
                    <button className="secondary-button" type="button" onClick={() => handleSelectNetwork(networkId)}>
                      {isActive ? 'Đang chọn' : 'Dùng network này'}
                    </button>
                  </div>
                  <div className="tag-row">
                    <span className="tag">Trạng thái: {String(network.networkStatus || '-')}</span>
                    <span className="tag">Tối đa cấp: {String(network.maxAgentDepth ?? '-')}</span>
                    <span className="tag">ID: {networkId}</span>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <ApiResult title="Networks" loading={networks.loading} error={networks.error} data={networks.data} />
        )}
      </PageSection>

      <PageSection title="Tạo mạng phân phối">
        <form className="panel-form" onSubmit={handleCreateNetwork}>
          <label>
            <span>Brand id</span>
            <input
              value={networkForm.brandId}
              onChange={(event) => setNetworkForm((prev) => ({ ...prev, brandId: event.target.value }))}
              required
            />
          </label>
          <label>
            <span>Manufacturer shop id</span>
            <input
              value={networkForm.manufacturerShopId}
              onChange={(event) =>
                setNetworkForm((prev) => ({ ...prev, manufacturerShopId: event.target.value }))
              }
              required
            />
          </label>
          <label>
            <span>Network name</span>
            <input
              value={networkForm.networkName}
              onChange={(event) =>
                setNetworkForm((prev) => ({ ...prev, networkName: event.target.value }))
              }
              required
            />
          </label>
          {message ? <div className="empty-state">{message}</div> : null}
          <button className="primary-button" type="submit">
            Tạo network
          </button>
        </form>
      </PageSection>

      <PageSection
        title="Lời mời đại lý"
        description="Mời shop khác tham gia network hoặc xử lý các lời mời mà shop hiện tại nhận được."
      >
        <form className="panel-form two-columns" onSubmit={handleInviteNode}>
          <label>
            <span>Network</span>
            <select
              value={inviteForm.networkId}
              onChange={(event) => setInviteForm((prev) => ({ ...prev, networkId: event.target.value }))}
              required
            >
              <option value="">Chọn network</option>
              {networkList.map((network) => (
                <option key={String(network.id)} value={String(network.id || '')}>
                  {network.networkName || network.id}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Shop được mời</span>
            <input
              value={inviteForm.shopId}
              onChange={(event) => setInviteForm((prev) => ({ ...prev, shopId: event.target.value }))}
              required
            />
          </label>
          <label className="full-width">
            <span>Parent node</span>
            <select
              value={inviteForm.parentNodeId}
              onChange={(event) => setInviteForm((prev) => ({ ...prev, parentNodeId: event.target.value }))}
              required
            >
              <option value="">Chọn node cha</option>
              {nodeList.map((node) => (
                <option key={String(node.id)} value={String(node.id || '')}>
                  {String(node.shopId || '-')} | level {String(node.level ?? '-')} | {String(node.relationshipStatus || '-')}
                </option>
              ))}
            </select>
          </label>
          {inviteMessage ? <div className="empty-state full-width">{inviteMessage}</div> : null}
          <button className="primary-button full-width" type="submit">
            Gửi lời mời
          </button>
        </form>

        {invitationList.length ? (
          <div className="entity-grid">
            {invitationList.map((invitation) => (
              <article key={String(invitation.id || invitation.nodeId)} className="entity-card">
                <div className="entity-card-header">
                  <div>
                    <h3>{String(invitation.shopId || invitation.id || '-')}</h3>
                    <p className="muted">
                      Network {String(invitation.networkId || '-')} | parent {String(invitation.parentNodeId || '-')}
                    </p>
                  </div>
                </div>
                <div className="tag-row">
                  <span className="tag">Level: {String(invitation.level ?? '-')}</span>
                  <span className="tag">Node type: {String(invitation.nodeType || '-')}</span>
                  <span className="tag">Status: {String(invitation.relationshipStatus || '-')}</span>
                </div>
                {String(invitation.relationshipStatus || '').toUpperCase() === 'INVITED' ? (
                  <div className="storefront-card-actions">
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => void handleInvitationAction(String(invitation.id || invitation.nodeId || ''), 'accept-invitation')}
                    >
                      Chấp nhận
                    </button>
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => void handleInvitationAction(String(invitation.id || invitation.nodeId || ''), 'decline-invitation')}
                    >
                      Từ chối
                    </button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <ApiResult title="Invitations" loading={invitations.loading} error={invitations.error} data={invitations.data} />
        )}
      </PageSection>

      <PageSection
        title="Chính sách giá sỉ"
        description="Chính sách này được áp khi người mua dùng distribution node cùng network."
      >
        <form className="panel-form two-columns" onSubmit={handleCreatePricingPolicy}>
          <label>
            <span>Network</span>
            <select
              value={pricingForm.networkId}
              onChange={(event) => handleSelectNetwork(event.target.value)}
              required
            >
              <option value="">Chon network</option>
              {networkList.map((network) => (
                <option key={String(network.id)} value={String(network.id || '')}>
                  {network.networkName || network.id}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Scope</span>
            <select
              value={pricingForm.scope}
              onChange={(event) =>
                setPricingForm((prev) => ({
                  ...prev,
                  scope: event.target.value,
                  nodeId: '',
                  appliesToLevel: '1',
                }))
              }
            >
              <option value="NETWORK_DEFAULT">NETWORK_DEFAULT</option>
              <option value="NODE_LEVEL">NODE_LEVEL</option>
              <option value="NODE_SPECIFIC">NODE_SPECIFIC</option>
            </select>
          </label>
          {pricingForm.scope === 'NODE_SPECIFIC' ? (
            <label>
              <span>Node</span>
              <select
                value={pricingForm.nodeId}
                onChange={(event) => setPricingForm((prev) => ({ ...prev, nodeId: event.target.value }))}
                required
              >
                <option value="">Chon node</option>
                {nodeList.map((node) => (
                  <option key={String(node.id)} value={String(node.id || '')}>
                    {String(node.shopId || '-')} | level {String(node.level ?? '-')} | {String(node.relationshipStatus || '-')}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {pricingForm.scope === 'NODE_LEVEL' ? (
            <label>
              <span>Ap dung cho level</span>
              <select
                value={pricingForm.appliesToLevel}
                onChange={(event) =>
                  setPricingForm((prev) => ({ ...prev, appliesToLevel: event.target.value }))
                }
                required
              >
                <option value="1">Level 1</option>
                <option value="2">Level 2</option>
                <option value="3">Level 3</option>
              </select>
            </label>
          ) : null}
          <label>
            <span>Product model</span>
            <select
              value={pricingForm.productModelId}
              onChange={(event) => setPricingForm((prev) => ({ ...prev, productModelId: event.target.value }))}
            >
              <option value="">Tat ca model</option>
              {modelList.map((model) => (
                <option key={String(model.id)} value={String(model.id || '')}>
                  {model.modelName || model.id} - {model.brandName || '-'}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Category</span>
            <select
              value={pricingForm.categoryId}
              onChange={(event) => setPricingForm((prev) => ({ ...prev, categoryId: event.target.value }))}
            >
              <option value="">Tat ca category</option>
              {categoryList.map((category) => (
                <option key={String(category.id)} value={String(category.id || '')}>
                  {category.categoryName || category.id}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Discount %</span>
            <input
              type="number"
              min={5}
              max={20}
              value={pricingForm.discountValue}
              onChange={(event) =>
                setPricingForm((prev) => ({ ...prev, discountValue: Number(event.target.value) }))
              }
              required
            />
          </label>
          <label>
            <span>Min quantity</span>
            <input
              type="number"
              min={1}
              value={pricingForm.minQuantity}
              onChange={(event) => setPricingForm((prev) => ({ ...prev, minQuantity: event.target.value }))}
              placeholder="Bo trong neu khong can"
            />
          </label>
          <label>
            <span>Priority</span>
            <input
              type="number"
              min={1}
              value={pricingForm.priority}
              onChange={(event) =>
                setPricingForm((prev) => ({ ...prev, priority: Number(event.target.value) }))
              }
            />
          </label>
          <label>
            <span>Starts at</span>
            <input
              type="datetime-local"
              value={pricingForm.startsAt}
              onChange={(event) => setPricingForm((prev) => ({ ...prev, startsAt: event.target.value }))}
            />
          </label>
          <label>
            <span>Ends at</span>
            <input
              type="datetime-local"
              value={pricingForm.endsAt}
              onChange={(event) => setPricingForm((prev) => ({ ...prev, endsAt: event.target.value }))}
            />
          </label>
          {pricingMessage ? <div className="empty-state full-width">{pricingMessage}</div> : null}
          <button className="primary-button full-width" type="submit">
            Tạo pricing policy
          </button>
        </form>
      </PageSection>

      <PageSection title="Tạo lô hàng nguồn">
        <form className="panel-form two-columns" onSubmit={handleCreateBatch}>
          <label>
            <span>Shop id</span>
            <input
              value={batchForm.shopId}
              onChange={(event) => setBatchForm((prev) => ({ ...prev, shopId: event.target.value }))}
              required
            />
          </label>
          <label>
            <span>Product model</span>
            <select
              value={batchForm.productModelId}
              onChange={(event) =>
                setBatchForm((prev) => ({ ...prev, productModelId: event.target.value }))
              }
              required
            >
              <option value="">Chon model</option>
              {modelList.map((model) => (
                <option key={String(model.id)} value={String(model.id || '')}>
                  {model.modelName || model.id} - {model.brandName || '-'}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Batch number</span>
            <input
              value={batchForm.batchNumber}
              onChange={(event) => setBatchForm((prev) => ({ ...prev, batchNumber: event.target.value }))}
              required
            />
          </label>
          <label>
            <span>Quantity</span>
            <input
              type="number"
              min={1}
              value={batchForm.quantity}
              onChange={(event) =>
                setBatchForm((prev) => ({ ...prev, quantity: Number(event.target.value) }))
              }
              required
            />
          </label>
          <label>
            <span>Source name</span>
            <input
              value={batchForm.sourceName}
              onChange={(event) => setBatchForm((prev) => ({ ...prev, sourceName: event.target.value }))}
              required
            />
          </label>
          <label>
            <span>Country of origin</span>
            <input
              value={batchForm.countryOfOrigin}
              onChange={(event) =>
                setBatchForm((prev) => ({ ...prev, countryOfOrigin: event.target.value }))
              }
              required
            />
          </label>
          <label>
            <span>Source type</span>
            <input
              value={batchForm.sourceType}
              onChange={(event) => setBatchForm((prev) => ({ ...prev, sourceType: event.target.value }))}
              required
            />
          </label>
          <label>
            <span>Received at</span>
            <input
              type="datetime-local"
              value={batchForm.receivedAt}
              onChange={(event) => setBatchForm((prev) => ({ ...prev, receivedAt: event.target.value }))}
              required
            />
          </label>
          <label className="full-width">
            <span>Distribution node id</span>
            <input
              value={batchForm.distributionNodeId}
              onChange={(event) =>
                setBatchForm((prev) => ({ ...prev, distributionNodeId: event.target.value }))
              }
            />
          </label>
          {batchMessage ? <div className="empty-state full-width">{batchMessage}</div> : null}
          <button className="primary-button full-width" type="submit">
            Tạo supply batch
          </button>
        </form>
      </PageSection>

      <PageSection title="Các batch của shop đang chọn">
        {batches.loading ? (
          <div className="empty-state">Đang tải batch...</div>
        ) : batches.error ? (
          <div className="empty-state error">{batches.error}</div>
        ) : batchList.length ? (
          <div className="entity-grid">
            {batchList.map((batch) => (
              <article key={String(batch.id)} className="entity-card">
                <div className="entity-card-header">
                  <div>
                    <h3>{batch.batchNumber || 'Unnamed batch'}</h3>
                    <p className="muted">
                      {batch.sourceName || '-'} | model {batch.productModelId || '-'}
                    </p>
                  </div>
                </div>
                <div className="tag-row">
                  <span className="tag">ID: {String(batch.id || '-')}</span>
                  <span className="tag">Qty: {String(batch.quantity ?? batch.quantityOnHand ?? '-')}</span>
                  <span className="tag">Allocated: {String(batch.allocatedQuantity ?? '-')}</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <ApiResult title="Batches" loading={batches.loading} error={batches.error} data={batches.data} />
        )}
      </PageSection>

      <PageSection
        title="Chi tiết batch và tài liệu lô hàng"
        description="Xem phân bổ, tiêu thụ, lịch sử phiếu chuyển hàng và nộp chứng từ cho từng batch."
      >
        <form className="panel-form two-columns" onSubmit={handleGetBatchDocumentSignatures}>
          <label>
            <span>Batch</span>
            <select value={selectedBatchId} onChange={(event) => setSelectedBatchId(event.target.value)} required>
              <option value="">Chọn batch</option>
              {batchList.map((batch) => (
                <option key={String(batch.id)} value={String(batch.id || '')}>
                  {batch.batchNumber || batch.id}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Loại tài liệu</span>
            <input
              value={batchDocumentType}
              onChange={(event) => setBatchDocumentType(event.target.value)}
              required
            />
          </label>
          <button className="secondary-button full-width" type="submit">
            Lấy thông tin upload
          </button>
        </form>

        {batchDetail.data ? (
          <>
            <div className="shop-info-grid">
              <article>
                <span>Tổng đã allocate</span>
                <strong>{String(batchDetail.data.totalAllocatedQuantity ?? '-')}</strong>
              </article>
              <article>
                <span>Tổng đã tiêu thụ</span>
                <strong>{String(batchDetail.data.totalConsumedQuantity ?? '-')}</strong>
              </article>
              <article>
                <span>Còn có thể cấp phát</span>
                <strong>{String(batchDetail.data.availableForAllocation ?? '-')}</strong>
              </article>
              <article>
                <span>Batch number</span>
                <strong>{String(batchDetail.data.batchNumber || '-')}</strong>
              </article>
            </div>

            <div className="shop-category-status-grid">
              <article>
                <strong>Phân bổ cho offer</strong>
                {batchDetail.data.allocations?.length ? (
                  batchDetail.data.allocations.map((allocation, index) => (
                    <span key={`${allocation.offerId || 'allocation'}-${index}`}>
                      {allocation.offerTitle || allocation.offerId || '-'} • Allocate {String(allocation.allocatedQuantity ?? '-')} • Đã dùng {String(allocation.consumedQuantity ?? '-')} • Còn lại {String(allocation.remainingAllocatedQuantity ?? '-')}
                    </span>
                  ))
                ) : (
                  <small>Batch này chưa được allocate cho offer nào.</small>
                )}
              </article>
              <article>
                <strong>Lịch sử tiêu thụ</strong>
                {batchDetail.data.consumptions?.length ? (
                  batchDetail.data.consumptions.map((consumption, index) => (
                    <span key={`${consumption.orderItemId || 'consumption'}-${index}`}>
                      Đơn {consumption.orderId || '-'} • SL {String(consumption.quantity ?? '-')} • {String(consumption.orderStatus || '-')} • {formatDateTime(consumption.createdAt)}
                    </span>
                  ))
                ) : (
                  <small>Batch này chưa phát sinh tiêu thụ từ đơn hàng.</small>
                )}
              </article>
              <article>
                <strong>Lịch sử phiếu chuyển hàng</strong>
                {batchDetail.data.shipments?.length ? (
                  batchDetail.data.shipments.map((shipment, index) => (
                    <span key={`${shipment.shipmentId || 'shipment'}-${index}`}>
                      {shipment.shipmentCode || shipment.shipmentId || '-'} • SL {String(shipment.quantity ?? '-')} • {String(shipment.shipmentStatus || '-')} • {formatDateTime(shipment.createdAt)}
                    </span>
                  ))
                ) : (
                  <small>Batch này chưa tham gia phiếu chuyển hàng nào.</small>
                )}
              </article>
              <article>
                <strong>Thông tin nguồn</strong>
                <span>Shop: {String(batchDetail.data.shopId || '-')}</span>
                <span>Model: {String(batchDetail.data.productModelId || '-')}</span>
                <span>Nguồn: {String(batchDetail.data.sourceName || '-')}</span>
                <span>Nhận lúc: {formatDateTime(String(batchDetail.data.receivedAt || ''))}</span>
              </article>
            </div>
          </>
        ) : null}

        {batchDocumentSignatures?.length ? (
          <div className="shop-upload-hint">
            <strong>Thông tin upload đã sẵn sàng</strong>
            <span>
              Public ID gợi ý: {batchDocumentSignatures.map((item) => item.publicId).filter(Boolean).join(', ')}
            </span>
          </div>
        ) : null}

        <form className="panel-form two-columns" onSubmit={handleSubmitBatchDocument}>
          <label>
            <span>Loại tài liệu</span>
            <input
              value={batchDocumentForm.docType}
              onChange={(event) => setBatchDocumentForm((prev) => ({ ...prev, docType: event.target.value }))}
              required
            />
          </label>
          <label>
            <span>Mime type</span>
            <input
              value={batchDocumentForm.mimeType}
              onChange={(event) => setBatchDocumentForm((prev) => ({ ...prev, mimeType: event.target.value }))}
              required
            />
          </label>
          <label className="full-width">
            <span>File URL</span>
            <input
              value={batchDocumentForm.fileUrl}
              onChange={(event) => setBatchDocumentForm((prev) => ({ ...prev, fileUrl: event.target.value }))}
              required
            />
          </label>
          <label className="full-width">
            <span>Public ID</span>
            <input
              value={batchDocumentForm.publicId}
              onChange={(event) => setBatchDocumentForm((prev) => ({ ...prev, publicId: event.target.value }))}
              required
            />
          </label>
          <label>
            <span>Đơn vị cấp</span>
            <input
              value={batchDocumentForm.issuerName}
              onChange={(event) => setBatchDocumentForm((prev) => ({ ...prev, issuerName: event.target.value }))}
            />
          </label>
          <label>
            <span>Số chứng từ</span>
            <input
              value={batchDocumentForm.documentNumber}
              onChange={(event) => setBatchDocumentForm((prev) => ({ ...prev, documentNumber: event.target.value }))}
            />
          </label>
          {batchDocumentMessage ? <div className="empty-state full-width">{batchDocumentMessage}</div> : null}
          <button className="primary-button full-width" type="submit">
            Nộp tài liệu cho batch
          </button>
        </form>

        {batchDocumentList.length ? (
          <div className="shop-document-list">
            {batchDocumentList.map((document) => (
              <article key={String(document.id || document.fileUrl)}>
                <div>
                  <strong>{document.docType || 'Tài liệu batch'}</strong>
                  <span>{String(document.reviewStatus || '-')} • {document.issuerName || 'Chưa có đơn vị cấp'}</span>
                </div>
                {document.fileUrl ? (
                  <a href={document.fileUrl} target="_blank" rel="noreferrer">
                    Xem file
                  </a>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <ApiResult title="Batch documents" loading={batchDocuments.loading} error={batchDocuments.error} data={batchDocuments.data} />
        )}
      </PageSection>

      <PageSection title="Node của network đang chọn">
        {!selectedNetworkId ? (
          <div className="empty-state">Chọn network trước để xem node.</div>
        ) : nodeList.length ? (
          <>
            <form className="panel-form two-columns" onSubmit={handleUpdateNodeStatus}>
              <label>
                <span>Node</span>
                <select
                  value={nodeStatusForm.nodeId}
                  onChange={(event) => setNodeStatusForm((prev) => ({ ...prev, nodeId: event.target.value }))}
                  required
                >
                  <option value="">Chọn node</option>
                  {nodeList
                    .filter((node) => Number(node.level ?? 0) > 0)
                    .map((node) => (
                      <option key={String(node.id)} value={String(node.id || '')}>
                        {String(node.shopId || '-')} | level {String(node.level ?? '-')} | {String(node.relationshipStatus || '-')}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                <span>Trạng thái mới</span>
                <select
                  value={nodeStatusForm.relationshipStatus}
                  onChange={(event) => setNodeStatusForm((prev) => ({ ...prev, relationshipStatus: event.target.value }))}
                  required
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                  <option value="TERMINATED">TERMINATED</option>
                </select>
              </label>
              {nodeStatusMessage ? <div className="empty-state full-width">{nodeStatusMessage}</div> : null}
              <button className="secondary-button full-width" type="submit">
                Cập nhật trạng thái node
              </button>
            </form>

            <div className="entity-grid">
            {nodeList.map((node) => (
              <article key={String(node.id)} className="entity-card">
                <div className="entity-card-header">
                  <div>
                    <h3>{String(node.shopId || node.id || '-')}</h3>
                    <p className="muted">
                      Parent {String(node.parentNodeId || '-')} | {String(node.nodeType || '-')}
                    </p>
                  </div>
                </div>
                <div className="tag-row">
                  <span className="tag">Level: {String(node.level ?? '-')}</span>
                  <span className="tag">Trạng thái: {String(node.relationshipStatus || '-')}</span>
                  <span className="tag">Node: {String(node.id || '-')}</span>
                </div>
              </article>
            ))}
            </div>
          </>
        ) : (
          <ApiResult title="Nodes" loading={nodesQuery.loading} error={nodesQuery.error} data={nodesQuery.data} />
        )}
      </PageSection>

      <PageSection
        title="Phiếu chuyển hàng"
        description="Tạo shipment giữa các node trong cùng network và cập nhật trạng thái vận chuyển."
      >
        <form className="panel-form two-columns" onSubmit={handleCreateShipment}>
          <label>
            <span>Network</span>
            <select
              value={shipmentForm.networkId}
              onChange={(event) => setShipmentForm((prev) => ({ ...prev, networkId: event.target.value }))}
              required
            >
              <option value="">Chọn network</option>
              {networkList.map((network) => (
                <option key={String(network.id)} value={String(network.id || '')}>
                  {network.networkName || network.id}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Từ node</span>
            <select
              value={shipmentForm.fromNodeId}
              onChange={(event) => setShipmentForm((prev) => ({ ...prev, fromNodeId: event.target.value }))}
              required
            >
              <option value="">Chọn node gửi</option>
              {nodeList.map((node) => (
                <option key={String(node.id)} value={String(node.id || '')}>
                  {String(node.shopId || '-')} | level {String(node.level ?? '-')}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Đến node</span>
            <select
              value={shipmentForm.toNodeId}
              onChange={(event) => setShipmentForm((prev) => ({ ...prev, toNodeId: event.target.value }))}
              required
            >
              <option value="">Chọn node nhận</option>
              {nodeList.map((node) => (
                <option key={String(node.id)} value={String(node.id || '')}>
                  {String(node.shopId || '-')} | level {String(node.level ?? '-')}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Mã shipment</span>
            <input
              value={shipmentForm.shipmentCode}
              onChange={(event) => setShipmentForm((prev) => ({ ...prev, shipmentCode: event.target.value }))}
              required
            />
          </label>
          <label>
            <span>Batch</span>
            <select
              value={shipmentForm.batchId}
              onChange={(event) => setShipmentForm((prev) => ({ ...prev, batchId: event.target.value }))}
              required
            >
              <option value="">Chọn batch</option>
              {batchList.map((batch) => (
                <option key={String(batch.id)} value={String(batch.id || '')}>
                  {batch.batchNumber || batch.id}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Product model</span>
            <select
              value={shipmentForm.productModelId}
              onChange={(event) => setShipmentForm((prev) => ({ ...prev, productModelId: event.target.value }))}
              required
            >
              <option value="">Chọn model</option>
              {modelList.map((model) => (
                <option key={String(model.id)} value={String(model.id || '')}>
                  {model.modelName || model.id}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Số lượng</span>
            <input
              type="number"
              min={1}
              value={shipmentForm.quantity}
              onChange={(event) => setShipmentForm((prev) => ({ ...prev, quantity: Number(event.target.value) }))}
              required
            />
          </label>
          <label>
            <span>Unit cost</span>
            <input
              type="number"
              min={0}
              value={shipmentForm.unitCost}
              onChange={(event) => setShipmentForm((prev) => ({ ...prev, unitCost: event.target.value }))}
            />
          </label>
          <label className="full-width">
            <span>Ghi chú</span>
            <input
              value={shipmentForm.note}
              onChange={(event) => setShipmentForm((prev) => ({ ...prev, note: event.target.value }))}
            />
          </label>
          {shipmentMessage ? <div className="empty-state full-width">{shipmentMessage}</div> : null}
          <button className="primary-button full-width" type="submit">
            Tạo shipment
          </button>
        </form>

        {shipmentList.length ? (
          <>
            <div className="entity-grid">
            {shipmentList.map((shipment) => (
              <article
                key={String(shipment.id)}
                className={String(shipment.id || '') === String(selectedShipment?.id || '') ? 'entity-card active' : 'entity-card'}
              >
                <div className="entity-card-header">
                  <div>
                    <h3>{shipment.shipmentCode || shipment.id}</h3>
                    <p className="muted">
                      {String(shipment.fromNodeId || '-')} → {String(shipment.toNodeId || '-')}
                    </p>
                  </div>
                </div>
                <div className="tag-row">
                  <span className="tag">Trạng thái: {String(shipment.shipmentStatus || '-')}</span>
                  <span className="tag">Số dòng hàng: {String(shipment.items?.length ?? 0)}</span>
                  <span className="tag">Tạo lúc: {String(shipment.createdAt || '-')}</span>
                </div>
                <button className="secondary-button" type="button" onClick={() => handleSelectShipment(String(shipment.id || ''))}>
                  {String(shipment.id || '') === String(selectedShipment?.id || '') ? 'Đang xem' : 'Xem chi tiết'}
                </button>
                {shipment.items?.length ? (
                  <div className="compact-list">
                    {shipment.items.map((item) => (
                      <div key={String(item.id || item.batchId)} className="compact-item">
                        <strong>Batch {String(item.batchId || '-')}</strong>
                        <span>
                          Model {String(item.productModelId || '-')} • SL {String(item.quantity ?? '-')} • Unit cost {String(item.unitCost ?? '-')}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}
                <div className="storefront-card-actions">
                  {String(shipment.shipmentStatus || '').toUpperCase() === 'DRAFT' ? (
                    <>
                      <button className="secondary-button" type="button" onClick={() => void handleShipmentAction(String(shipment.id || ''), 'dispatch')}>
                        Xuất kho
                      </button>
                      <button className="secondary-button" type="button" onClick={() => void handleShipmentAction(String(shipment.id || ''), 'cancel')}>
                        Hủy phiếu
                      </button>
                    </>
                  ) : null}
                  {String(shipment.shipmentStatus || '').toUpperCase() === 'IN_TRANSIT' ? (
                    <button className="secondary-button" type="button" onClick={() => void handleShipmentAction(String(shipment.id || ''), 'receive')}>
                      Xác nhận đã nhận hàng
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
            </div>

            {selectedShipment ? (
              <div className="shop-section-card">
                {shipmentDetailQuery.loading ? <div className="empty-state">Đang tải chi tiết phiếu chuyển hàng...</div> : null}
                {shipmentDetailQuery.error ? <div className="empty-state error">{shipmentDetailQuery.error}</div> : null}
                <div className="shop-section-head">
                  <div>
                    <span className="section-kicker">Chi tiết phiếu</span>
                    <h2>{selectedShipment.shipmentCode || selectedShipment.id}</h2>
                  </div>
                </div>
                <div className="shop-info-grid">
                  <article>
                    <span>Từ node</span>
                    <strong>{String(selectedShipment.fromNodeId || '-')}</strong>
                  </article>
                  <article>
                    <span>Đến node</span>
                    <strong>{String(selectedShipment.toNodeId || '-')}</strong>
                  </article>
                  <article>
                    <span>Trạng thái</span>
                    <strong>{String(selectedShipment.shipmentStatus || '-')}</strong>
                  </article>
                  <article>
                    <span>Tạo lúc</span>
                    <strong>{formatDateTime(selectedShipment.createdAt)}</strong>
                  </article>
                  <article>
                    <span>Xuất kho lúc</span>
                    <strong>{formatDateTime(selectedShipment.shippedAt)}</strong>
                  </article>
                  <article>
                    <span>Nhận hàng lúc</span>
                    <strong>{formatDateTime(selectedShipment.receivedAt)}</strong>
                  </article>
                </div>
                <div className="shop-stat-grid">
                  <article className="shop-stat-card">
                    <span>Trạng thái phiếu</span>
                    <strong>{shipmentStatusLabel(selectedShipment.shipmentStatus)}</strong>
                    <small>Trạng thái vận hành hiện tại của phiếu chuyển hàng.</small>
                  </article>
                  <article className="shop-stat-card">
                    <span>Tổng số lượng</span>
                    <strong>{selectedShipmentTotalQuantity}</strong>
                    <small>Tổng số lượng trên các dòng hàng trong phiếu.</small>
                  </article>
                  <article className="shop-stat-card">
                    <span>Số dòng hàng</span>
                    <strong>{selectedShipment.items?.length || 0}</strong>
                    <small>Mỗi dòng tương ứng một batch/model được chuyển.</small>
                  </article>
                  <article className="shop-stat-card">
                    <span>Network</span>
                    <strong>{String(selectedShipment.networkId || selectedNetworkId || '-')}</strong>
                    <small>Network phân phối đang xử lý phiếu này.</small>
                  </article>
                </div>

                <div className="order-timeline">
                  {selectedShipmentSteps.map((step) => (
                    <article
                      key={step.key}
                      className={
                        step.done
                          ? 'order-timeline-step done'
                          : step.active
                            ? 'order-timeline-step active'
                            : 'order-timeline-step'
                      }
                    >
                      <span>{step.done ? '✓' : step.active ? '•' : '○'}</span>
                      <div>
                        <strong>{step.label}</strong>
                        {step.time && step.time !== '-' ? <em>{step.time}</em> : null}
                        <small>{step.helper}</small>
                      </div>
                    </article>
                  ))}
                </div>

                {selectedShipment.note ? (
                  <div className="empty-state">Ghi chú: {selectedShipment.note}</div>
                ) : null}
                <div className="shop-document-list">
                  {(selectedShipment.items || []).map((item, index) => (
                    <article key={`${item.id || item.batchId || 'shipment-item'}-${index}`}>
                      <div>
                        <strong>Batch {String(item.batchId || '-')}</strong>
                        <span>
                          Model {String(item.productModelId || '-')} • Số lượng {String(item.quantity ?? '-')} • Unit cost {String(item.unitCost ?? '-')}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <ApiResult title="Shipments" loading={shipmentsQuery.loading} error={shipmentsQuery.error} data={shipmentsQuery.data} />
        )}
      </PageSection>

      <PageSection title="Chính sách giá của network đang chọn">
        {!selectedNetworkId ? (
          <div className="empty-state">Chọn network trước để xem pricing policy.</div>
        ) : pricingPolicyList.length ? (
          <div className="entity-grid">
            {pricingPolicyList.map((policy) => (
              <article key={String(policy.id)} className="entity-card">
                <div className="entity-card-header">
                  <div>
                    <h3>{String(policy.scope || '-')}</h3>
                    <p className="muted">
                      Discount {String(policy.discountValue ?? '-')}% | priority {String(policy.priority ?? '-')}
                    </p>
                  </div>
                </div>
                <div className="tag-row">
                  <span className="tag">Node: {String(policy.nodeId || '-')}</span>
                  <span className="tag">Level: {String(policy.appliesToLevel ?? '-')}</span>
                  <span className="tag">Model: {String(policy.productModelId || '-')}</span>
                  <span className="tag">Category: {String(policy.categoryId || '-')}</span>
                  <span className="tag">Min qty: {String(policy.minQuantity ?? '-')}</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <ApiResult
            title="Pricing policies"
            loading={pricingPoliciesQuery.loading}
            error={pricingPoliciesQuery.error}
            data={pricingPoliciesQuery.data}
          />
        )}
      </PageSection>

      <PageSection title="Membership của shop hiện tại">
        {membershipList.length ? (
          <div className="entity-grid">
            {membershipList.map((membership) => (
              <article key={String(membership.nodeId)} className="entity-card">
                <div className="entity-card-header">
                  <div>
                    <h3>{membership.shopName || membership.shopId || membership.nodeId}</h3>
                    <p className="muted">
                      {membership.networkName || membership.networkId} | manufacturer {membership.manufacturerShopName || '-'}
                    </p>
                  </div>
                </div>
                <div className="tag-row">
                  <span className="tag">Level: {String(membership.level ?? '-')}</span>
                  <span className="tag">Trạng thái: {String(membership.relationshipStatus || '-')}</span>
                  <span className="tag">Node: {String(membership.nodeId || '-')}</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <ApiResult
            title="Memberships"
            loading={memberships.loading}
            error={memberships.error}
            data={memberships.data}
          />
        )}
      </PageSection>

      <PageSection title="Tổng quan tồn kho">
        <ApiResult title="Inventory" loading={inventory.loading} error={inventory.error} data={inventory.data} />
      </PageSection>
    </div>
  );
}
