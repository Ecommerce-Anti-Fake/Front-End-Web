import { StatCard } from '../components/stat-card';
import { PageSection } from '../components/page-section';

export function DashboardPage() {
  return (
    <div className="page-stack">
      <header className="page-header">
        <p className="eyebrow">Overview</p>
        <h1>Backend hien tai da du lon de dung frontend that</h1>
        <p className="muted">
          Man nay dong vai tro bo dieu huong. Cac trang con uu tien thao tac truc tiep voi API co san de ban test nghiep vu sớm.
        </p>
      </header>

      <section className="stats-grid">
        <StatCard label="Auth" value="Ready" helper="Dang nhap, dang ky, refresh, logout" />
        <StatCard label="Catalog" value="Ready" helper="Shops, products, distribution" />
        <StatCard label="Orders" value="Ready" helper="Retail, wholesale, dispute, refund" />
        <StatCard label="Affiliate" value="Ready" helper="Programs, accounts, payouts" />
      </section>

      <PageSection
        title="Huong tiep can"
        description="Frontend nay khong co gang phu het tat ca edge case ngay. Muc tieu la tao mot web app dung duoc tren desktop va mobile cho cac flow chinh."
      >
        <div className="highlight-grid">
          <article className="highlight-card">
            <h3>User va KYC</h3>
            <p>Profile, completion, KYC va admin KYC lookup.</p>
          </article>
          <article className="highlight-card">
            <h3>Seller workspace</h3>
            <p>Shops, offers, batches, pricing policies, inventory summary.</p>
          </article>
          <article className="highlight-card">
            <h3>Transaction</h3>
            <p>Tao order, truy van order theo id, dispute va refund action.</p>
          </article>
        </div>
      </PageSection>
    </div>
  );
}
