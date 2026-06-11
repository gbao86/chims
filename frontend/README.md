<div align="center">

# 🖥️ CHIMS Frontend

<img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js&logoColor=white"/>
<img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black"/>
<img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white"/>
<img src="https://img.shields.io/badge/Ant_Design-6-0170FE?style=for-the-badge&logo=antdesign&logoColor=white"/>

<br/>

**Giao diện quản lý cho Hệ thống Quản lý Kho Phần cứng Máy tính**  
*Next.js 16 · React 19 · TypeScript · Ant Design 6 · Recharts · Tailwind CSS 4*

<br/>

[![Live Demo](https://img.shields.io/badge/🚀_LIVE_DEMO-chims--ten.vercel.app-000000?style=flat-square&logo=vercel)](https://chims-ten.vercel.app/)
[![Backend API](https://img.shields.io/badge/⚡_Backend_API-chims--backend.onrender.com-009688?style=flat-square&logo=render)](https://chims-backend.onrender.com)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue?style=flat-square)](../LICENSE)

</div>

---

## 📋 Mục lục

- [Tổng quan](#-tổng-quan)
- [Tech Stack](#-tech-stack)
- [Tính năng](#-tính-năng)
- [Cấu trúc thư mục](#-cấu-trúc-thư-mục)
- [Các trang (Routes)](#-các-trang-routes)
- [Cài đặt & Chạy local](#-cài-đặt--chạy-local)
- [Biến môi trường](#-biến-môi-trường)
- [Triển khai](#-triển-khai)

---

## 🧠 Tổng quan

Frontend của **CHIMS** là một Single Page Application (SPA) dạng dashboard được xây dựng với **Next.js 16 App Router** và **React 19**. Giao diện phục vụ toàn bộ nghiệp vụ quản lý phần cứng máy tính: từ quản lý kho, bán hàng, bảo hành cho đến xây dựng cấu hình PC với AI.

```
📊 Real-time Dashboard   🔍 QR Code Scanner     🤖 AI PC Builder
📦 Inventory Management  📈 Recharts Analytics   🎨 Ant Design 6 UI
```

---

## 🛠️ Tech Stack

| Thành phần | Công nghệ | Phiên bản |
|---|---|---|
| **Framework** | [Next.js](https://nextjs.org) (App Router) | `16.2.4` |
| **UI Library** | [React](https://react.dev) | `19.2.4` |
| **Language** | [TypeScript](https://www.typescriptlang.org) | `^5` |
| **Component Library** | [Ant Design](https://ant.design) | `^6.3.7` |
| **Icons** | [@ant-design/icons](https://ant.design/components/icon) | `^6.2.2` |
| **Charts** | [Recharts](https://recharts.org) | `^3.8.1` |
| **HTTP Client** | [Axios](https://axios-http.com) | `^1.16.0` |
| **Date Utils** | [Day.js](https://day.js.org) | `^1.11.20` |
| **QR Scanner** | [html5-qrcode](https://github.com/mebjas/html5-qrcode) + [@zxing](https://github.com/zxing-js/library) | `^2.3.8` |
| **Styling** | [Tailwind CSS](https://tailwindcss.com) | `^4` |
| **Linting** | [ESLint](https://eslint.org) + eslint-config-next | `^9` |

---

## ✨ Tính năng

### 📊 Dashboard tổng quan
- Thống kê doanh thu, lợi nhuận, đơn hàng theo thời gian thực
- Biểu đồ doanh thu theo danh mục sản phẩm (Recharts)
- Top SKU bán chạy nhất
- Cảnh báo tồn kho thấp

### 📦 Quản lý Kho hàng (Inventory)
- Danh sách SKU với phân trang, tìm kiếm, lọc theo danh mục
- Upload nhiều ảnh sản phẩm
- Thông số kỹ thuật linh hoạt (key-value specs)
- Xuất danh sách CSV / Excel
- Cảnh báo tồn kho dưới mức tối thiểu

### 🔢 Theo dõi Serial Units
- Danh sách từng đơn vị sản phẩm theo serial number
- **QR Code Scanner** — quét serial bằng camera
- Lịch sử trạng thái: `in_stock` → `sold` → `rma` → `scrapped`

### 🛒 Bán hàng & Mua hàng
- Tạo/sửa đơn hàng qua Drawer form
- Theo dõi trạng thái thanh toán, giao hàng
- Liên kết với khách hàng/nhà cung cấp

### 🖥️ PC Builder (+ AI phân tích)
- Chọn linh kiện từ kho tồn tại
- Kiểm tra tương thích tự động (socket, RAM type, TDP, PSU)
- Gửi cấu hình lên AI → nhận phân tích bằng tiếng Việt
- Lưu cấu hình để báo giá

### 🔧 Bảo trì (Maintenance)
- **Kanban board** drag-and-drop cập nhật trạng thái phiếu
- Phân công kỹ thuật viên
- Lịch sử sửa chữa theo thiết bị

### 🛡️ Bảo hành & RMA
- Tra cứu bảo hành theo serial number / SKU
- Quy trình xử lý hàng trả (đổi mới / hoàn tiền / sửa chữa)

### 🏭 Quản lý Kho vật lý
- Nhiều kho / chi nhánh
- Theo dõi vị trí lưu trữ (kệ, hàng, cột)
- Điều chuyển hàng giữa kho

### 📊 Kiểm kê & Báo cáo
- Phiên kiểm kê định kỳ, so sánh thực tế với hệ thống
- Báo cáo doanh thu, lợi nhuận, tồn kho, bảo hành
- Xuất báo cáo Excel / PDF

### 🗂️ Catalog sản phẩm
- Trang catalog công khai dạng lưới ảnh
- Tìm kiếm & lọc theo danh mục, khoảng giá

---

## 📁 Cấu trúc thư mục

```
frontend/
├── src/
│   ├── app/
│   │   ├── (dashboard)/            # Protected routes (yêu cầu đăng nhập)
│   │   │   ├── layout.tsx          # Dashboard layout + Sidebar navigation
│   │   │   ├── dashboard/          # Trang tổng quan
│   │   │   ├── inventory/          # Quản lý kho hàng
│   │   │   ├── sales/              # Đơn bán hàng
│   │   │   ├── purchase/           # Đơn nhập hàng
│   │   │   ├── catalog/            # Catalog sản phẩm
│   │   │   ├── build-pc/           # PC Builder + AI phân tích
│   │   │   ├── customers/          # Quản lý khách hàng
│   │   │   ├── suppliers/          # Quản lý nhà cung cấp
│   │   │   ├── maintenance/        # Kanban bảo trì
│   │   │   ├── warranty/           # Quản lý bảo hành
│   │   │   ├── serial-units/       # Theo dõi serial number
│   │   │   ├── warehouse/          # Kho vật lý
│   │   │   ├── rma/                # Return Merchandise Authorization
│   │   │   ├── audit/              # Kiểm kê & thanh lý
│   │   │   ├── reports/            # Báo cáo & thống kê
│   │   │   └── settings/           # Cài đặt hệ thống
│   │   │
│   ││   ├── login/                  # Trang đăng nhập
│   │   ├── layout.tsx              # Root layout + AntD Registry
│   │   ├── globals.css             # Global styles
│   │   └── page.tsx                # Redirect về /dashboard
│   │
│   ├── middleware.ts                # Next.js Middleware — kiểm tra cookie auth trên server
│   ├── components/                 # Reusable UI components
│   ├── lib/
│   │   ├── api.ts                  # Axios instance + interceptors (Dual Auth)
│   │   └── auth.tsx                # AuthProvider context + cookie/localStorage
│   └── types/                      # TypeScript type definitions
│
├── public/                         # Static assets
├── next.config.ts                  # Next.js configuration
├── tailwind.config.ts              # Tailwind CSS config
├── tsconfig.json
└── package.json
```

---

## 🗺️ Các trang (Routes)

| Route | Trang | Mô tả |
|---|---|---|
| `/dashboard` | 📊 Dashboard | Tổng quan doanh thu & hoạt động |
| `/inventory` | 📦 Kho hàng | Quản lý SKU, tồn kho, hình ảnh |
| `/serial-units` | 🔢 Serial Units | Theo dõi từng đơn vị sản phẩm |
| `/sales` | 🛒 Bán hàng | Tạo & quản lý đơn bán |
| `/purchase` | 🛍️ Nhập hàng | Đơn nhập từ nhà cung cấp |
| `/customers` | 👥 Khách hàng | Quản lý danh sách khách hàng |
| `/suppliers` | 🏭 Nhà cung cấp | Quản lý nhà cung cấp |
| `/build-pc` | 🖥️ PC Builder | Xây dựng cấu hình PC + AI |
| `/maintenance` | 🔧 Bảo trì | Kanban board phiếu sửa chữa |
| `/warranty` | 🛡️ Bảo hành | Quản lý phiếu bảo hành |
| `/rma` | 🔄 RMA | Xử lý hàng trả |
| `/warehouse` | 🏭 Kho vật lý | Kho & chuyển kho |
| `/audit` | 📊 Kiểm kê | Phiên kiểm kê định kỳ |
| `/catalog` | 🗂️ Catalog | Catalog sản phẩm công khai |
| `/reports` | 📈 Báo cáo | Báo cáo tổng hợp |
| `/settings` | ⚙️ Cài đặt | Cài đặt hệ thống |
| `/login` | 🔐 Đăng nhập | Trang xác thực |

---

## 🚀 Cài đặt & Chạy local

### Yêu cầu

- **Node.js** `18+`
- Backend CHIMS đang chạy tại `http://localhost:8000`

### Bước 1 — Cài dependencies

```bash
cd frontend
npm install
```

### Bước 2 — Cấu hình môi trường

```bash
# Tạo file .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
```

### Bước 3 — Chạy dev server

```bash
npm run dev
```

Ứng dụng sẽ chạy tại **[http://localhost:3000](http://localhost:3000)**

### Các lệnh khác

```bash
npm run build    # Build production bundle
npm run start    # Chạy production server
npm run lint     # Kiểm tra ESLint
```

---

## ⚙️ Biến môi trường

Tạo file `.env.local` trong thư mục `frontend/`:

```env
# URL của Backend API
NEXT_PUBLIC_API_URL=http://localhost:8000
```

> Khi deploy lên Vercel, trỏ `NEXT_PUBLIC_API_URL` về URL backend trên Render.

---

## ☁️ Triển khai

Frontend được deploy trên **Vercel**:

| | |
|---|---|
| 🌐 **Live URL** | [https://chims-ten.vercel.app/](https://chims-ten.vercel.app/) |
| ⚡ **Backend API** | [https://chims-backend.onrender.com](https://chims-backend.onrender.com) |

### Deploy lên Vercel (manual)

```bash
npm install -g vercel
vercel --prod
```

Thêm Environment Variable trên Vercel dashboard:
```
NEXT_PUBLIC_API_URL = https://chims-backend.onrender.com
```

---

## 👤 Tác giả

**Trịnh Gia Bảo** — [github.com/gbao86](https://github.com/gbao86)  
📧 tiktokthu10@gmail.com

---

<div align="center">

**[⬆ Về đầu trang](#-chims-frontend)** &nbsp;·&nbsp; **[📄 Root README](../README.md)** &nbsp;·&nbsp; **[⚡ Backend README](../backend/README.md)**

<sub>Licensed under GNU GPL v3.0 · Copyright © 2026 gbao86</sub>

</div>
