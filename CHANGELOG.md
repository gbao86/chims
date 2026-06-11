# Changelog

Toàn bộ lịch sử các thay đổi lớn của dự án CHIMS sẽ được ghi nhận tại file này.

## [1.2.0] - 2026-06-11

### Added
- **Backend (BE)**:
  - Hỗ trợ phương thức xác thực qua HttpOnly Cookie (`chims_token`) bảo mật chống XSS trong [routes.py](file:///D:/Hoc%20Tap/TTTN/chims/backend/app/auth/routes.py).
  - Thêm endpoint `/api/auth/logout` để xóa cookie xác thực từ trình duyệt client.
  - Bổ sung hàm tiện ích `get_client()` trong [database.py](file:///D:/Hoc%20Tap/TTTN/chims/backend/app/database.py) nhằm hỗ trợ quản lý transaction session.
- **Frontend (FE)**:
  - Tích hợp Next.js Server-side Middleware tại [middleware.ts](file:///D:/Hoc%20Tap/TTTN/chims/frontend/src/middleware.ts) để kiểm tra token từ cookie bảo mật và điều hướng trực tiếp trên server, loại bỏ hoàn toàn blank flash.

### Fixed
- **Backend (BE)**:
  - Chuyển đổi Groq SDK từ đồng bộ sang bất đồng bộ bằng `AsyncGroq` trong [ai_service.py](file:///D:/Hoc%20Tap/TTTN/chims/backend/app/services/ai_service.py) để tránh nghẽn Event Loop của FastAPI.
  - Sửa lỗi nạp font chữ phụ thuộc hệ điều hành (OS-dependent) trong [exports.py](file:///D:/Hoc%20Tap/TTTN/chims/backend/app/routes/exports.py) sang sử dụng font `NotoSans` đóng gói kèm dự án, khắc phục lỗi 500 khi chạy trên Render (Linux).
  - Áp dụng MongoDB Multi-document Transactions trong [sales.py](file:///D:/Hoc%20Tap/TTTN/chims/backend/app/routes/sales.py) khi thực hiện cập nhật kho hàng và thay đổi trạng thái đơn hàng để đảm bảo tính toàn vẹn dữ liệu (ACID).
- **Frontend (FE)**:
  - Loại bỏ hoàn toàn việc lưu trữ token trong `localStorage` tại [auth.tsx](file:///D:/Hoc%20Tap/TTTN/chims/frontend/src/lib/auth.tsx), [page.tsx](file:///D:/Hoc%20Tap/TTTN/chims/frontend/src/app/login/page.tsx), và [api.ts](file:///D:/Hoc%20Tap/TTTN/chims/frontend/src/lib/api.ts).
  - Cấu hình Axios `withCredentials: true` để tự động gửi cookie an toàn.
  - Cải tiến [layout.tsx](file:///D:/Hoc%20Tap/TTTN/chims/frontend/src/app/%28dashboard%29/layout.tsx) và [Header.tsx](file:///D:/Hoc%20Tap/TTTN/chims/frontend/src/components/layout/Header.tsx) để gỡ bỏ logic kiểm tra auth client-side chậm và thêm lệnh gọi đăng xuất backend.

## [1.1.0] - 2026-06-07

### Added
- Tạo kịch bản riêng [create_demo_user.py](file:///D:/Hoc%20Tap/TTTN/chims/backend/app/scripts/create_demo_user.py) giúp thêm mới hoặc cập nhật tài khoản `demo` trực tiếp vào database mà không xoá hay xáo trộn các dữ liệu sẵn có của cửa hàng.
- Bổ sung tài liệu đăng nhập và hoạt động của tài khoản Demo vào [README.md](file:///D:/Hoc%20Tap/TTTN/chims/README.md).

### Changed
- Cấu hình tài khoản `demo` (mật khẩu `demo123`, vai trò `admin`) ở trạng thái **Chỉ xem (Read-only)**.
- Triển khai bộ lọc (Guard) tại API Authentication Dependency [dependencies.py](file:///D:/Hoc%20Tap/TTTN/chims/backend/app/auth/dependencies.py) nhằm chặn toàn bộ các yêu cầu sửa đổi cơ sở dữ liệu (`POST`, `PUT`, `PATCH`, `DELETE`) từ tài khoản demo, đồng thời đưa các API phân tích PC (AI analyze) và check tương thích vào danh sách trắng để cho phép chạy thử nghiệm.
