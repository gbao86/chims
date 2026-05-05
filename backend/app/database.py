from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.config import get_settings
import certifi


class Database:
    """MongoDB connection manager using Motor async driver."""

    client: AsyncIOMotorClient = None
    db: AsyncIOMotorDatabase = None


db_instance = Database()


async def connect_db():
    """Initialize MongoDB connection."""
    settings = get_settings()
    db_instance.client = AsyncIOMotorClient(settings.MONGODB_URL, tlsCAFile=certifi.where())
    db_instance.db = db_instance.client[settings.DB_NAME]

    # Create indexes
    await db_instance.db.users.create_index("username", unique=True)
    await db_instance.db.inventory.create_index("sku_code", unique=True)
    await db_instance.db.inventory.create_index("name")
    await db_instance.db.inventory.create_index("category")
    await db_instance.db.inventory.create_index("brand")
    await db_instance.db.tickets.create_index("ticket_id", unique=True)
    await db_instance.db.customers.create_index("code", unique=True)
    await db_instance.db.customers.create_index("name")
    await db_instance.db.customers.create_index("phone")
    await db_instance.db.suppliers.create_index("code", unique=True)
    await db_instance.db.suppliers.create_index("name")
    await db_instance.db.sales_orders.create_index("invoice_number", unique=True)
    await db_instance.db.sales_orders.create_index("customer_name")
    await db_instance.db.purchase_orders.create_index("po_number", unique=True)
    await db_instance.db.purchase_orders.create_index("supplier_name")
    await db_instance.db.warranties.create_index("warranty_code", unique=True)
    await db_instance.db.warranties.create_index("serial_number")

    # Serial units indexes
    await db_instance.db.serial_units.create_index("serial_number", unique=True)
    await db_instance.db.serial_units.create_index("inventory_id")
    await db_instance.db.serial_units.create_index("status")
    await db_instance.db.serial_units.create_index("warehouse_id")
    await db_instance.db.serial_units.create_index("condition")

    # PC builds indexes
    await db_instance.db.pc_builds.create_index("build_code", unique=True)
    await db_instance.db.pc_builds.create_index("status")

    # Warehouse indexes
    await db_instance.db.warehouses.create_index("code", unique=True)
    await db_instance.db.warehouses.create_index("name")
    await db_instance.db.warehouse_locations.create_index([("warehouse_id", 1), ("location_code", 1)], unique=True)

    # RMA indexes
    await db_instance.db.rma_tickets.create_index("rma_code", unique=True)
    await db_instance.db.rma_tickets.create_index("serial_number")
    await db_instance.db.rma_tickets.create_index("customer_phone")
    await db_instance.db.rma_tickets.create_index("status")

    print(f"✅ Connected to MongoDB: {settings.DB_NAME}")


async def close_db():
    """Close MongoDB connection."""
    if db_instance.client:
        db_instance.client.close()
        print("🔌 MongoDB connection closed")


def get_db() -> AsyncIOMotorDatabase:
    """Get database instance for dependency injection."""
    return db_instance.db
