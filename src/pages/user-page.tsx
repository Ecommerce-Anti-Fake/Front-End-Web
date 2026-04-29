import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BreadcrumbNav } from '../components/breadcrumb-nav';
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
  [key: string]: unknown;
};

type ProfileCompletionRecord = {
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
  fullName?: string;
  dateOfBirth?: string;
  idType?: string;
  verificationStatus?: string;
  reviewNote?: string | null;
  documents?: KycDocumentRecord[];
  [key: string]: unknown;
};

type KycUploadSignature = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  publicId: string;
  uploadResourceType: 'image';
  signature: string;
};

type CloudinaryUploadResponse = {
  secure_url?: string;
  url?: string;
  public_id?: string;
};

const accountMenu = [
  { label: 'Thông tin tài khoản', to: '/user' },
  { label: 'Đơn hàng của tôi', to: '/orders' },
  { label: 'Cửa hàng của tôi', to: '/shops' },
  { label: 'Affiliate', to: '/affiliate' },
  { label: 'Giỏ hàng', to: '/cart' },
];

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
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [kycUploading, setKycUploading] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingKyc, setEditingKyc] = useState(false);

  const profileData = profile.data;
  const completionData = completion.data;
  const kycData = kyc.data;
  const missingFields = useMemo(
    () => (Array.isArray(completionData?.missingProfileFields) ? completionData.missingProfileFields : []),
    [completionData],
  );
  const kycStatus = String(kycData?.verificationStatus || 'Chưa nộp');

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
      setProfileMessage('Không tìm thấy ID người dùng để cập nhật hồ sơ.');
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

      setProfileMessage('Cập nhật hồ sơ thành công.');
      setEditingProfile(false);
      await Promise.all([profile.reload(), completion.reload()]);
    } catch (error) {
      setProfileMessage(error instanceof Error ? error.message : 'Cập nhật hồ sơ thất bại.');
    }
  }

  async function uploadKycImage(file: File, signature: KycUploadSignature) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', signature.apiKey);
    formData.append('timestamp', String(signature.timestamp));
    formData.append('folder', signature.folder);
    formData.append('public_id', signature.publicId);
    formData.append('signature', signature.signature);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${signature.cloudName}/${signature.uploadResourceType}/upload`,
      {
        method: 'POST',
        body: formData,
      },
    );

    const payload = (await response.json()) as CloudinaryUploadResponse & { error?: { message?: string } };

    if (!response.ok) {
      throw new Error(payload.error?.message || 'Upload ảnh KYC thất bại.');
    }

    return {
      fileUrl: String(payload.secure_url || payload.url || ''),
      publicId: String(payload.public_id || signature.publicId),
    };
  }

  async function handleSubmitKyc(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setKycMessage(null);

    if (!frontFile || !backFile) {
      setKycMessage('Vui lòng chọn ảnh mặt trước và mặt sau của Căn cước công dân.');
      return;
    }

    try {
      setKycUploading(true);
      const signatures = await apiRequest<KycUploadSignature[]>('/user/kyc/document-upload-signatures', {
        method: 'POST',
        accessToken: session?.accessToken,
        body: {
          items: [{ side: 'FRONT' }, { side: 'BACK' }],
        },
      });
      const frontSignature = signatures[0];
      const backSignature = signatures[1];

      if (!frontSignature || !backSignature) {
        throw new Error('Backend chưa trả đủ chữ ký upload cho 2 mặt CCCD.');
      }

      setKycMessage('Đang tải ảnh CCCD lên hệ thống lưu trữ...');
      const [frontUpload, backUpload] = await Promise.all([
        uploadKycImage(frontFile, frontSignature),
        uploadKycImage(backFile, backSignature),
      ]);

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
              mimeType: frontFile.type || 'image/jpeg',
              fileUrl: frontUpload.fileUrl,
              publicId: frontUpload.publicId,
            },
            {
              side: 'BACK',
              assetType: 'IMAGE',
              mimeType: backFile.type || 'image/jpeg',
              fileUrl: backUpload.fileUrl,
              publicId: backUpload.publicId,
            },
          ],
        },
      });

      setKycMessage('Gửi KYC thành công. Hồ sơ đang chờ duyệt.');
      setFrontFile(null);
      setBackFile(null);
      setEditingKyc(false);
      await Promise.all([kyc.reload(), completion.reload(), profile.reload()]);
    } catch (error) {
      setKycMessage(error instanceof Error ? error.message : 'Gửi KYC thất bại.');
    } finally {
      setKycUploading(false);
    }
  }

  return (
    <div className="account-page">
      <BreadcrumbNav items={[{ label: 'Trang chủ', to: '/' }, { label: 'Tài khoản của tôi' }]} />
      <h1>Quản lí tài khoản</h1>

      <div className="account-layout">
        <aside className="account-sidebar">
          <h3>Tài khoản</h3>
          {accountMenu.map((item, index) => (
            <Link key={`${item.to}-${index}`} to={item.to} className={index === 0 ? 'active' : ''}>
              {item.label}
            </Link>
          ))}
          <div className="sidebar-group">
            <strong>Sản phẩm so sánh</strong>
            <span>Bạn chưa có sản phẩm so sánh.</span>
          </div>
          <div className="sidebar-group">
            <strong>Yêu thích</strong>
            <span>Bạn chưa có sản phẩm yêu thích.</span>
          </div>
        </aside>

        <main className="account-main">
          <section className="account-panel">
            <div className="account-panel-header">
              <h2>Thông tin tài khoản</h2>
              <span>{profileData?.accountStatus || 'active'}</span>
            </div>

            <div className="account-info-grid">
              <div>
                <h4>Thông tin liên hệ</h4>
                <p>{profileData?.displayName || 'Chưa cập nhật tên'}</p>
                <p>{profileData?.email || profileData?.phone || '-'}</p>
                <button type="button" className="text-link" onClick={() => setEditingProfile(true)}>
                  Chỉnh sửa
                </button>
              </div>
              <div>
                <h4>Bản tin</h4>
                <p>Bạn đang nhận thông tin sản phẩm chính hãng và cảnh báo hàng giả.</p>
                <button type="button" className="text-link">
                  Chỉnh sửa
                </button>
              </div>
            </div>

            {editingProfile ? (
              <form className="panel-form two-columns slim-form account-edit-form" onSubmit={handleUpdateProfile}>
                <label>
                  <span>Tên hiển thị</span>
                  <input
                    value={profileForm.displayName}
                    onChange={(event) => setProfileForm((prev) => ({ ...prev, displayName: event.target.value }))}
                  />
                </label>
                <label>
                  <span>Số điện thoại</span>
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
                <div className="form-actions full-width">
                  <button className="primary-button" type="submit">
                    Lưu thay đổi
                  </button>
                  <button className="secondary-button" type="button" onClick={() => setEditingProfile(false)}>
                    Hủy
                  </button>
                </div>
              </form>
            ) : profileMessage ? (
              <div className="empty-state">{profileMessage}</div>
            ) : null}
          </section>

          <section className="account-panel">
            <div className="account-panel-header">
              <h2>Tóm tắt xác minh</h2>
              <span>{completionData?.isOrderReady ? 'Sẵn sàng đặt hàng' : 'Cần bổ sung'}</span>
            </div>
            <div className="account-info-grid">
              <div>
                <h4>Hồ sơ cá nhân</h4>
                <p>Vai trò: {profileData?.role || session?.user.role || '-'}</p>
                <p>Thông tin còn thiếu: {missingFields.length ? missingFields.join(', ') : 'Không có'}</p>
              </div>
              <div>
                <h4>KYC</h4>
                <p>Trạng thái: {kycStatus}</p>
                <p>{kycData?.reviewNote || 'Upload ảnh CCCD mặt trước và mặt sau để xác minh.'}</p>
                <button type="button" className="text-link" onClick={() => setEditingKyc((value) => !value)}>
                  {editingKyc ? 'Đóng form KYC' : 'Nộp / cập nhật KYC'}
                </button>
              </div>
            </div>

            {editingKyc ? (
              <form className="panel-form two-columns slim-form account-edit-form" onSubmit={handleSubmitKyc}>
                <label>
                  <span>Họ và tên</span>
                  <input
                    value={kycForm.fullName}
                    onChange={(event) => setKycForm((prev) => ({ ...prev, fullName: event.target.value }))}
                    required
                  />
                </label>
                <label>
                  <span>Ngày sinh</span>
                  <input
                    type="date"
                    value={kycForm.dateOfBirth}
                    onChange={(event) => setKycForm((prev) => ({ ...prev, dateOfBirth: event.target.value }))}
                    required
                  />
                </label>
                <label>
                  <span>Số điện thoại</span>
                  <input
                    value={kycForm.phone}
                    onChange={(event) => setKycForm((prev) => ({ ...prev, phone: event.target.value }))}
                  />
                </label>
                <label>
                  <span>Loại giấy tờ</span>
                  <input
                    value={kycForm.idType}
                    onChange={(event) => setKycForm((prev) => ({ ...prev, idType: event.target.value }))}
                    required
                  />
                </label>
                <label className="full-width">
                  <span>Số CCCD</span>
                  <input
                    value={kycForm.idNumber}
                    onChange={(event) => setKycForm((prev) => ({ ...prev, idNumber: event.target.value }))}
                    required
                  />
                </label>
                <label>
                  <span>Ảnh mặt trước CCCD</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => setFrontFile(event.target.files?.[0] ?? null)}
                    required
                  />
                  {frontFile ? <small className="muted">Đã chọn: {frontFile.name}</small> : null}
                </label>
                <label>
                  <span>Ảnh mặt sau CCCD</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => setBackFile(event.target.files?.[0] ?? null)}
                    required
                  />
                  {backFile ? <small className="muted">Đã chọn: {backFile.name}</small> : null}
                </label>
                {kycMessage ? <div className="empty-state full-width">{kycMessage}</div> : null}
                <div className="form-actions full-width">
                  <button className="primary-button" type="submit" disabled={kycUploading}>
                    {kycUploading ? 'Đang gửi KYC...' : 'Gửi KYC'}
                  </button>
                  <button className="secondary-button" type="button" onClick={() => setEditingKyc(false)}>
                    Hủy
                  </button>
                </div>
              </form>
            ) : kycMessage ? (
              <div className="empty-state">{kycMessage}</div>
            ) : null}
          </section>

          <section className="account-panel">
            <div className="account-panel-header">
              <h2>Sổ địa chỉ</h2>
              <button type="button" className="text-link">
                Quản lý địa chỉ
              </button>
            </div>
            <div className="account-info-grid">
              <div>
                <h4>Địa chỉ thanh toán mặc định</h4>
                <p>Bạn chưa thiết lập địa chỉ thanh toán mặc định.</p>
                <button type="button" className="text-link">
                  Sửa địa chỉ
                </button>
              </div>
              <div>
                <h4>Địa chỉ giao hàng mặc định</h4>
                <p>Bạn chưa thiết lập địa chỉ giao hàng mặc định.</p>
                <button type="button" className="text-link">
                  Sửa địa chỉ
                </button>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
