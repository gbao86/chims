# Changelog

Toàn bộ lịch sử các thay đổi lớn của dự án CHIMS sẽ được ghi nhận tại file này.

## [1.2.0] - 2026-06-11

### Added
- **Backend (BE)**:
  - Hỗ trợ xác thực linh hoạt qua cả hai phương thức: `Authorization` header và HttpOnly Cookie (`chims_token`) trong `get_current_user` dependency.
  - Thêm endpoint `/api/auth/logout` để xóa cookie xác thực HttpOnly từ trình duyệt.
  - Backend tự động ghi HttpOnly Cookie khi đăng nhập thành công, hỗ trợ cấu hình `Secure` / `SameSite` tự động theo giao thức kết nối (HTTP local / HTTPS production).
  - Bổ sung hàm tiện ích `get_client()` trong `database.py` để hỗ trợ khởi tạo MongoDB Transaction Sessions.
- **Frontend (FE)**:
  - Tích hợp Next.js Server-side Middleware (`middleware.ts`) kiểm tra cookie `chims_token` và điều hướng trực tiếp trên server, loại bỏ hoàn toàn hiện tượng blank flash khi tải trang Dashboard.
  - Áp dụng chiến lược xác thực kép (Dual Auth) cho kiến trúc triển khai cross-domain (Vercel + Render): cookie trên frontend domain cho Middleware routing, `Authorization` header từ `localStorage` cho API calls.

### Fixed
- **Backend (BE)**:
  - Chuyển đổi Groq SDK từ đồng bộ (`Groq`) sang bất đồng bộ (`AsyncGroq`) trong `ai_service.py` — khắc phục lỗi nghẽn Event Loop của FastAPI khi gọi API phân tích AI.
  - Sửa lỗi nạp font chữ phụ thuộc hệ điều hành (Windows-only) trong `exports.py` — chuyển sang sử dụng font `NotoSans` đóng gói kèm dự án, khắc phục lỗi 500 khi xuất PDF trên Render (Linux).
  - Áp dụng MongoDB Multi-document Transactions trong `sales.py` cho nghiệp vụ cập nhật trạng thái đơn hàng (trừ/cộng tồn kho, cập nhật thống kê khách hàng) — đảm bảo tính toàn vẹn dữ liệu ACID.
  - Vá lỗi tương thích `passlib` + `bcrypt 4.x` (`AttributeError: module 'bcrypt' has no attribute '__about__'`) bằng runtime monkey-patch trong `app/__init__.py`.
- **Frontend (FE)**:
  - Khắc phục lỗi vòng lặp đăng nhập (login redirect loop) trên môi trường triển khai cross-domain do trình duyệt chặn cookie bên thứ ba — khôi phục Axios request interceptor gắn `Authorization` header kèm theo cookie frontend domain.
  - Gỡ bỏ logic kiểm tra auth client-side (`useEffect` + `localStorage`) trong `layout.tsx`, thay thế bằng Next.js Middleware trên server.
  - Cải tiến `Header.tsx` gọi API `/api/auth/logout` khi đăng xuất để xóa cookie từ cả backend và frontend domain.

## [1.1.0] - 2026-06-07

### Added
- Tạo kịch bản riêng [create_demo_user.py](file:///D:/Hoc%20Tap/TTTN/chims/backend/app/scripts/create_demo_user.py) giúp thêm mới hoặc cập nhật tài khoản `demo` trực tiếp vào database mà không xoá hay xáo trộn các dữ liệu sẵn có của cửa hàng.
- Bổ sung tài liệu đăng nhập và hoạt động của tài khoản Demo vào [README.md](file:///D:/Hoc%20Tap/TTTN/chims/README.md).

### Changed
- Cấu hình tài khoản `demo` (mật khẩu `demo123`, vai trò `admin`) ở trạng thái **Chỉ xem (Read-only)**.
- Triển khai bộ lọc (Guard) tại API Authentication Dependency [dependencies.py](file:///D:/Hoc%20Tap/TTTN/chims/backend/app/auth/dependencies.py) nhằm chặn toàn bộ các yêu cầu sửa đổi cơ sở dữ liệu (`POST`, `PUT`, `PATCH`, `DELETE`) từ tài khoản demo, đồng thời đưa các API phân tích PC (AI analyze) và check tương thích vào danh sách trắng để cho phép chạy thử nghiệm.
