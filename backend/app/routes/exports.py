# Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
# This file is part of the chims project.
# Licensed under the GNU General Public License v3.0; see LICENSE for details.
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from io import BytesIO, StringIO
import csv
import os

from openpyxl import Workbook
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

from app.database import get_db
from app.auth.dependencies import get_current_user

FONT_FAMILY = "Arial"
FONT_BOLD = "Arial-Bold"


def _register_pdf_fonts():
    if FONT_FAMILY in pdfmetrics.getRegisteredFontNames():
        return

    font_root = os.path.join(os.environ.get("WINDIR", "C:\\Windows"), "Fonts")
    font_path = os.path.join(font_root, "arial.ttf")
    bold_path = os.path.join(font_root, "arialbd.ttf")
    fallback_path = os.path.join(font_root, "DejaVuSans.ttf")

    if os.path.exists(font_path):
        pdfmetrics.registerFont(TTFont(FONT_FAMILY, font_path))
    if os.path.exists(bold_path):
        pdfmetrics.registerFont(TTFont(FONT_BOLD, bold_path))

    if FONT_FAMILY not in pdfmetrics.getRegisteredFontNames():
        if os.path.exists(fallback_path):
            pdfmetrics.registerFont(TTFont(FONT_FAMILY, fallback_path))
            pdfmetrics.registerFont(TTFont(FONT_BOLD, fallback_path))
        elif os.path.exists(font_path):
            pdfmetrics.registerFont(TTFont(FONT_FAMILY, font_path))
            if os.path.exists(bold_path):
                pdfmetrics.registerFont(TTFont(FONT_BOLD, bold_path))

router = APIRouter()


async def _get_inventory_rows():
    db = get_db()
    cursor = db.inventory.find({}).sort("created_at", -1)
    rows = [["SKU", "Name", "Category", "Brand", "Image URL", "Stock", "Min Stock", "Cost Price", "Unit Price", "Warranty Months", "Location", "Barcode", "Status"]]
    async for item in cursor:
        rows.append([
            item.get("sku_code", ""), item.get("name", ""), item.get("category", ""), item.get("brand", ""), item.get("image_url", ""),
            item.get("stock_quantity", 0), item.get("min_stock", 0), item.get("cost_price", 0), item.get("unit_price", 0),
            item.get("warranty_months", 24), item.get("location", ""), item.get("barcode", ""), item.get("status", ""),
        ])
    return rows


@router.get("/inventory.csv")
async def export_inventory_csv(current_user: dict = Depends(get_current_user)):
    rows = await _get_inventory_rows()
    buffer = StringIO()
    writer = csv.writer(buffer)
    writer.writerows(rows)
    buffer.seek(0)
    return StreamingResponse(iter([buffer.getvalue()]), media_type="text/csv", headers={"Content-Disposition": 'attachment; filename="inventory.csv"'})


@router.get("/inventory.xlsx")
async def export_inventory_xlsx(current_user: dict = Depends(get_current_user)):
    rows = await _get_inventory_rows()
    wb = Workbook()
    ws = wb.active
    ws.title = "Inventory"
    for row in rows:
      ws.append(row)
    for cell in ws[1]:
      cell.font = cell.font.copy(bold=True)
    buffer = BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": 'attachment; filename="inventory.xlsx"'})


@router.get("/inventory.pdf")
async def export_inventory_pdf(current_user: dict = Depends(get_current_user)):
    _register_pdf_fonts()
    rows = await _get_inventory_rows()
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=landscape(A4), rightMargin=18, leftMargin=18, topMargin=18, bottomMargin=18)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("TitleArial", parent=styles["Title"], fontName=FONT_BOLD, fontSize=16, leading=20)
    elements = [Paragraph("CHIMS Inventory Report", title_style), Spacer(1, 12)]
    table = Table(rows, repeatRows=1)
    table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), FONT_FAMILY),
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#6366f1')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.25, colors.grey),
        ('FONTSIZE', (0, 0), (-1, -1), 7),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(table)
    doc.build(elements)
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": 'attachment; filename="inventory.pdf"'})

