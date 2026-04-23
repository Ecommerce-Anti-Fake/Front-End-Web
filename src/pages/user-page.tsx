import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ApiResult } from '../components/api-result';
import { KeyValueList } from '../components/key-value-list';
import { PageSection } from '../components/page-section';
import { useApiQuery } from '../hooks/use-api-query';
import { apiRequest } from '../lib/api-client';
import { useAuth } from '../modules/auth/auth-context';

type ProfileRecord = {
  id?: string;
  email?: string | null;
  phone?: string | null;
  displayName?: string | null;
  role?: string;
  accountStatus?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

type ProfileCompletionRecord = {
  userId?: string;
  missingProfileFields?: string[];
  isOrderReady?: boolean;
  [key: string]: unknown;
};

type KycDocumentRecord = {
  side?: 'FRONT' | 'BACK';
  assetType?: 'IMAGE';
  mimeType?: string;
  fileUrl?: string;
  publicId?: string;
};

type KycRecord = {
  id?: string;
  fullName?: string;
  dateOfBirth?: string;
  idType?: string;
  kycLevel?: string;
  verificationStatus?: string;
  reviewNote?: string | null;
  verifiedAt?: string | null;
  documents?: KycDocumentRecord[];
  [key: string]: unknown;
};

const initialProfileForm = {
  displayName: '',
  phone: '',
  email: '',
};

const initialKycForm = {
  fullName: '',
  dateOfBirth: '',
  phone: '',
  idType: 'CCCD',
  idNumber: '',
  frontMimeType: 'image/jpeg',
  frontFileUrl: '',
  frontPublicId: '',
  backMimeType: 'image/jpeg',
  backFileUrl: '',
  backPublicId: '',
};

export function UserPage() {
  const { session } = useAuth();
  const profile = useApiQuery<ProfileRecord>('/user/userprofile');
  const completion = useApiQuery<ProfileCompletionRecord>('/user/profile-completion');
  const kyc = useApiQuery<KycRecord | null>('/user/kyc');

  const [profileForm, setProfileForm] = useState(initialProfileForm);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [kycForm, setKycForm] = useState(initialKycForm);
  const [kycMessage, setKycMessage] = useState<string | null>(null);
  const [signatureResult, setSignatureResult] = useState<unknown>(null);

  const profileData = profile.data;
  const completionData = completion.data;
  const kycData = kyc.data;
  const missingFields = useMemo(
    () => (Array.isArray(completionData?.missingProfileFields) ? completionData.missingProfileFields : []),
    [completionData],
  );

  useEffect(() => {
    setProfileForm((prev) => ({
      ...prev,
      displayName: prev.displayName || String(profileData?.displayName || ''),
      phone: prev.phone || String(profileData?.phone || ''),
      email: prev.email || String(profileData?.email || ''),
    }));
  }, [profileData]);

  useEffect(() => {
    setKycForm((prev) => ({
      ...prev,
      fullName: prev.fullName || String(kycData?.fullName || profileData?.displayName || ''),
      phone: prev.phone || String(profileData?.phone || ''),
      dateOfBirth:
        prev.dateOfBirth || (typeof kycData?.dateOfBirth === 'string' ? kycData.dateOfBirth.slice(0, 10) : ''),
      idType: prev.idType || String(kycData?.idType || 'CCCD'),
    }));
  }, [kycData, profileData]);

  async function handleUpdateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileMessage(null);

    if (!profileData?.id) {
      setProfileMessage('Khong tim thay user id de cap nhat profile.');
      return;
    }

    try {
      await apiRequest(`/user/${profileData.id}`, {
        method: 'PATCH',
        accessToken: session?.accessToken,
        body: {
          displayName: profileForm.displayName || undefined,
          phone: profileForm.phone || undefined,
          email: profileForm.email || undefined,
        },
      });

      setProfileMessage('Cap nhat profile thanh cong.');
      await Promise.all([profile.reload(), completion.reload()]);
    } catch (error) {
      setProfileMessage(error instanceof Error ? error.message : 'Update profile failed');
    }
  }

  async function handleGetKycSignatures(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setKycMessage(null);

    try {
      const response = await apiRequest('/user/kyc/document-upload-signatures', {
        method: 'POST',
        accessToken: session?.accessToken,
        body: {
          items: [{ side: 'FRONT' }, { side: 'BACK' }],
        },
      });

      setSignatureResult(response);
      setKycMessage('Lay KYC upload signatures thanh cong.');
    } catch (error) {
      setKycMessage(error instanceof Error ? error.message : 'Get KYC signatures failed');
    }
  }

  async function handleSubmitKyc(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setKycMessage(null);

    try {
      await apiRequest('/user/kyc', {
        method: 'POST',
        accessToken: session?.accessToken,
        body: {
          fullName: kycForm.fullName,
          dateOfBirth: kycForm.dateOfBirth,
          phone: kycForm.phone || undefined,
          idType: kycForm.idType,
          idNumber: kycForm.idNumber,
          documents: [
            {
              side: 'FRONT',
              assetType: 'IMAGE',
              mimeType: kycForm.frontMimeType,
              fileUrl: kycForm.frontFileUrl,
              publicId: kycForm.frontPublicId,
            },
            {
              side: 'BACK',
              assetType: 'IMAGE',
              mimeType: kycForm.backMimeType,
              fileUrl: kycForm.backFileUrl,
              publicId: kycForm.backPublicId,
            },
          ],
        },
      });

      setKycMessage('Gui KYC thanh cong.');
      await Promise.all([kyc.reload(), completion.reload(), profile.reload()]);
    } catch (error) {
      setKycMessage(error instanceof Error ? error.message : 'Submit KYC failed');
    }
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <p className="eyebrow">User</p>
        <h1>Profile va KYC</h1>
        <p className="muted">
          Day la luong user co the thao tac duoc: bo sung profile, xin upload signature va nop ho so KYC.
        </p>
      </header>

      <PageSection title="Tom tat nguoi dung">
        <KeyValueList
          items={[
            { label: 'Display name', value: profileData?.displayName || '-' },
            { label: 'Email', value: profileData?.email || '-' },
            { label: 'Phone', value: profileData?.phone || '-' },
            { label: 'Role', value: profileData?.role || session?.user.role || '-' },
            { label: 'Account status', value: profileData?.accountStatus || '-' },
            { label: 'Order ready', value: completionData?.isOrderReady ? 'Yes' : 'No' },
            { label: 'Missing fields', value: missingFields.length ? missingFields.join(', ') : 'Khong co' },
            { label: 'KYC status', value: kycData?.verificationStatus || 'Chua nop' },
          ]}
        />
      </PageSection>

      <PageSection title="Cap nhat profile" description="Hoan thien so dien thoai va ten hien thi de di tiep cac flow mua hang.">
        <form className="panel-form two-columns" onSubmit={handleUpdateProfile}>
          <label>
            <span>Display name</span>
            <input
              value={profileForm.displayName}
              onChange={(event) => setProfileForm((prev) => ({ ...prev, displayName: event.target.value }))}
            />
          </label>
          <label>
            <span>Phone</span>
            <input
              value={profileForm.phone}
              onChange={(event) => setProfileForm((prev) => ({ ...prev, phone: event.target.value }))}
            />
          </label>
          <label className="full-width">
            <span>Email</span>
            <input
              value={profileForm.email}
              onChange={(event) => setProfileForm((prev) => ({ ...prev, email: event.target.value }))}
            />
          </label>
          {profileMessage ? <div className="empty-state full-width">{profileMessage}</div> : null}
          <button className="primary-button full-width" type="submit">
            Cap nhat profile
          </button>
        </form>
      </PageSection>

      <PageSection
        title="KYC"
        description="Buoc 1 lay upload signature cho mat truoc va mat sau CCCD. Buoc 2 upload len storage. Buoc 3 quay lai day dan file URL va public ID de nop KYC."
      >
        <form className="panel-form" onSubmit={handleGetKycSignatures}>
          <button className="secondary-button" type="submit">
            Lay KYC upload signatures
          </button>
        </form>

        {kycMessage ? <div className="empty-state">{kycMessage}</div> : null}
        {signatureResult ? (
          <ApiResult title="KYC upload signatures" loading={false} error={null} data={signatureResult} />
        ) : null}

        <form className="panel-form two-columns" onSubmit={handleSubmitKyc}>
          <label>
            <span>Full name</span>
            <input
              value={kycForm.fullName}
              onChange={(event) => setKycForm((prev) => ({ ...prev, fullName: event.target.value }))}
              required
            />
          </label>
          <label>
            <span>Date of birth</span>
            <input
              type="date"
              value={kycForm.dateOfBirth}
              onChange={(event) => setKycForm((prev) => ({ ...prev, dateOfBirth: event.target.value }))}
              required
            />
          </label>
          <label>
            <span>Phone</span>
            <input
              value={kycForm.phone}
              onChange={(event) => setKycForm((prev) => ({ ...prev, phone: event.target.value }))}
            />
          </label>
          <label>
            <span>ID type</span>
            <input
              value={kycForm.idType}
              onChange={(event) => setKycForm((prev) => ({ ...prev, idType: event.target.value }))}
              required
            />
          </label>
          <label className="full-width">
            <span>ID number</span>
            <input
              value={kycForm.idNumber}
              onChange={(event) => setKycForm((prev) => ({ ...prev, idNumber: event.target.value }))}
              required
            />
          </label>
          <label>
            <span>Front mime type</span>
            <input
              value={kycForm.frontMimeType}
              onChange={(event) => setKycForm((prev) => ({ ...prev, frontMimeType: event.target.value }))}
              required
            />
          </label>
          <label>
            <span>Back mime type</span>
            <input
              value={kycForm.backMimeType}
              onChange={(event) => setKycForm((prev) => ({ ...prev, backMimeType: event.target.value }))}
              required
            />
          </label>
          <label className="full-width">
            <span>Front file URL</span>
            <input
              value={kycForm.frontFileUrl}
              onChange={(event) => setKycForm((prev) => ({ ...prev, frontFileUrl: event.target.value }))}
              required
            />
          </label>
          <label className="full-width">
            <span>Front public ID</span>
            <input
              value={kycForm.frontPublicId}
              onChange={(event) => setKycForm((prev) => ({ ...prev, frontPublicId: event.target.value }))}
              required
            />
          </label>
          <label className="full-width">
            <span>Back file URL</span>
            <input
              value={kycForm.backFileUrl}
              onChange={(event) => setKycForm((prev) => ({ ...prev, backFileUrl: event.target.value }))}
              required
            />
          </label>
          <label className="full-width">
            <span>Back public ID</span>
            <input
              value={kycForm.backPublicId}
              onChange={(event) => setKycForm((prev) => ({ ...prev, backPublicId: event.target.value }))}
              required
            />
          </label>
          <button className="primary-button full-width" type="submit">
            Gui KYC
          </button>
        </form>
      </PageSection>

      <PageSection title="Current profile">
        <ApiResult title="Profile" loading={profile.loading} error={profile.error} data={profile.data} />
      </PageSection>

      <PageSection title="Current KYC">
        <ApiResult title="KYC" loading={kyc.loading} error={kyc.error} data={kyc.data} />
      </PageSection>
    </div>
  );
}
