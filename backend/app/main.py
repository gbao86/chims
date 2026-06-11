# Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
# This file is part of the chims project.
# Licensed under the GNU General Public License v3.0; see LICENSE for details.
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

from app.database import connect_db, close_db
from app.auth.routes import router as auth_router
from app.routes.inventory import router as inventory_router
from app.routes.tickets import router as tickets_router
from app.routes.dashboard import router as dashboard_router
from app.routes.customers import router as customers_router
from app.routes.suppliers import router as suppliers_router
from app.routes.sales import router as sales_router
from app.routes.purchase_orders import router as purchase_orders_router
from app.routes.warranty import router as warranty_router
from app.routes.reports import router as reports_router
from app.routes.exports import router as exports_router
from app.routes.catalog_sync import router as catalog_sync_router
from app.routes.serial_units import router as serial_units_router
from app.routes.builds import router as builds_router
from app.routes.warehouses import router as warehouses_router
from app.routes.rma import router as rma_router
from app.routes.audit import router as audit_router
from app.routes.users import router as users_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: connect/disconnect MongoDB."""
    await connect_db()
    yield
    await close_db()


app = FastAPI(
    title="CHIMS API",
    description="Computer Hardware Inventory & Maintenance Management System",
    version="1.2.0",
    lifespan=lifespan,
    redoc_url=None,  # disable default — we serve a custom one below
)


@app.get("/redoc", include_in_schema=False, response_class=HTMLResponse)
async def custom_redoc():
    """Custom ReDoc page using unpkg CDN (more reliable than jsdelivr)."""
    return HTMLResponse("""<!DOCTYPE html>
<html>
  <head>
    <title>CHIMS API — ReDoc</title>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
    <style>body { margin: 0; padding: 0; }</style>
  </head>
  <body>
    <redoc spec-url="/openapi.json" expand-responses="200,201"></redoc>
    <script src="https://unpkg.com/redoc@latest/bundles/redoc.standalone.js"></script>
  </body>
</html>""")


# CORS middleware — restrict credentials to known origins when needed.
# Wildcard origins cannot be safely combined with credentialed requests.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://192.168.1.83:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    # Allow all Vercel deployment URLs (production + preview) via regex
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(inventory_router, prefix="/api/inventory", tags=["Inventory"])
app.include_router(tickets_router, prefix="/api/tickets", tags=["Maintenance Tickets"])
app.include_router(dashboard_router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(customers_router, prefix="/api/customers", tags=["Customers"])
app.include_router(suppliers_router, prefix="/api/suppliers", tags=["Suppliers"])
app.include_router(sales_router, prefix="/api/sales", tags=["Sales"])
app.include_router(purchase_orders_router, prefix="/api/purchase-orders", tags=["Purchase Orders"])
app.include_router(warranty_router, prefix="/api/warranty", tags=["Warranty"])
app.include_router(reports_router, prefix="/api/reports", tags=["Reports"])
app.include_router(exports_router, prefix="/api/exports", tags=["Exports"])
app.include_router(catalog_sync_router, prefix="/api/catalog", tags=["Catalog Sync"])
app.include_router(serial_units_router, prefix="/api/serial-units", tags=["Serial Units"])
app.include_router(builds_router, prefix="/api/builds", tags=["PC Builds"])
app.include_router(warehouses_router, prefix="/api/warehouses", tags=["Warehouses"])
app.include_router(rma_router, prefix="/api/rma", tags=["RMA"])
app.include_router(audit_router, prefix="/api/audit", tags=["Audit"])
app.include_router(users_router, prefix="/api/users", tags=["Users"])


@app.get("/", response_class=HTMLResponse, tags=["Root"])
async def root():
    html = """<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>CHIMS API</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', sans-serif;
      background: #0a0d18;
      color: #e2e8f0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: linear-gradient(135deg, #0f1629 0%, #131929 100%);
      border: 1px solid rgba(99,102,241,0.2);
      border-radius: 24px;
      padding: 48px 56px;
      max-width: 560px;
      width: 100%;
      box-shadow: 0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.08) inset;
      text-align: center;
    }
    .logo {
      width: 72px; height: 72px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      border-radius: 20px;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 24px;
      font-size: 32px;
      box-shadow: 0 8px 32px rgba(99,102,241,0.4);
    }
    h1 { font-size: 28px; font-weight: 700; color: #f1f5f9; letter-spacing: -0.02em; }
    .sub { color: #64748b; font-size: 14px; margin-top: 6px; letter-spacing: 0.04em; }
    .badge {
      display: inline-flex; align-items: center; gap: 6px;
      background: rgba(34,197,94,0.12);
      border: 1px solid rgba(34,197,94,0.3);
      color: #4ade80;
      font-size: 13px; font-weight: 600;
      padding: 6px 16px; border-radius: 999px;
      margin: 20px auto 32px;
    }
    .dot { width: 7px; height: 7px; border-radius: 50%; background: #4ade80; animation: pulse 2s infinite; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
    .links { display: flex; flex-direction: column; gap: 12px; }
    .link-btn {
      display: flex; align-items: center; justify-content: space-between;
      background: rgba(99,102,241,0.07);
      border: 1px solid rgba(99,102,241,0.18);
      border-radius: 12px;
      padding: 14px 20px;
      text-decoration: none;
      color: #c7d2fe;
      font-size: 14px; font-weight: 500;
      transition: all 0.18s ease;
    }
    .link-btn:hover {
      background: rgba(99,102,241,0.15);
      border-color: rgba(99,102,241,0.4);
      color: #fff;
      transform: translateY(-1px);
      box-shadow: 0 4px 20px rgba(99,102,241,0.2);
    }
    .link-btn span { opacity: 0.5; font-size: 18px; }
    .version { margin-top: 32px; color: #334155; font-size: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">⚡</div>
    <h1>CHIMS API</h1>
    <p class="sub">Computer Hardware Inventory & Management System</p>
    <div class="badge"><div class="dot"></div> API đang hoạt động — v1.2.0</div>
    <div class="links">
      <a class="link-btn" href="/docs">
        <div>📄 &nbsp;Swagger UI — Tài liệu API tương tác</div>
        <span>→</span>
      </a>
      <a class="link-btn" href="/redoc">
        <div>📘 &nbsp;ReDoc — Tài liệu API đầy đủ</div>
        <span>→</span>
      </a>
      <a class="link-btn" href="/api/dashboard/stats">
        <div>📊 &nbsp;Health Check — Dashboard Stats</div>
        <span>→</span>
      </a>
    </div>
    <p class="version">FastAPI · PyMongo Async · MongoDB Atlas · Python 3.11</p>
  </div>
</body>
</html>"""
    return HTMLResponse(content=html)

