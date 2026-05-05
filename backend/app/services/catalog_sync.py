# Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
# This file is part of the chims project.
# Licensed under the GNU General Public License v3.0; see LICENSE for details.
from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Optional

import requests

from app.services.catalog_sources import CatalogPipeline


CATALOG_DIR = Path(r"D:\Hoc Tap\TTTN\chims\frontend\public\catalog")


class CatalogSyncService:
    def __init__(self, pipeline: Optional[CatalogPipeline] = None):
        self.pipeline = pipeline or CatalogPipeline()

    def normalize_filename(self, sku_code: str, index: int = 0, ext: str = "jpg") -> str:
        base = sku_code.lower().replace("_", "-")
        suffix = "" if index == 0 else f"-{index + 1}"
        return f"{base}{suffix}.{ext}"

    def download_image(self, url: str, target_path: Path) -> None:
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            )
        }
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        target_path.write_bytes(response.content)

    def sync_one(self, query: str) -> Dict[str, Any]:
        result = self.pipeline.find_best_match(query)
        if not result:
            return {"query": query, "matched": False}

        CATALOG_DIR.mkdir(parents=True, exist_ok=True)
        image_files: List[str] = []

        for idx, asset in enumerate(result.images[:8]):
            ext = asset.url.split("?")[0].rsplit(".", 1)[-1].lower()
            if ext not in {"jpg", "jpeg", "png", "webp"}:
                ext = "jpg"
            filename = self.normalize_filename(result.sku_code, idx, ext)
            target = CATALOG_DIR / filename
            try:
                self.download_image(asset.url, target)
                image_files.append(filename)
            except Exception:
                continue

        return {
            "query": query,
            "matched": True,
            "sku_code": result.sku_code,
            "name": result.name,
            "category": result.category,
            "brand": result.brand,
            "product_url": result.product_url,
            "images": image_files,
            "specs": result.specs,
        }

    def sync_inventory_item(self, item: Dict[str, Any]) -> Dict[str, Any]:
        query = str(item.get('name', '')).strip()
        result = self.sync_one(query)
        if not result.get("matched"):
            return {
                "sku_code": item.get("sku_code"),
                "matched": False,
                "reason": "no match",
            }

        return {
            "sku_code": item.get("sku_code"),
            "matched": True,
            "matched_source_sku": result.get("sku_code"),
            "name": result.get("name"),
            "category": result.get("category"),
            "brand": result.get("brand"),
            "product_url": result.get("product_url"),
            "image_url": result.get("images", [None])[0],
            "image_urls": result.get("images", []),
            "specs": result.get("specs", {}),
        }

    def apply_to_document(self, item: Dict[str, Any], sync_result: Dict[str, Any]) -> Dict[str, Any]:
        if not sync_result.get("matched"):
            return {"matched": False}

        image_urls = sync_result.get("image_urls", [])
        image_url = sync_result.get("image_url") or (image_urls[0] if image_urls else item.get("image_url", ""))
        return {
            "image_url": image_url,
            "image_urls": image_urls or ([image_url] if image_url else []),
            "specs": sync_result.get("specs", item.get("specs", {})),
            "name": sync_result.get("name", item.get("name")),
            "brand": sync_result.get("brand", item.get("brand", "")),
            "category": sync_result.get("category", item.get("category")),
        }

    def sync_batch(self, items: List[Dict[str, Any]]) -> Dict[str, Any]:
        results = []
        summary = {"total": len(items), "matched": 0, "failed": 0, "images_downloaded": 0, "specs_found": 0}
        for item in items:
            sync_result = self.sync_inventory_item(item)
            if sync_result.get("matched"):
                summary["matched"] += 1
                summary["images_downloaded"] += len(sync_result.get("image_urls", []))
                summary["specs_found"] += len(sync_result.get("specs", {}))
            else:
                summary["failed"] += 1
            results.append(sync_result)
        return {"summary": summary, "results": results}

