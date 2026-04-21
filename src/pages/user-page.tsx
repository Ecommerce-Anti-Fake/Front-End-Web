import { ApiResult } from '../components/api-result';
import { KeyValueList } from '../components/key-value-list';
import { PageSection } from '../components/page-section';
import { useApiQuery } from '../hooks/use-api-query';

export function UserPage() {
  const profile = useApiQuery('/user/userprofile');
  const completion = useApiQuery('/user/profile-completion');
  const kyc = useApiQuery('/user/kyc');

  return (
    <div className="page-stack">
      <header className="page-header">
        <p className="eyebrow">User</p>
        <h1>Profile va KYC</h1>
      </header>

      <PageSection title="Tom tat nguoi dung">
        <KeyValueList
          items={[
            { label: 'Loading profile', value: profile.loading ? 'Yes' : 'No' },
            {
              label: 'Profile completion',
              value: completion.data && typeof completion.data === 'object'
                ? JSON.stringify(completion.data)
                : '-',
            },
          ]}
        />
      </PageSection>

      <PageSection title="Current profile">
        <ApiResult title="Profile" loading={profile.loading} error={profile.error} data={profile.data} />
      </PageSection>

      <PageSection title="KYC">
        <ApiResult title="KYC" loading={kyc.loading} error={kyc.error} data={kyc.data} />
      </PageSection>
    </div>
  );
}
