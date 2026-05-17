# Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
# This file is part of the chims project.
# Licensed under the GNU General Public License v3.0; see LICENSE for details.
from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone, timedelta
import traceback

from app.database import get_db
from app.auth.dependencies import get_current_user

router = APIRouter()


def _to_float(v) -> float:
    """Safely convert MongoDB value to float.

    Motor 3.x / PyMongo 4.x returns bson.Decimal128 for monetary aggregation
    results ($multiply, $sum on Decimal128 fields). Calling float() on a
    Decimal128 object raises TypeError — we must call .to_decimal() first.
    """
    if v is None:
        return 0.0
    try:
        # bson.Decimal128 — present when Atlas stores numbers as Decimal128
        from bson import Decimal128
        if isinstance(v, Decimal128):
            return float(v.to_decimal())
    except (ImportError, Exception):
        pass
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0.0



@router.get("/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    """Get dashboard statistics: stock summary, sales, purchasing, customers, and trends."""
    db = get_db()

    try:
        now = datetime.now(timezone.utc)
        first_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        thirty_days_ago = now - timedelta(days=30)

        # ── Basic Counts ──
        total_parts = await db.inventory.count_documents({})
        low_stock_count = await db.inventory.count_documents({"status": {"$in": ["low_stock", "out_of_stock"]}})
        out_of_stock_count = await db.inventory.count_documents({"status": "out_of_stock"})
        in_stock_count = await db.inventory.count_documents({"status": "in_stock"})
        pending_tickets = await db.tickets.count_documents({"status": {"$in": ["pending", "diagnosing", "waiting_parts"]}})
        completed_this_month = await db.tickets.count_documents({"status": "completed", "updated_at": {"$gte": first_of_month}})
        total_customers = await db.customers.count_documents({})
        total_suppliers = await db.suppliers.count_documents({})
        active_warranties = await db.warranties.count_documents({"status": {"$in": ["active", "claimed"]}})
        total_serial_units = await db.serial_units.count_documents({})

        # ── Revenue ──
        sales_pipeline = [
            {"$match": {"created_at": {"$gte": first_of_month}}},
            {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}},
        ]
        sales_result = await db.sales_orders.aggregate(sales_pipeline).to_list(1)
        sales_this_month = _to_float(sales_result[0]["total"]) if sales_result else 0.0

        purchasing_pipeline = [
            {"$match": {"created_at": {"$gte": first_of_month}, "status": "received"}},
            {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}},
        ]
        purchasing_result = await db.purchase_orders.aggregate(purchasing_pipeline).to_list(1)
        purchases_this_month = _to_float(purchasing_result[0]["total"]) if purchasing_result else 0.0

        revenue_pipeline = [
            {"$match": {"status": "completed"}},
            {"$group": {"_id": None, "total": {"$sum": "$total_cost"}}},
        ]
        revenue_result = await db.tickets.aggregate(revenue_pipeline).to_list(1)
        total_revenue = _to_float(revenue_result[0]["total"]) if revenue_result else 0.0

        # ── Tickets Over Time (30 days) ──
        trend_pipeline = [
            {"$match": {"created_at": {"$gte": thirty_days_ago}}},
            {"$group": {"_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}}, "count": {"$sum": 1}}},
            {"$sort": {"_id": 1}},
        ]
        tickets_over_time = []
        async for doc in db.tickets.aggregate(trend_pipeline):
            tickets_over_time.append({"date": doc["_id"], "count": doc["count"]})

        # ── Category Distribution (count) ──
        category_distribution = []
        async for doc in db.inventory.aggregate([
            {"$group": {"_id": "$category", "count": {"$sum": 1}, "total_stock": {"$sum": "$stock_quantity"}, "total_value": {"$sum": {"$multiply": ["$stock_quantity", "$unit_price"]}}}},
            {"$sort": {"count": -1}},
        ]):
            category_distribution.append({
                "category": doc["_id"],
                "count": doc["count"],
                "total_stock": doc["total_stock"],
                "total_value": _to_float(doc.get("total_value", 0)),
            })

        # ── Top SKUs by Stock Value ──
        top_by_value = []
        async for doc in db.inventory.aggregate([
            {"$addFields": {"stock_value": {"$multiply": ["$stock_quantity", "$unit_price"]}}},
            {"$sort": {"stock_value": -1}},
            {"$limit": 8},
            {"$project": {"name": 1, "sku_code": 1, "category": 1, "stock_quantity": 1, "unit_price": 1, "stock_value": 1}},
        ]):
            top_by_value.append({
                "name": doc.get("name", ""),
                "sku_code": doc.get("sku_code", ""),
                "category": doc.get("category", ""),
                "stock_quantity": doc.get("stock_quantity", 0),
                "unit_price": _to_float(doc.get("unit_price", 0)),
                "stock_value": _to_float(doc.get("stock_value", 0)),
            })

        # ── Top Selling SKUs ──
        top_selling = []
        async for doc in db.sales_orders.aggregate([
            {"$unwind": "$items"},
            {"$group": {"_id": "$items.inventory_id", "total_qty": {"$sum": "$items.quantity"}, "total_revenue": {"$sum": {"$multiply": ["$items.quantity", "$items.unit_price"]}}, "name": {"$first": "$items.name"}}},
            {"$sort": {"total_qty": -1}},
            {"$limit": 8},
        ]):
            top_selling.append({
                "sku_id": str(doc["_id"]),
                "name": doc.get("name") or "—",
                "total_qty": doc["total_qty"],
                "total_revenue": _to_float(doc.get("total_revenue", 0)),
            })

        # ── Monthly Revenue (last 6 months) ──
        six_months_ago = now - timedelta(days=180)
        monthly_revenue = []
        async for doc in db.sales_orders.aggregate([
            {"$match": {"created_at": {"$gte": six_months_ago}}},
            {"$group": {"_id": {"$dateToString": {"format": "%Y-%m", "date": "$created_at"}}, "revenue": {"$sum": "$total_amount"}, "orders": {"$sum": 1}}},
            {"$sort": {"_id": 1}},
        ]):
            monthly_revenue.append({"month": doc["_id"], "revenue": _to_float(doc.get("revenue", 0)), "orders": doc.get("orders", 0)})

        # ── Ticket Status Distribution ──
        ticket_status_dist = []
        async for doc in db.tickets.aggregate([
            {"$group": {"_id": "$status", "count": {"$sum": 1}}},
        ]):
            ticket_status_dist.append({"status": doc["_id"], "count": doc["count"]})

        # ── Warranty Status ──
        warranty_status_dist = []
        async for doc in db.warranties.aggregate([
            {"$group": {"_id": "$status", "count": {"$sum": 1}}},
        ]):
            warranty_status_dist.append({"status": doc["_id"], "count": doc["count"]})

        # ── Serial Unit Status ──
        serial_status_dist = []
        async for doc in db.serial_units.aggregate([
            {"$group": {"_id": "$status", "count": {"$sum": 1}}},
        ]):
            serial_status_dist.append({"status": doc["_id"], "count": doc["count"]})

        # ── RMA Status ──
        rma_status_dist = []
        async for doc in db.rma_tickets.aggregate([
            {"$group": {"_id": "$status", "count": {"$sum": 1}}},
        ]):
            rma_status_dist.append({"status": doc["_id"], "count": doc["count"]})

        # ── Purchase Orders by Status ──
        po_status_dist = []
        async for doc in db.purchase_orders.aggregate([
            {"$group": {"_id": "$status", "count": {"$sum": 1}, "total": {"$sum": "$total_amount"}}},
        ]):
            po_status_dist.append({"status": doc["_id"], "count": doc["count"], "total": _to_float(doc.get("total", 0))})

        # ── Top Customers by Spent ──
        top_customers = []
        async for doc in db.customers.aggregate([
            {"$sort": {"total_spent": -1}},
            {"$limit": 5},
            {"$project": {"name": 1, "total_spent": 1, "order_count": 1, "type": 1}},
        ]):
            top_customers.append({
                "name": doc.get("name", ""),
                "total_spent": _to_float(doc.get("total_spent", 0)),
                "order_count": doc.get("order_count", 0),
                "type": doc.get("type", ""),
            })

        return {
            "total_parts": total_parts,
            "low_stock_count": low_stock_count,
            "out_of_stock_count": out_of_stock_count,
            "in_stock_count": in_stock_count,
            "pending_tickets": pending_tickets,
            "completed_this_month": completed_this_month,
            "total_customers": total_customers,
            "total_suppliers": total_suppliers,
            "active_warranties": active_warranties,
            "total_serial_units": total_serial_units,
            "sales_this_month": sales_this_month,
            "purchases_this_month": purchases_this_month,
            "total_revenue": total_revenue,
            "tickets_over_time": tickets_over_time,
            "category_distribution": category_distribution,
            "top_by_value": top_by_value,
            "top_selling": top_selling,
            "monthly_revenue": monthly_revenue,
            "ticket_status_dist": ticket_status_dist,
            "warranty_status_dist": warranty_status_dist,
            "serial_status_dist": serial_status_dist,
            "rma_status_dist": rma_status_dist,
            "po_status_dist": po_status_dist,
            "top_customers": top_customers,
        }

    except Exception as exc:
        tb = traceback.format_exc()
        print(f"[Dashboard ERROR] {exc}\n{tb}")
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi tổng hợp dữ liệu Dashboard: {str(exc)}",
        )
