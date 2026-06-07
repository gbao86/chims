# Changelog

Toàn bộ lịch sử các thay đổi lớn của dự án CHIMS sẽ được ghi nhận tại file này.

## [1.1.0] - 2026-06-07

### Added
- Tạo kịch bản riêng [create_demo_user.py](file:///D:/Hoc%20Tap/TTTN/chims/backend/app/scripts/create_demo_user.py) giúp thêm mới hoặc cập nhật tài khoản `demo` trực tiếp vào database mà không xoá hay xáo trộn các dữ liệu sẵn có của cửa hàng.
- Bổ sung tài liệu đăng nhập và hoạt động của tài khoản Demo vào [README.md](file:///D:/Hoc%20Tap/TTTN/chims/README.md).

### Changed
- Cấu hình tài khoản `demo` (mật khẩu `demo123`, vai trò `admin`) ở trạng thái **Chỉ xem (Read-only)**.
- Triển khai bộ lọc (Guard) tại API Authentication Dependency [dependencies.py](file:///D:/Hoc%20Tap/TTTN/chims/backend/app/auth/dependencies.py) nhằm chặn toàn bộ các yêu cầu sửa đổi cơ sở dữ liệu (`POST`, `PUT`, `PATCH`, `DELETE`) từ tài khoản demo, đồng thời đưa các API phân tích PC (AI analyze) và check tương thích vào danh sách trắng để cho phép chạy thử nghiệm.
