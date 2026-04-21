import { FormEvent, useState } from 'react';
import { ApiResult } from '../components/api-result';
import { PageSection } from '../components/page-section';
import { apiRequest } from '../lib/api-client';
import { useAuth } from '../modules/auth/auth-context';
import { useApiQuery } from '../hooks/use-api-query';

const initialProgramForm = {
  scopeType: 'PLATFORM',
  name: '',
  slug: '',
  tier1Rate: 10,
  tier2Rate: 5,
};

export function AffiliatePage() {
  const { session } = useAuth();
  const programs = useApiQuery('/affiliate/programs/mine');
  const accounts = useApiQuery('/affiliate/accounts/mine');
  const [form, setForm] = useState(initialProgramForm);
  const [message, setMessage] = useState<string | null>(null);

  async function handleCreateProgram(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      await apiRequest('/affiliate/programs', {
        method: 'POST',
        accessToken: session?.accessToken,
        body: form,
      });
      setMessage('Tao affiliate program thanh cong.');
      setForm(initialProgramForm);
      await programs.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Create program failed');
    }
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <p className="eyebrow">Affiliate</p>
        <h1>Programs, accounts va payouts</h1>
      </header>

      <PageSection title="Tao program">
        <form className="panel-form two-columns" onSubmit={handleCreateProgram}>
          <label>
            <span>Scope type</span>
            <select
              value={form.scopeType}
              onChange={(event) => setForm((prev) => ({ ...prev, scopeType: event.target.value }))}
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
              value={form.slug}
              onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
              required
            />
          </label>
          <label className="full-width">
            <span>Name</span>
            <input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
          </label>
          <label>
            <span>Tier 1 rate</span>
            <input
              type="number"
              value={form.tier1Rate}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, tier1Rate: Number(event.target.value) }))
              }
            />
          </label>
          <label>
            <span>Tier 2 rate</span>
            <input
              type="number"
              value={form.tier2Rate}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, tier2Rate: Number(event.target.value) }))
              }
            />
          </label>
          {message ? <div className="empty-state full-width">{message}</div> : null}
          <button className="primary-button full-width" type="submit">
            Tao program
          </button>
        </form>
      </PageSection>

      <PageSection title="My programs">
        <ApiResult title="Programs" loading={programs.loading} error={programs.error} data={programs.data} />
      </PageSection>

      <PageSection title="My accounts">
        <ApiResult title="Accounts" loading={accounts.loading} error={accounts.error} data={accounts.data} />
      </PageSection>
    </div>
  );
}
