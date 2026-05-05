from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: connect/disconnect MongoDB."""
    await connect_db()
    yield
    await close_db()


app = FastAPI(
    title="CHIMS API",
    description="Computer Hardware Inventory & Maintenance Management System",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware — restrict credentials to known origins when needed.
# Wildcard origins cannot be safely combined with credentialed requests.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
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


@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "CHIMS API is running",
        "docs": "/docs",
        "version": "1.0.0",
    }
