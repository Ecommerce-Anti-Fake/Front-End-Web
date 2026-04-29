import { Link } from 'react-router-dom';

export function SiteFooter() {
  return (
    <footer className="site-footer exclusive-footer">
      <div className="newsletter-band">
        <div className="site-container newsletter-inner">
          <div>
            <h2>Đăng ký nhận bản tin</h2>
            <p>Nhận thông tin offer chính hãng, cảnh báo rủi ro và ưu đãi từ shop đã xác thực.</p>
          </div>
          <form className="newsletter-form">
            <input placeholder="Email của bạn" aria-label="Email đăng ký bản tin" />
            <button type="button">Đăng ký</button>
          </form>
        </div>
      </div>

      <div className="site-container footer-grid">
        <div>
          <h3>AntiFake</h3>
          <p>
            Nền tảng thương mại điện tử tập trung vào xác thực shop, truy xuất sản phẩm, phân phối đại lý và bảo vệ
            người mua.
          </p>
          <div className="footer-socials">
            <span>f</span>
            <span>ig</span>
            <span>yt</span>
          </div>
        </div>
        <div>
          <h4>Danh mục</h4>
          <Link to="/products">Sản phẩm</Link>
          <Link to="/shops">Mở shop</Link>
          <Link to="/distribution">Phân phối</Link>
          <Link to="/affiliate">Affiliate</Link>
        </div>
        <div>
          <h4>Tài khoản</h4>
          <Link to="/user">Hồ sơ & KYC</Link>
          <Link to="/cart">Giỏ hàng</Link>
          <Link to="/orders">Đơn hàng</Link>
          <Link to="/admin">Quản trị</Link>
        </div>
        <div>
          <h4>Hỗ trợ</h4>
          <p>Địa chỉ: Trung tâm xác thực hàng hóa, Việt Nam</p>
          <p>Hotline: 1900 6868</p>
          <p>Email: support@antifake.local</p>
        </div>
      </div>

      <div className="site-container footer-bottom">Copyright © 2026 AntiFake Market. All rights reserved.</div>
    </footer>
  );
}
