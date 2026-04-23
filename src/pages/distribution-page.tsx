import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiResult } from '../components/api-result';
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
    return 'Chi manufacturer shop dang active moi duoc tao distribution network.';
  }

  if (message.includes('only manufacturer or distributor shops')) {
    return 'Chi manufacturer hoac distributor shop dang active moi duoc tao supply batch.';
  }

  return fallback;
}

export function DistributionPage() {
  const { session } = useAuth();
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
  const [message, setMessage] = useState<string | null>(null);
  const [batchMessage, setBatchMessage] = useState<string | null>(null);
  const [pricingMessage, setPricingMessage] = useState<string | null>(null);

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

  const nodeList = useMemo(
    () => normalizeList<NodeRecord>(nodesQuery.data, ['items', 'data', 'nodes']),
    [nodesQuery.data],
  );
  const pricingPolicyList = useMemo(
    () =>
      normalizeList<PricingPolicyRecord>(pricingPoliciesQuery.data, ['items', 'data', 'pricingPolicies']),
    [pricingPoliciesQuery.data],
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

  function handleSelectNetwork(networkId: string) {
    setSelectedNetworkId(networkId);
    window.localStorage.setItem(ACTIVE_NETWORK_KEY, networkId);
  }

  async function handleCreateNetwork(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const createdNetwork = await apiRequest<NetworkRecord>('/distribution/networks', {
        method: 'POST',
        accessToken: session?.accessToken,
        body: networkForm,
      });
      setMessage('Tao distribution network thanh cong.');
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
      setBatchMessage('Tao supply batch thanh cong.');
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

      setPricingMessage('Tao pricing policy thanh cong.');
      setPricingForm({
        ...initialPricingForm,
        networkId: selectedNetworkId,
      });
      await pricingPoliciesQuery.reload();
    } catch (error) {
      setPricingMessage(formatDistributionActionError(error));
    }
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <p className="eyebrow">Catalog</p>
        <h1>Distribution va inventory</h1>
        <p className="muted">
          Trang nay da duoc keo sat hon seller flow: active shop, active model va active network se duoc dung lai cho luong batch va wholesale pricing.
        </p>
      </header>

      <PageSection title="Ngu canh dang thao tac">
        <div className="context-grid">
          <div className="context-card">
            <p className="eyebrow">Active shop</p>
            <strong>{activeShopId || 'Chua chon shop'}</strong>
          </div>
          <div className="context-card">
            <p className="eyebrow">Active model</p>
            <strong>{activeModelId || 'Chua chon model'}</strong>
          </div>
          <div className="context-card">
            <p className="eyebrow">Active network</p>
            <strong>{selectedNetworkId || 'Chua chon network'}</strong>
          </div>
        </div>
        {activeShopId ? (
          activeShopVerification.loading ? (
            <div className="empty-state">Dang tai trang thai verification cua shop...</div>
          ) : activeShopVerification.data?.canOperate ? (
            <div className="empty-state">Shop dang active, co the tiep tuc supply batch va distribution flow.</div>
          ) : (
            <div className="empty-state error">
              Shop nay chua du dieu kien distribution flow.
              {Array.isArray(activeShopVerification.data?.missingRequirements) &&
              activeShopVerification.data?.missingRequirements.length
                ? ` Missing: ${activeShopVerification.data.missingRequirements.join(', ')}.`
                : ''}
              {' '}Vao trang <Link className="link-inline" to="/shops">Shops</Link> de xu ly verification truoc.
            </div>
          )
        ) : null}
      </PageSection>

      <PageSection title="Networks" description="Chon network de quan ly node va pricing policy.">
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
                        Manufacturer {network.manufacturerShopId || '-'} | brand {network.brandId || '-'}
                      </p>
                    </div>
                    <button className="secondary-button" type="button" onClick={() => handleSelectNetwork(networkId)}>
                      {isActive ? 'Dang chon' : 'Dung network nay'}
                    </button>
                  </div>
                  <div className="tag-row">
                    <span className="tag">Status: {String(network.networkStatus || '-')}</span>
                    <span className="tag">Max level: {String(network.maxAgentDepth ?? '-')}</span>
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

      <PageSection title="Tao network">
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
            Tao network
          </button>
        </form>
      </PageSection>

      <PageSection
        title="Pricing policy"
        description="Policy nay se duoc ap cho luong wholesale khi buyer dung distribution node cung network."
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
            Tao pricing policy
          </button>
        </form>
      </PageSection>

      <PageSection title="Tao supply batch">
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
            Tao supply batch
          </button>
        </form>
      </PageSection>

      <PageSection title="Supply batches cua active shop">
        {batches.loading ? (
          <div className="empty-state">Dang tai batches...</div>
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

      <PageSection title="Nodes cua network dang chon">
        {!selectedNetworkId ? (
          <div className="empty-state">Chon network truoc de xem node.</div>
        ) : nodeList.length ? (
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
                  <span className="tag">Status: {String(node.relationshipStatus || '-')}</span>
                  <span className="tag">Node: {String(node.id || '-')}</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <ApiResult title="Nodes" loading={nodesQuery.loading} error={nodesQuery.error} data={nodesQuery.data} />
        )}
      </PageSection>

      <PageSection title="Pricing policies cua network dang chon">
        {!selectedNetworkId ? (
          <div className="empty-state">Chon network truoc de xem pricing policy.</div>
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

      <PageSection title="Memberships">
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
                  <span className="tag">Status: {String(membership.relationshipStatus || '-')}</span>
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

      <PageSection title="Inventory summary">
        <ApiResult title="Inventory" loading={inventory.loading} error={inventory.error} data={inventory.data} />
      </PageSection>
    </div>
  );
}
