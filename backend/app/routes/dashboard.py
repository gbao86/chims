from fastapi import APIRouter, Depends
from datetime import datetime, timezone, timedelta

from app.database import get_db
from app.auth.dependencies import get_current_user

router = APIRouter()


@router.get("/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    """Get dashboard statistics: stock summary, sales, purchasing, customers, and trends."""
    db = get_db()

    now = datetime.now(timezone.utc)
    first_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    thirty_days_ago = now - timedelta(days=30)

    total_parts = await db.inventory.count_documents({})
    low_stock_count = await db.inventory.count_documents({"status": {"$in": ["low_stock", "out_of_stock"]}})
    pending_tickets = await db.tickets.count_documents({"status": {"$in": ["pending", "diagnosing", "waiting_parts"]}})
    completed_this_month = await db.tickets.count_documents({"status": "completed", "updated_at": {"$gte": first_of_month}})
    total_customers = await db.customers.count_documents({})
    total_suppliers = await db.suppliers.count_documents({})
    active_warranties = await db.warranties.count_documents({"status": {"$in": ["active", "claimed"]}})

    sales_pipeline = [
        {"$match": {"created_at": {"$gte": first_of_month}}},
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}},
    ]
    sales_result = await db.sales_orders.aggregate(sales_pipeline).to_list(1)
    sales_this_month = sales_result[0]["total"] if sales_result else 0

    purchasing_pipeline = [
        {"$match": {"created_at": {"$gte": first_of_month}, "status": "received"}},
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}},
    ]
    purchasing_result = await db.purchase_orders.aggregate(purchasing_pipeline).to_list(1)
    purchases_this_month = purchasing_result[0]["total"] if purchasing_result else 0

    revenue_pipeline = [
        {"$match": {"status": "completed"}},
        {"$group": {"_id": None, "total": {"$sum": "$total_cost"}}},
    ]
    revenue_result = await db.tickets.aggregate(revenue_pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0

    trend_pipeline = [
        {"$match": {"created_at": {"$gte": thirty_days_ago}}},
        {"$group": {"_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}}, "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}},
    ]
    trend_cursor = db.tickets.aggregate(trend_pipeline)
    tickets_over_time = []
    async for doc in trend_cursor:
        tickets_over_time.append({"date": doc["_id"], "count": doc["count"]})

    category_cursor = db.inventory.aggregate([
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ])
    category_distribution = []
    async for doc in category_cursor:
        category_distribution.append({"category": doc["_id"], "count": doc["count"]})

    return {
        "total_parts": total_parts,
        "low_stock_count": low_stock_count,
        "pending_tickets": pending_tickets,
        "completed_this_month": completed_this_month,
        "total_customers": total_customers,
        "total_suppliers": total_suppliers,
        "active_warranties": active_warranties,
        "sales_this_month": sales_this_month,
        "purchases_this_month": purchases_this_month,
        "total_revenue": total_revenue,
        "tickets_over_time": tickets_over_time,
        "category_distribution": category_distribution,
    }
