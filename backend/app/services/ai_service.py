# Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
# This file is part of the chims project.
# Licensed under the GNU General Public License v3.0; see LICENSE for details.
"""
Groq AI Service for PC Build Analysis.

Uses GroqCloud API with Llama 3.3 70B model.
Free tier: ~30 RPM, 14,400 tokens/minute, 500,000 tokens/day.
Get API key at: https://console.groq.com
"""

import os
import json
import re
from typing import Optional
from app.config import get_settings


def _get_api_key() -> str:
    """Read Groq API key via pydantic-settings (reads from .env correctly)."""
    try:
        return get_settings().GROQ_API_KEY or ""
    except Exception:
        return os.getenv("GROQ_API_KEY", "")


def _is_key_valid() -> bool:
    key = _get_api_key()
    return bool(key) and key not in ("", "your_groq_api_key_here")


def build_prompt(components: list, rule_notes: list, total_tdp: int, recommended_psu: int, total_price: float) -> str:
    """Build a detailed Vietnamese prompt for PC build analysis."""
    comp_lines = []
    for c in components:
        cat = c.get("category", "?")
        name = c.get("product_name") or c.get("name", "?")
        sku = c.get("sku_code", "")
        qty = c.get("quantity", 1)
        price = c.get("unit_price", 0)
        specs = c.get("specs", {})
        key_spec_keys = ["socket", "Socket", "type", "Type", "wattage", "Wattage",
                         "form_factor", "Form Factor", "vram", "capacity", "cores", "threads"]
        key_specs = {k: v for k, v in specs.items() if k in key_spec_keys}
        specs_str = ", ".join(f"{k}: {v}" for k, v in list(key_specs.items())[:5]) if key_specs else "N/A"
        comp_lines.append(
            f"  - [{cat}] {name} (SKU: {sku}, SL: {qty}, Giá: {int(price):,}đ)\n"
            f"    Thông số: {specs_str}"
        )

    components_text = "\n".join(comp_lines) if comp_lines else "  (Chưa có linh kiện)"
    rules_text = "\n".join(f"  {n}" for n in rule_notes) if rule_notes else "  Chưa kiểm tra"

    return f"""Bạn là chuyên gia tư vấn phần cứng máy tính tại Việt Nam, kinh nghiệm 10 năm.

Hãy phân tích cấu hình PC dưới đây và trả lời bằng tiếng Việt, ngắn gọn và thực tế:

## DANH SÁCH LINH KIỆN
{components_text}

## KẾT QUẢ KIỂM TRA TỰ ĐỘNG
{rules_text}
Tổng TDP: {total_tdp}W | PSU khuyến nghị: {recommended_psu}W | Tổng giá: {int(total_price):,}đ

## YÊU CẦU

Trả về JSON hợp lệ theo đúng cấu trúc sau (không markdown, không giải thích thêm):
{{
  "overall": "compatible",
  "summary": "Nhận xét tổng quan 1-2 câu",
  "issues": ["Vấn đề 1 nếu có"],
  "missing": ["Linh kiện còn thiếu nếu có"],
  "suggestions": [
    {{"title": "Tên đề xuất", "detail": "Mô tả chi tiết"}}
  ],
  "verdict": "Câu kết luận cuối cùng thân thiện"
}}

Giá trị overall: "compatible" | "warning" | "error"
Nếu cấu hình ổn, issues và missing là mảng rỗng [].
Chỉ trả về JSON thuần, không bọc trong markdown code block."""


async def analyze_build_with_ai(
    components: list,
    rule_notes: list,
    total_tdp: int,
    recommended_psu: int,
    total_price: float,
) -> dict:
    """Analyze PC build using GroqCloud (llama-3.3-70b-versatile)."""

    if not _is_key_valid():
        return {
            "available": False,
            "message": "Groq API chưa được cấu hình. Thêm GROQ_API_KEY vào file .env để kích hoạt.",
        }

    raw_text = ""
    try:
        from groq import Groq

        client = Groq(api_key=_get_api_key())
        prompt = build_prompt(components, rule_notes, total_tdp, recommended_psu, total_price)

        chat_completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": "Bạn là chuyên gia phần cứng máy tính. Chỉ trả về JSON thuần, không markdown.",
                },
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
            temperature=0.3,
            max_tokens=1024,
        )

        raw_text = chat_completion.choices[0].message.content.strip()

        # Strip markdown code blocks nếu model vẫn wrap
        raw_text = re.sub(r"^```(?:json)?\s*", "", raw_text, flags=re.MULTILINE)
        raw_text = re.sub(r"\s*```$", "", raw_text, flags=re.MULTILINE)
        raw_text = raw_text.strip()

        result = json.loads(raw_text)
        result["available"] = True
        return result

    except json.JSONDecodeError:
        return {
            "available": True,
            "overall": "warning",
            "summary": raw_text[:600] if raw_text else "Không thể phân tích",
            "issues": [],
            "missing": [],
            "suggestions": [],
            "verdict": "AI trả về định dạng không chuẩn, vui lòng thử lại.",
        }
    except Exception as e:
        err = str(e)
        if "invalid_api_key" in err.lower() or "authentication" in err.lower():
            msg = "API key Groq không hợp lệ. Vào console.groq.com để tạo key mới."
        elif "rate_limit" in err.lower() or "429" in err:
            msg = "Vượt giới hạn tần suất Groq (30 req/phút). Chờ ~60 giây rồi thử lại."
        elif "quota" in err.lower() or "token" in err.lower():
            msg = "Đã hết quota ngày của Groq. Thử lại sau 24h."
        elif "model" in err.lower() and "not found" in err.lower():
            msg = "Model Groq không tồn tại hoặc bạn chưa được cấp quyền dùng model này."
        else:
            msg = f"Lỗi AI (Groq): {err[:150]}"
        return {
            "available": False,
            "message": msg,
        }
