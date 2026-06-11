<div align="center">

# ⚡ CHIMS Backend

<img src="https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi&logoColor=white"/>
<img src="https://img.shields.io/badge/Python-3.12+-3776AB?style=for-the-badge&logo=python&logoColor=white"/>
<img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white"/>
<img src="https://img.shields.io/badge/Groq-Llama_3.3_70B-F55036?style=for-the-badge&logo=meta&logoColor=white"/>

<br/>

**REST API cho Hệ thống Quản lý Kho Phần cứng Máy tính**  
*FastAPI · PyMongo Async · MongoDB Atlas · JWT Auth · AI PC Builder*

<br/>

[![API Live](https://img.shields.io/badge/🚀_API_LIVE-chims--backend.onrender.com-009688?style=flat-square)](https://chims-backend.onrender.com)
[![Swagger](https://img.shields.io/badge/📄_Swagger_UI-/docs-85EA2D?style=flat-square&logo=swagger&logoColor=black)](https://chims-backend.onrender.com/docs)
[![ReDoc](https://img.shields.io/badge/📘_ReDoc-/redoc-4A90E2?style=flat-square)](https://chims-backend.onrender.com/redoc)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue?style=flat-square)](../LICENSE)

</div>

---

## 📋 Mục lục

- [Tổng quan](#-tổng-quan)
- [Tech Stack](#-tech-stack)
- [Cấu trúc thư mục](#-cấu-trúc-thư-mục)
- [API Endpoints](#-api-endpoints)
- [Cài đặt & Chạy local](#-cài-đặt--chạy-local)
- [Biến môi trường](#-biến-môi-trường)
- [Authentication](#-authentication)
- [AI Integration](#-ai-integration)
- [Database](#-database)
- [Triển khai](#-triển-khai)

---

## 🧠 Tổng quan

Backend của **CHIMS** là một REST API được xây dựng bằng **FastAPI** — framework hiện đại, hiệu năng cao cho Python. Cung cấp 17+ module API phục vụ toàn bộ nghiệp vụ của một hệ thống quản lý phần cứng máy tính chuyên nghiệp.

```
📦 17+ Route modules    🔐 JWT Authentication    🤖 AI PC Analyzer
📊 Real-time Dashboard  📁 Excel/PDF Export      🔄 Async MongoDB
```

---

## 🛠️ Tech Stack

| Thành phần | Công nghệ | Phiên bản |
|---|---|---|
| **Web Framework** | [FastAPI](https://fastapi.tiangolo.com) | `0.115.0` |
| **ASGI Server** | [Uvicorn](https://www.uvicorn.org) (standard) | `0.30.0` |
| **Database Driver** | [PyMongo](https://pymongo.readthedocs.io) | `≥ 4.9.0` |
| **Data Validation** | [Pydantic v2](https://docs.pydantic.dev) | `2.9.0` |
| **Settings** | [pydantic-settings](https://docs.pydantic.dev/latest/concepts/pydantic_settings/) | `2.5.0` |
| **Auth** | [python-jose](https://python-jose.readthedocs.io) + [bcrypt](https://pypi.org/project/bcrypt/) | `3.3.0` / `4.1.2` |
| **AI** | [GroqCloud](https://console.groq.com) — Llama 3.3 70B | `≥ 1.2.0` |
| **Excel Export** | [openpyxl](https://openpyxl.readthedocs.io) | `3.1.5` |
| **PDF Export** | [ReportLab](https://www.reportlab.com) | `4.2.2` |
| **Web Scraping** | [BeautifulSoup4](https://www.crummy.com/software/BeautifulSoup/) + Requests | `≥ 4.12.0` |

---

## 📁 Cấu trúc thư mục

```
backend/
├── app/
│   ├── auth/
│   │   ├── routes.py          # POST /api/auth/login, /profile, /logout
│   │   └── utils.py           # JWT encode/decode, password hashing
│   │
│   ├── models/                # Pydantic schemas (request & response)
│   │   ├── inventory.py
│   │   ├── sales.py
│   │   ├── purchase_orders.py
│   │   ├── customers.py
│   │   ├── builds.py
│   │   └── ...
│   │
│   ├── routes/                # 17 API route modules
│   │   ├── audit.py           # Kiểm kê & thanh lý
│   │   ├── builds.py          # PC Builder + AI analyze
│   │   ├── catalog_sync.py    # Đồng bộ catalog sản phẩm
│   │   ├── customers.py       # Quản lý khách hàng
│   │   ├── dashboard.py       # Dữ liệu dashboard real-time
│   │   ├── exports.py         # Xuất Excel / PDF
│   │   ├── inventory.py       # Quản lý SKU & tồn kho
│   │   ├── purchase_orders.py # Đơn nhập hàng
│   │   ├── reports.py         # Báo cáo tổng hợp
│   │   ├── rma.py             # Return Merchandise Authorization
│   │   ├── sales.py           # Đơn bán hàng
│   │   ├── serial_units.py    # Theo dõi serial number
│   │   ├── suppliers.py       # Quản lý nhà cung cấp
│   │   ├── tickets.py         # Phiếu bảo trì / sửa chữa
│   │   ├── users.py           # Quản lý người dùng
│   │   ├── warehouses.py      # Kho vật lý & chuyển kho
│   │   └── warranty.py        # Phiếu bảo hành
│   │
│   ├── services/
│   │   ├── ai_service.py      # GroqCloud Llama 3.3 70B integration
│   │   └── compatibility.py   # Kiểm tra tương thích linh kiện PC
│   │
│   ├── scripts/               # Utility scripts
│   ├── assets/                # Static assets
│   ├── config.py              # Settings via pydantic-settings
│   ├── database.py            # MongoDB async connection & collections
│   ├── main.py                # FastAPI app entry point + CORS
│   └── seed.py                # Database seeding script
│
├── .env                       # (gitignored) biến môi trường
├── .env.example               # Template cấu hình
└── requirements.txt
```

---

## 📡 API Endpoints

> Xem tài liệu đầy đủ + thử trực tiếp tại **[/docs](https://chims-backend.onrender.com/docs)**

| Module | Prefix | Mô tả |
|---|---|---|
| 🔐 **Authentication** | `/api/auth` | Đăng nhập, cập nhật thông tin cá nhân, đăng xuất (HttpOnly Cookie) |
| 📦 **Inventory** | `/api/inventory` | CRUD SKU, tìm kiếm, lọc theo danh mục |
| 🛒 **Sales** | `/api/sales` | Tạo & quản lý đơn bán hàng |
| 🛍️ **Purchase Orders** | `/api/purchase-orders` | Đơn nhập hàng từ nhà cung cấp |
| 👥 **Customers** | `/api/customers` | Quản lý khách hàng |
| 🏭 **Suppliers** | `/api/suppliers` | Quản lý nhà cung cấp |
| 🛡️ **Warranty** | `/api/warranty` | Phiếu bảo hành theo serial |
| 🔢 **Serial Units** | `/api/serial-units` | Theo dõi từng đơn vị serial |
| 🖥️ **PC Builds** | `/api/builds` | Cấu hình PC + AI phân tích |
| 🏭 **Warehouses** | `/api/warehouses` | Kho vật lý & chuyển kho |
| 🔄 **RMA** | `/api/rma` | Xử lý hàng trả, hoàn tiền, đổi mới |
| 🔧 **Maintenance** | `/api/tickets` | Phiếu bảo trì & sửa chữa |
| 📊 **Audit** | `/api/audit` | Kiểm kê & thanh lý hàng tồn |
| 📈 **Reports** | `/api/reports` | Báo cáo doanh thu, lợi nhuận |
| 📥 **Exports** | `/api/exports` | Xuất file Excel / PDF |
| 🖥️ **Dashboard** | `/api/dashboard` | Thống kê real-time |
| 🗂️ **Catalog** | `/api/catalog` | Đồng bộ catalog sản phẩm |
| 👤 **Users** | `/api/users` | Quản lý tài khoản người dùng |

---

## 🚀 Cài đặt & Chạy local

### Yêu cầu

- **Python** `3.12+`
- **MongoDB Atlas** cluster (hoặc MongoDB local)
- **GroqCloud API key** — miễn phí tại [console.groq.com](https://console.groq.com)

### Bước 1 — Cài dependencies

```bash
cd backend
pip install -r requirements.txt
```

### Bước 2 — Cấu hình môi trường

```bash
cp .env.example .env
# Điền thông tin vào .env
```

### Bước 3 — Chạy server

```bash
uvicorn app.main:app --reload
```

| Endpoint | URL |
|---|---|
| 🌐 Base API | `http://localhost:8000` |
| 📄 Swagger UI | `http://localhost:8000/docs` |
| 📘 ReDoc | `http://localhost:8000/redoc` |
| 📊 Health Check | `http://localhost:8000/api/dashboard/stats` |

### (Tuỳ chọn) Seed dữ liệu mẫu

```bash
cd backend
python -m app.seed
```

---

## ⚙️ Biến môi trường

Tạo file `backend/.env` dựa theo `.env.example`:

```env
# ── Database ─────────────────────────────────────────────
MONGODB_URL=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
DB_NAME=chims

# ── Authentication ────────────────────────────────────────
JWT_SECRET=your-super-secret-key-change-in-production
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440

# ── AI Service (GroqCloud — Free tier) ───────────────────
# Lấy key tại: https://console.groq.com
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ── Khởi tạo Database Seeds (Tuỳ chọn) ───────────────────
# Mật khẩu mặc định cho các tài khoản khi chạy seed.py (nếu để trống sẽ nhận giá trị mẫu)
SEED_ADMIN_PASSWORD=your_secure_admin_password
SEED_TECH_PASSWORD=your_secure_tech_password
SEED_SALES_PASSWORD=your_secure_sales_password
```

> ⚠️ **Không commit file `.env` lên git** — đã có trong `.gitignore`.

---

## 🔐 Authentication

API hỗ trợ xác thực linh hoạt qua **hai phương thức song song** — phù hợp cho cả triển khai same-domain và cross-domain (Vercel + Render):

```
POST /api/auth/login
  Body: { "username": "...", "password": "..." }
  → JSON: { "access_token": "...", "token_type": "bearer" }
  → Cookie: chims_token (HttpOnly, Secure, SameSite)

POST /api/auth/logout
  → Xóa cookie chims_token
```

**Phương thức xác thực được chấp nhận (theo thứ tự ưu tiên):**
1. `Authorization: Bearer <access_token>` header (cho cross-domain API calls)
2. `chims_token` HttpOnly Cookie (cho same-domain hoặc server-side rendering)

- Token được ký bằng `HS256` với secret key từ biến môi trường.
- Thời hạn mặc định: **24 giờ** (có thể cấu hình qua `JWT_EXPIRE_MINUTES`).
- Password hash bằng **bcrypt** thông qua `passlib` (đã vá tương thích bcrypt 4.x).

---

## 🤖 AI Integration

Module `app/services/ai_service.py` tích hợp **GroqCloud API** với mô hình **Llama 3.3 70B Versatile** để phân tích cấu hình PC:

```
POST /api/builds/{id}/analyze
```

- Nhận danh sách linh kiện (CPU, GPU, RAM, Mainboard, PSU, Storage…)
- Gửi prompt đến Llama 3.3 70B qua GroqCloud
- Trả về **nhận xét chi tiết bằng tiếng Việt**: hiệu năng, tính tương thích, đề xuất nâng cấp
- Kiểm tra tương thích tự động bằng `compatibility.py`: socket CPU/Mainboard, TDP, loại RAM, công suất PSU

---

## 🗄️ Database

MongoDB Atlas với **PyMongo Async Driver**. Hỗ trợ **Multi-document Transactions** cho các nghiệp vụ nhạy cảm (cập nhật trạng thái đơn hàng, trừ/cộng tồn kho).

### Collections chính

| Collection | Mô tả |
|---|---|
| `inventory` | SKU sản phẩm, tồn kho, hình ảnh |
| `serial_units` | Từng đơn vị sản phẩm theo serial number |
| `sales` | Đơn bán hàng |
| `purchase_orders` | Đơn nhập hàng |
| `customers` | Khách hàng |
| `suppliers` | Nhà cung cấp |
| `warranty` | Phiếu bảo hành |
| `builds` | Cấu hình PC đã lưu |
| `tickets` | Phiếu bảo trì / sửa chữa |
| `rma` | Hàng trả lại |
| `warehouses` | Kho vật lý |
| `audit_sessions` | Phiên kiểm kê |
| `users` | Tài khoản người dùng |

### Kết nối

```python
# app/database.py
from motor.motor_asyncio import AsyncIOMotorClient

client = AsyncIOMotorClient(MONGODB_URL)
db = client[DB_NAME]
```

---

## ☁️ Triển khai

Backend được deploy trên **Render** (Free tier):

| | |
|---|---|
| 🌐 **Base URL** | [https://chims-backend.onrender.com](https://chims-backend.onrender.com) |
| 📄 **Swagger UI** | [https://chims-backend.onrender.com/docs](https://chims-backend.onrender.com/docs) |
| 📘 **ReDoc** | [https://chims-backend.onrender.com/redoc](https://chims-backend.onrender.com/redoc) |

> ℹ️ Render free tier sẽ **spin down** sau 15 phút không có request. Lần đầu truy cập có thể mất 30–60 giây để khởi động lại.

### CORS

Đã cấu hình cho phép các origin sau:
- `http://localhost:3000`, `http://localhost:3001`  
- Tất cả Vercel deployment URLs: `https://*.vercel.app`

---

## 👤 Tác giả

**Trịnh Gia Bảo** — [github.com/gbao86](https://github.com/gbao86)  
📧 tiktokthu10@gmail.com

---

<div align="center">

**[⬆ Về đầu trang](#-chims-backend)** &nbsp;·&nbsp; **[📄 Root README](../README.md)** &nbsp;·&nbsp; **[🌐 Frontend README](../frontend/README.md)**

<sub>Licensed under GNU GPL v3.0 · Copyright © 2026 gbao86</sub>

</div>
