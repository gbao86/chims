# Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
# This file is part of the chims project.
# Licensed under the GNU General Public License v3.0; see LICENSE for details.
from pymongo import AsyncMongoClient
from pymongo.asynchronous.database import AsyncDatabase
from app.config import get_settings
import certifi


class Database:
    """MongoDB connection manager using PyMongo Async driver."""

    client: AsyncMongoClient = None
    db: AsyncDatabase = None


db_instance = Database()


async def connect_db():
    """Initialize MongoDB connection."""
    settings = get_settings()
    db_instance.client = AsyncMongoClient(settings.MONGODB_URL, tlsCAFile=certifi.where())
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
        await db_instance.client.close()
        print("🔌 MongoDB connection closed")


def get_db() -> AsyncDatabase:
    """Get database instance for dependency injection."""
    return db_instance.db


def get_client() -> AsyncMongoClient:
    """Get database client for sessions/transactions."""
    return db_instance.client

