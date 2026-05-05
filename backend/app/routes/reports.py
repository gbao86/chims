from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from datetime import datetime, timezone, timedelta
from io import BytesIO

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Border, Side, Alignment
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer

from app.database import get_db
from app.auth.dependencies import get_current_user

router = APIRouter()
COMPANY_NAME = "CÔNG TY TNHH THƯƠNG MẠI GBAO"
COMPANY_ADDRESS = "Phường Tân Hòa, TPHCM"
COMPANY_HOTLINE = "Chưa cập nhật"
COMPANY_EMAIL = "gbao74452@gmail.com"
COMPANY_WEBSITE = "CHIMS"


async def _build_summary(db):
    now = datetime.now(timezone.utc)
    start_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    start_week = now - timedelta(days=7)

    total_inventory = await db.inventory.count_documents({})
    low_stock = await db.inventory.count_documents({"status": {"$in": ["low_stock", "out_of_stock"]}})
    total_customers = await db.customers.count_documents({})
    total_suppliers = await db.suppliers.count_documents({})
    total_sales_orders = await db.sales_orders.count_documents({})
    total_purchase_orders = await db.purchase_orders.count_documents({})
    total_warranties = await db.warranties.count_documents({})

    sales_result = await db.sales_orders.aggregate([
        {"$match": {"created_at": {"$gte": start_month}}},
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}},
    ]).to_list(1)
    sales_this_month = sales_result[0]["total"] if sales_result else 0

    po_result = await db.purchase_orders.aggregate([
        {"$match": {"created_at": {"$gte": start_month}, "status": "received"}},
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}},
    ]).to_list(1)
    purchases_this_month = po_result[0]["total"] if po_result else 0

    activity_cursor = db.tickets.aggregate([
        {"$match": {"updated_at": {"$gte": start_week}}},
        {"$group": {"_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$updated_at"}}, "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}},
    ])
    weekly_activity = []
    async for doc in activity_cursor:
        weekly_activity.append({"date": doc["_id"], "count": doc["count"]})

    return {
        "total_inventory": total_inventory,
        "low_stock": low_stock,
        "total_customers": total_customers,
        "total_suppliers": total_suppliers,
        "total_sales_orders": total_sales_orders,
        "total_purchase_orders": total_purchase_orders,
        "total_warranties": total_warranties,
        "sales_this_month": sales_this_month,
        "purchases_this_month": purchases_this_month,
        "weekly_activity": weekly_activity,
    }


@router.get("/summary")
async def reports_summary(current_user: dict = Depends(get_current_user)):
    db = get_db()
    return await _build_summary(db)


def _style_excel_header(ws, end_col: int):
    header_fill = PatternFill("solid", fgColor="6366F1")
    white_font = Font(color="FFFFFF", bold=True)
    for col in range(1, end_col + 1):
        cell = ws.cell(row=1, column=col)
        cell.fill = header_fill
        cell.font = white_font
        cell.alignment = Alignment(horizontal="center", vertical="center")
    ws.freeze_panes = "A2"
    ws.auto_filter.ref = ws.dimensions
    ws.column_dimensions["A"].width = 32
    ws.column_dimensions["B"].width = 18
    ws.column_dimensions["C"].width = 24
    ws.column_dimensions["D"].width = 24
    ws.column_dimensions["E"].width = 24
    ws.column_dimensions["F"].width = 24


@router.get("/summary.xlsx")
async def export_report_xlsx(current_user: dict = Depends(get_current_user)):
    db = get_db()
    summary = await _build_summary(db)
    wb = Workbook()
    wb.remove(wb.active)

    # Summary sheet
    ws = wb.create_sheet("Summary")
    ws.append([COMPANY_NAME])
    ws.append([COMPANY_ADDRESS])
    ws.append([f"Hotline: {COMPANY_HOTLINE}"])
    ws.append([f"Email: {COMPANY_EMAIL}"])
    ws.append([f"Website: {COMPANY_WEBSITE}"])
    ws.append([""])
    ws.append(["Metric", "Value"])
    summary_rows = [
        ["Total Inventory", summary["total_inventory"]],
        ["Low Stock", summary["low_stock"]],
        ["Total Customers", summary["total_customers"]],
        ["Total Suppliers", summary["total_suppliers"]],
        ["Total Sales Orders", summary["total_sales_orders"]],
        ["Total Purchase Orders", summary["total_purchase_orders"]],
        ["Total Warranties", summary["total_warranties"]],
        ["Sales This Month", summary["sales_this_month"]],
        ["Purchases This Month", summary["purchases_this_month"]],
    ]
    for row in summary_rows:
        ws.append(row)
    _style_excel_header(ws, 2)
    for cell in ws[1] + ws[2] + ws[3] + ws[4] + ws[5]:
        cell.font = Font(bold=True)
    ws[7][0].font = Font(bold=True)
    ws[7][1].font = Font(bold=True)

    # Activity sheet
    act = wb.create_sheet("Weekly Activity")
    act.append(["Date", "Count"])
    for item in summary["weekly_activity"]:
        act.append([item["date"], item["count"]])
    _style_excel_header(act, 2)

    # Inventory sheet
    inv = wb.create_sheet("Inventory Detail")
    inv.append(["SKU", "Name", "Category", "Brand", "Stock", "Cost Price", "Unit Price", "Status", "Location"])
    async for item in db.inventory.find({}).sort("created_at", -1):
        inv.append([
            item.get("sku_code", ""), item.get("name", ""), item.get("category", ""), item.get("brand", ""),
            item.get("stock_quantity", 0), item.get("cost_price", 0), item.get("unit_price", 0), item.get("status", ""), item.get("location", "")
        ])
    _style_excel_header(inv, 9)

    buffer = BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": 'attachment; filename="reports-summary.xlsx"'})


@router.get("/summary.pdf")
async def export_report_pdf(current_user: dict = Depends(get_current_user)):
    db = get_db()
    summary = await _build_summary(db)
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=landscape(A4), rightMargin=18, leftMargin=18, topMargin=18, bottomMargin=18)
    styles = getSampleStyleSheet()
    elements = [Paragraph("CHIMS Reports Summary", styles["Title"]), Spacer(1, 12)]
    data = [["Metric", "Value"]] + [[k.replace("_", " ").title(), str(v)] for k, v in summary.items() if k != "weekly_activity"]
    table = Table(data, repeatRows=1)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#6366f1')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.25, colors.grey),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(table)
    if summary["weekly_activity"]:
        elements.append(Spacer(1, 12))
        elements.append(Paragraph("Weekly Activity", styles["Heading2"]))
        activity = [["Date", "Count"]] + [[x["date"], str(x["count"])] for x in summary["weekly_activity"]]
        activity_table = Table(activity, repeatRows=1)
        activity_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0f172a')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('GRID', (0, 0), (-1, -1), 0.25, colors.grey),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
        ]))
        elements.append(activity_table)
    doc.build(elements)
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": 'attachment; filename="reports-summary.pdf"'})
