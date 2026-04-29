import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BreadcrumbNav } from '../components/breadcrumb-nav';
import { useApiQuery } from '../hooks/use-api-query';
import { apiRequest } from '../lib/api-client';
import { useAuth } from '../modules/auth/auth-context';

type AffiliateProgram = {
  id?: string;
  name?: string;
  slug?: string;
  scopeType?: string;
  programStatus?: string;
  tier1Rate?: number | string;
  tier2Rate?: number | string;
};

type AffiliateAccount = {
  id?: string;
  programId?: string;
  accountStatus?: string;
  referralCode?: string | null;
  [key: string]: unknown;
};

type AffiliateCode = {
  id?: string;
  code?: string;
  landingUrl?: string | null;
  isDefault?: boolean;
  expiresAt?: string | null;
};

type AffiliateConversion = {
  id?: string;
  conversionStatus?: string;
  orderId?: string;
  commissionBase?: number | string;
  orderAmount?: number | string;
};

type AffiliateCommission = {
  id?: string;
  beneficiaryType?: string;
  commissionStatus?: string;
  amount?: number | string;
};

type AffiliatePayout = {
  id?: string;
  payoutStatus?: string;
  totalAmount?: number | string;
  periodStart?: string;
  periodEnd?: string;
};

type AffiliateAccountSummary = {
  totalConversions?: number | string;
  approvedConversions?: number | string;
  totalCommission?: number | string;
  payableCommission?: number | string;
  paidCommission?: number | string;
  [key: string]: unknown;
};

const initialProgramForm = {
  scopeType: 'PLATFORM',
  name: '',
  slug: '',
  tier1Rate: 10,
  tier2Rate: 5,
};

const initialJoinForm = {
  programId: '',
  referralCode: '',
};

const initialCodeForm = {
  accountId: '',
  code: '',
  landingUrl: '',
  isDefault: true,
};

function normalizeList<T>(data: unknown) {
  return Array.isArray(data) ? (data as T[]) : [];
}

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: unknown) {
  return `${toNumber(value).toLocaleString('vi-VN')} VND`;
}

function formatDate(value?: string | null) {
  if (!value) {
    return 'Không giới hạn';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('vi-VN');
}

export function AffiliatePage() {
  const { session } = useAuth();
  const programs = useApiQuery<AffiliateProgram[]>('/affiliate/programs/mine');
  const accounts = useApiQuery<AffiliateAccount[]>('/affiliate/accounts/mine');
  const [programForm, setProgramForm] = useState(initialProgramForm);
  const [joinForm, setJoinForm] = useState(initialJoinForm);
  const [codeForm, setCodeForm] = useState(initialCodeForm);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');

  const programList = useMemo(() => normalizeList<AffiliateProgram>(programs.data), [programs.data]);
  const accountList = useMemo(() => normalizeList<AffiliateAccount>(accounts.data), [accounts.data]);

  useEffect(() => {
    if (!selectedProgramId && programList.length) {
      setSelectedProgramId(String(programList[0].id || ''));
    }
  }, [programList, selectedProgramId]);

  useEffect(() => {
    if (!selectedAccountId && accountList.length) {
      const firstAccountId = String(accountList[0].id || '');
      setSelectedAccountId(firstAccountId);
      setCodeForm((prev) => ({ ...prev, accountId: prev.accountId || firstAccountId }));
    }
  }, [accountList, selectedAccountId]);

  const selectedProgram =
    programList.find((program) => String(program.id || '') === selectedProgramId) ?? null;
  const selectedAccount =
    accountList.find((account) => String(account.id || '') === selectedAccountId) ?? null;

  const accountSummary = useApiQuery<AffiliateAccountSummary>(
    selectedAccountId ? `/affiliate/accounts/${encodeURIComponent(selectedAccountId)}/summary` : '',
    Boolean(selectedAccountId),
  );
  const accountCodes = useApiQuery<AffiliateCode[]>(
    selectedAccountId ? `/affiliate/accounts/${encodeURIComponent(selectedAccountId)}/codes` : '',
    Boolean(selectedAccountId),
  );
  const accountCommissions = useApiQuery<AffiliateCommission[]>(
    selectedAccountId ? `/affiliate/accounts/${encodeURIComponent(selectedAccountId)}/commissions` : '',
    Boolean(selectedAccountId),
  );
  const accountPayouts = useApiQuery<AffiliatePayout[]>(
    selectedAccountId ? `/affiliate/accounts/${encodeURIComponent(selectedAccountId)}/payouts` : '',
    Boolean(selectedAccountId),
  );
  const accountConversions = useApiQuery<AffiliateConversion[]>(
    selectedAccountId ? `/affiliate/accounts/${encodeURIComponent(selectedAccountId)}/conversions` : '',
    Boolean(selectedAccountId),
  );
  const programConversions = useApiQuery<AffiliateConversion[]>(
    selectedProgramId ? `/affiliate/programs/${encodeURIComponent(selectedProgramId)}/conversions` : '',
    Boolean(selectedProgramId),
  );

  async function handleCreateProgram(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setMessage(null);
      await apiRequest('/affiliate/programs', {
        method: 'POST',
        accessToken: session?.accessToken,
        body: programForm,
      });
      setProgramForm(initialProgramForm);
      setMessage('Đã tạo chương trình affiliate.');
      await programs.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Tạo chương trình thất bại.');
    }
  }

  async function handleJoinProgram(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setMessage(null);
      await apiRequest('/affiliate/accounts/join', {
        method: 'POST',
        accessToken: session?.accessToken,
        body: {
          programId: joinForm.programId,
          referralCode: joinForm.referralCode || undefined,
        },
      });
      setJoinForm(initialJoinForm);
      setMessage('Đã tham gia chương trình affiliate.');
      await accounts.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Tham gia chương trình thất bại.');
    }
  }

  async function handleCreateCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setMessage(null);
      await apiRequest('/affiliate/codes', {
        method: 'POST',
        accessToken: session?.accessToken,
        body: {
          accountId: codeForm.accountId,
          code: codeForm.code,
          landingUrl: codeForm.landingUrl || undefined,
          isDefault: codeForm.isDefault,
        },
      });
      setCodeForm((prev) => ({
        ...prev,
        code: '',
        landingUrl: '',
      }));
      setMessage('Đã tạo mã affiliate.');
      await accountCodes.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Tạo mã affiliate thất bại.');
    }
  }

  const codeList = normalizeList<AffiliateCode>(accountCodes.data);
  const commissionList = normalizeList<AffiliateCommission>(accountCommissions.data);
  const payoutList = normalizeList<AffiliatePayout>(accountPayouts.data);
  const conversionList = normalizeList<AffiliateConversion>(accountConversions.data);
  const programConversionList = normalizeList<AffiliateConversion>(programConversions.data);

  return (
    <div className="orders-dashboard-page">
      <BreadcrumbNav items={[{ label: 'Trang chủ', to: '/' }, { label: 'Tài khoản của tôi', to: '/user' }, { label: 'Affiliate' }]} />

      <section className="shop-hero order-hero">
        <div>
          <span className="shop-hero-badge">Tiếp thị liên kết</span>
          <h1>Affiliate của tôi</h1>
          <p>Tạo chương trình, tham gia chương trình, quản lý mã giới thiệu và theo dõi hoa hồng trong cùng một màn hình.</p>
        </div>
        <Link className="secondary-button link-button" to="/products">
          Đi tới sản phẩm
        </Link>
      </section>

      {message ? <div className="empty-state">{message}</div> : null}

      <section className="shop-stat-grid">
        <article className="shop-stat-card">
          <span>Chương trình của tôi</span>
          <strong>{programList.length}</strong>
          <small>Các chương trình bạn đang sở hữu.</small>
        </article>
        <article className="shop-stat-card">
          <span>Tài khoản affiliate</span>
          <strong>{accountList.length}</strong>
          <small>Các account bạn đang tham gia.</small>
        </article>
        <article className="shop-stat-card">
          <span>Mã giới thiệu</span>
          <strong>{codeList.length}</strong>
          <small>Tạo theo từng account affiliate.</small>
        </article>
        <article className="shop-stat-card">
          <span>Hoa hồng có thể rút</span>
          <strong>{formatMoney(accountSummary.data?.payableCommission || 0)}</strong>
          <small>Dựa trên account đang chọn.</small>
        </article>
      </section>

      <section className="shop-dashboard-layout">
        <aside className="shop-dashboard-sidebar">
          <div className="shop-side-card">
            <h3>Điều hướng nhanh</h3>
            <p>Chọn chương trình và account để xem dữ liệu chi tiết.</p>
          </div>

          <div className="shop-side-card">
            <h3>Chương trình của tôi</h3>
            {programs.loading ? (
              <div className="empty-state">Đang tải chương trình...</div>
            ) : programs.error ? (
              <div className="empty-state error">{programs.error}</div>
            ) : programList.length ? (
              <div className="order-list-panel">
                {programList.map((program) => (
                  <button
                    key={String(program.id || '')}
                    type="button"
                    className={selectedProgramId === String(program.id || '') ? 'order-list-card active' : 'order-list-card'}
                    onClick={() => setSelectedProgramId(String(program.id || ''))}
                  >
                    <div>
                      <strong>{program.name || 'Program'}</strong>
                      <span>{program.programStatus || 'ACTIVE'}</span>
                    </div>
                    <p>{program.scopeType || 'PLATFORM'} • {program.slug || '-'}</p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="empty-state">Bạn chưa tạo chương trình nào.</div>
            )}
          </div>

          <div className="shop-side-card">
            <h3>Account của tôi</h3>
            {accounts.loading ? (
              <div className="empty-state">Đang tải account...</div>
            ) : accounts.error ? (
              <div className="empty-state error">{accounts.error}</div>
            ) : accountList.length ? (
              <div className="order-list-panel">
                {accountList.map((account) => (
                  <button
                    key={String(account.id || '')}
                    type="button"
                    className={selectedAccountId === String(account.id || '') ? 'order-list-card active' : 'order-list-card'}
                    onClick={() => {
                      const accountId = String(account.id || '');
                      setSelectedAccountId(accountId);
                      setCodeForm((prev) => ({ ...prev, accountId }));
                    }}
                  >
                    <div>
                      <strong>#{String(account.id || '').slice(0, 8)}</strong>
                      <span>{String(account.accountStatus || '-')}</span>
                    </div>
                    <p>Program: {String(account.programId || '-')}</p>
                    <small>Mã mặc định: {String(account.referralCode || '-')}</small>
                  </button>
                ))}
              </div>
            ) : (
              <div className="empty-state">Bạn chưa tham gia chương trình nào.</div>
            )}
          </div>
        </aside>

        <div className="shop-dashboard-main">
          <section className="shop-section-card">
            <div className="shop-section-head">
              <div>
                <span className="section-kicker">Tạo mới</span>
                <h2>Chương trình affiliate</h2>
              </div>
            </div>

            <form className="panel-form two-columns" onSubmit={handleCreateProgram}>
              <label>
                <span>Phạm vi</span>
                <select
                  value={programForm.scopeType}
                  onChange={(event) => setProgramForm((prev) => ({ ...prev, scopeType: event.target.value }))}
                >
                  <option value="PLATFORM">PLATFORM</option>
                  <option value="SHOP">SHOP</option>
                  <option value="BRAND">BRAND</option>
                  <option value="PRODUCT_MODEL">PRODUCT_MODEL</option>
                  <option value="OFFER">OFFER</option>
                </select>
              </label>
              <label>
                <span>Slug</span>
                <input
                  value={programForm.slug}
                  onChange={(event) => setProgramForm((prev) => ({ ...prev, slug: event.target.value }))}
                  required
                />
              </label>
              <label className="full-width">
                <span>Tên chương trình</span>
                <input
                  value={programForm.name}
                  onChange={(event) => setProgramForm((prev) => ({ ...prev, name: event.target.value }))}
                  required
                />
              </label>
              <label>
                <span>Hoa hồng tầng 1</span>
                <input
                  type="number"
                  value={programForm.tier1Rate}
                  onChange={(event) => setProgramForm((prev) => ({ ...prev, tier1Rate: Number(event.target.value) }))}
                />
              </label>
              <label>
                <span>Hoa hồng tầng 2</span>
                <input
                  type="number"
                  value={programForm.tier2Rate}
                  onChange={(event) => setProgramForm((prev) => ({ ...prev, tier2Rate: Number(event.target.value) }))}
                />
              </label>
              <button className="primary-button full-width" type="submit">
                Tạo chương trình
              </button>
            </form>
          </section>

          <section className="shop-section-card">
            <div className="shop-section-head">
              <div>
                <span className="section-kicker">Tham gia</span>
                <h2>Chương trình affiliate</h2>
              </div>
            </div>

            <form className="panel-form two-columns" onSubmit={handleJoinProgram}>
              <label>
                <span>Program ID</span>
                <input
                  value={joinForm.programId}
                  onChange={(event) => setJoinForm((prev) => ({ ...prev, programId: event.target.value }))}
                  required
                />
              </label>
              <label>
                <span>Mã giới thiệu</span>
                <input
                  value={joinForm.referralCode}
                  onChange={(event) => setJoinForm((prev) => ({ ...prev, referralCode: event.target.value }))}
                  placeholder="Nếu tham gia qua ref code"
                />
              </label>
              <button className="secondary-button full-width" type="submit">
                Tham gia chương trình
              </button>
            </form>
          </section>

          <section className="shop-section-card">
            <div className="shop-section-head">
              <div>
                <span className="section-kicker">Tài khoản đang chọn</span>
                <h2>Tổng quan account affiliate</h2>
              </div>
            </div>

            {selectedAccount ? (
              <div className="shop-info-grid">
                <article>
                  <span>Account ID</span>
                  <strong>{String(selectedAccount.id || '-')}</strong>
                </article>
                <article>
                  <span>Trạng thái</span>
                  <strong>{String(selectedAccount.accountStatus || '-')}</strong>
                </article>
                <article>
                  <span>Tổng hoa hồng</span>
                  <strong>{formatMoney(accountSummary.data?.totalCommission || 0)}</strong>
                </article>
                <article>
                  <span>Hoa hồng đã trả</span>
                  <strong>{formatMoney(accountSummary.data?.paidCommission || 0)}</strong>
                </article>
                <article>
                  <span>Tổng conversions</span>
                  <strong>{String(accountSummary.data?.totalConversions || 0)}</strong>
                </article>
                <article>
                  <span>Conversions được duyệt</span>
                  <strong>{String(accountSummary.data?.approvedConversions || 0)}</strong>
                </article>
              </div>
            ) : (
              <div className="empty-state">Hãy chọn một account affiliate.</div>
            )}
          </section>

          <section className="shop-section-card">
            <div className="shop-section-head">
              <div>
                <span className="section-kicker">Mã giới thiệu</span>
                <h2>Tạo và quản lý mã affiliate</h2>
              </div>
            </div>

            <form className="panel-form two-columns" onSubmit={handleCreateCode}>
              <label>
                <span>Account</span>
                <select
                  value={codeForm.accountId}
                  onChange={(event) => setCodeForm((prev) => ({ ...prev, accountId: event.target.value }))}
                  required
                >
                  <option value="">Chọn account</option>
                  {accountList.map((account) => (
                    <option key={String(account.id || '')} value={String(account.id || '')}>
                      {String(account.id || '')}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Mã code</span>
                <input
                  value={codeForm.code}
                  onChange={(event) => setCodeForm((prev) => ({ ...prev, code: event.target.value }))}
                  required
                />
              </label>
              <label className="full-width">
                <span>Landing URL</span>
                <input
                  value={codeForm.landingUrl}
                  onChange={(event) => setCodeForm((prev) => ({ ...prev, landingUrl: event.target.value }))}
                  placeholder="https://..."
                />
              </label>
              <button className="primary-button full-width" type="submit">
                Tạo mã affiliate
              </button>
            </form>

            {accountCodes.loading ? (
              <div className="empty-state">Đang tải mã affiliate...</div>
            ) : codeList.length ? (
              <div className="shop-document-list">
                {codeList.map((code) => (
                  <article key={String(code.id || code.code || '')}>
                    <div>
                      <strong>{code.code || '-'}</strong>
                      <span>
                        {code.isDefault ? 'Mặc định' : 'Tùy chọn'} • hết hạn: {formatDate(code.expiresAt)}
                      </span>
                    </div>
                    <span>{code.landingUrl || 'Chưa cấu hình landing URL'}</span>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">Chưa có mã affiliate nào.</div>
            )}
          </section>

          <section className="shop-section-card">
            <div className="shop-section-head">
              <div>
                <span className="section-kicker">Hiệu suất</span>
                <h2>Conversions, hoa hồng và payouts</h2>
              </div>
            </div>

            <div className="shop-stat-grid">
              <article className="shop-stat-card">
                <span>Conversions của account</span>
                <strong>{conversionList.length}</strong>
                <small>Theo account đang chọn.</small>
              </article>
              <article className="shop-stat-card">
                <span>Commission entries</span>
                <strong>{commissionList.length}</strong>
                <small>Theo account đang chọn.</small>
              </article>
              <article className="shop-stat-card">
                <span>Payout records</span>
                <strong>{payoutList.length}</strong>
                <small>Lịch sử chi trả hiện có.</small>
              </article>
              <article className="shop-stat-card">
                <span>Conversions của program</span>
                <strong>{programConversionList.length}</strong>
                <small>Theo program đang chọn.</small>
              </article>
            </div>

            <div className="shop-category-status-grid">
              <article>
                <strong>Commission gần đây</strong>
                {commissionList.slice(0, 4).map((commission) => (
                  <span key={String(commission.id || '')}>
                    {String(commission.beneficiaryType || '-')} • {formatMoney(commission.amount || 0)} • {String(commission.commissionStatus || '-')}
                  </span>
                ))}
                {!commissionList.length ? <small>Chưa có commission entry.</small> : null}
              </article>
              <article>
                <strong>Payout gần đây</strong>
                {payoutList.slice(0, 4).map((payout) => (
                  <span key={String(payout.id || '')}>
                    {formatMoney(payout.totalAmount || 0)} • {String(payout.payoutStatus || '-')} • {formatDate(payout.periodStart)} - {formatDate(payout.periodEnd)}
                  </span>
                ))}
                {!payoutList.length ? <small>Chưa có payout nào.</small> : null}
              </article>
              <article>
                <strong>Conversions của account</strong>
                {conversionList.slice(0, 4).map((conversion) => (
                  <span key={String(conversion.id || '')}>
                    Đơn {String(conversion.orderId || '-')} • {String(conversion.conversionStatus || '-')} • {formatMoney(conversion.orderAmount || conversion.commissionBase || 0)}
                  </span>
                ))}
                {!conversionList.length ? <small>Chưa có conversion nào cho account này.</small> : null}
              </article>
              <article>
                <strong>Conversions của program</strong>
                {programConversionList.slice(0, 4).map((conversion) => (
                  <span key={String(conversion.id || '')}>
                    Đơn {String(conversion.orderId || '-')} • {String(conversion.conversionStatus || '-')}
                  </span>
                ))}
                {!programConversionList.length ? <small>Program này chưa có conversion nào.</small> : null}
              </article>
            </div>

            {accountSummary.error || accountCodes.error || accountCommissions.error || accountPayouts.error || accountConversions.error || programConversions.error ? (
              <div className="empty-state error">
                {accountSummary.error || accountCodes.error || accountCommissions.error || accountPayouts.error || accountConversions.error || programConversions.error}
              </div>
            ) : null}
          </section>

          {selectedProgram ? (
            <section className="shop-section-card">
              <div className="shop-section-head">
                <div>
                  <span className="section-kicker">Program đang chọn</span>
                  <h2>{selectedProgram.name || 'Chương trình affiliate'}</h2>
                </div>
              </div>
              <div className="shop-info-grid">
                <article>
                  <span>Scope</span>
                  <strong>{selectedProgram.scopeType || '-'}</strong>
                </article>
                <article>
                  <span>Slug</span>
                  <strong>{selectedProgram.slug || '-'}</strong>
                </article>
                <article>
                  <span>Tier 1</span>
                  <strong>{String(selectedProgram.tier1Rate || 0)}%</strong>
                </article>
                <article>
                  <span>Tier 2</span>
                  <strong>{String(selectedProgram.tier2Rate || 0)}%</strong>
                </article>
              </div>
            </section>
          ) : null}
        </div>
      </section>
    </div>
  );
}
