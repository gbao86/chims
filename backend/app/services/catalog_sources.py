from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any, Dict, Iterable, List, Optional
from urllib.parse import quote_plus, urljoin, urlparse

import requests
from bs4 import BeautifulSoup

from app.services.internet_search import InternetSearchService, SearchResult


@dataclass
class CatalogAsset:
    source: str
    url: str
    kind: str = "image"
    credit: str = ""


@dataclass
class CatalogSourceResult:
    sku_code: str
    name: str
    category: str
    brand: str
    product_url: str
    images: List[CatalogAsset] = field(default_factory=list)
    specs: Dict[str, Any] = field(default_factory=dict)


class BaseSourceAdapter:
    source_name: str
    base_url: str

    def search(self, query: str) -> List[str]:
        raise NotImplementedError

    def parse_product(self, product_url: str) -> Optional[CatalogSourceResult]:
        raise NotImplementedError

    def _get(self, url: str) -> str:
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            )
        }
        response = requests.get(url, headers=headers, timeout=20)
        response.raise_for_status()
        return response.text


class GenericWebAdapter(BaseSourceAdapter):
    source_name = "internet"
    base_url = ""

    def search(self, query: str) -> List[str]:
        return []

    def parse_product(self, product_url: str) -> Optional[CatalogSourceResult]:
        html = self._get(product_url)
        soup = BeautifulSoup(html, "html.parser")
        title = self._pick_title(soup, product_url)
        images = self._extract_images(soup)
        specs = self._extract_specs(soup)
        brand = self._guess_brand(title, product_url)
        category = self._guess_category(product_url, title)
        sku_code = self._extract_sku(soup, product_url, title)
        return CatalogSourceResult(
            sku_code=sku_code,
            name=title.strip(),
            category=category,
            brand=brand,
            product_url=product_url,
            images=images,
            specs=specs,
        )

    def _pick_title(self, soup: BeautifulSoup, product_url: str) -> str:
        meta = self._meta(soup, "og:title")
        h1 = soup.select_one("h1")
        title = meta or (h1.get_text(" ", strip=True) if h1 else "")
        if title:
            return title
        return product_url.rsplit("/", 1)[-1].replace("-", " ").title()

    def _meta(self, soup: BeautifulSoup, prop: str) -> str:
        tag = soup.find("meta", attrs={"property": prop}) or soup.find("meta", attrs={"name": prop})
        return tag.get("content", "").strip() if tag else ""

    def _extract_images(self, soup: BeautifulSoup) -> List[CatalogAsset]:
        urls: List[str] = []
        for img in soup.select('img[src], img[data-src], img[data-zoom-image]'):
            for attr in ["src", "data-src", "data-zoom-image"]:
                src = img.get(attr) or ""
                if not src:
                    continue
                if src.startswith("//"):
                    src = f"https:{src}"
                full = urljoin("https://", src) if src.startswith("http") else src
                if any(ext in full.lower() for ext in [".jpg", ".jpeg", ".png", ".webp"]):
                    if full not in urls:
                        urls.append(full)
        return [CatalogAsset(source=self.source_name, url=u) for u in urls[:8]]

    def _extract_specs(self, soup: BeautifulSoup) -> Dict[str, Any]:
        specs: Dict[str, Any] = {}
        for row in soup.select("table tr"):
            cells = row.find_all(["th", "td"])
            if len(cells) >= 2:
                key = cells[0].get_text(" ", strip=True)
                value = cells[1].get_text(" ", strip=True)
                if key and value:
                    specs[key] = value
        return specs

    def _guess_brand(self, title: str, url: str) -> str:
        hay = f"{title} {url}".lower()
        brands = ["Intel", "AMD", "NVIDIA", "ASUS", "MSI", "Gigabyte", "Kingston", "Corsair", "Samsung", "WD", "Western Digital", "Seagate", "Noctua", "NZXT", "Zotac", "TeamGroup", "PNY", "Cooler Master", "G.Skill", "Acer", "Lenovo", "HP", "Dell"]
        for brand in brands:
            if brand.lower() in hay:
                return brand.replace("Western Digital", "WD")
        return ""

    def _guess_category(self, url: str, title: str) -> str:
        hay = f"{url} {title}".lower()
        mapping = [
            ("cpu", "CPU"),
            ("vga", "GPU"),
            ("gpu", "GPU"),
            ("ram", "RAM"),
            ("ssd", "Storage"),
            ("hdd", "Storage"),
            ("mainboard", "Mainboard"),
            ("motherboard", "Mainboard"),
            ("psu", "PSU"),
            ("nguon", "PSU"),
            ("case", "Case"),
            ("tan-nhiet", "Cooling"),
            ("fan", "Cooling"),
            ("man-hinh", "Monitor"),
            ("monitor", "Monitor"),
            ("keyboard", "Keyboard"),
            ("ban-phim", "Keyboard"),
            ("chuot", "Mouse"),
            ("mouse", "Mouse"),
            ("tai-nghe", "Headset"),
            ("headset", "Headset"),
        ]
        for needle, cat in mapping:
            if needle in hay:
                return cat
        return "Other"

    def _extract_sku(self, soup: BeautifulSoup, product_url: str, title: str) -> str:
        text = soup.get_text(" ", strip=True)
        match = re.search(r"Mã sản phẩm:\s*([A-Z0-9\-]+)", text, re.I)
        if match:
            return match.group(1).upper()
        slug = urlparse(product_url).path.rsplit("/", 1)[-1]
        slug = re.sub(r"[^a-zA-Z0-9]+", "-", slug).strip("-").upper()
        if slug:
            return slug[:32]
        fallback = re.sub(r"[^a-zA-Z0-9]+", "-", title).strip("-").upper()
        return fallback[:32] or "SKU-UNKNOWN"


class GearVNAdapter(GenericWebAdapter):
    source_name = "gearvn"
    base_url = "https://gearvn.com"

    def search(self, query: str) -> List[str]:
        return self._search_search_engine(query, site_filter="site:gearvn.com")

    def _search_search_engine(self, query: str, site_filter: str) -> List[str]:
        searcher = InternetSearchService()
        results = searcher.search(f'{site_filter} "{query}"', limit=10)
        return [r.url for r in results if "gearvn.com" in r.url.lower()]

    def parse_product(self, product_url: str) -> Optional[CatalogSourceResult]:
        return super().parse_product(product_url)


class MemoryZoneAdapter(GenericWebAdapter):
    source_name = "memoryzone"
    base_url = "https://memoryzone.com.vn"

    def search(self, query: str) -> List[str]:
        searcher = InternetSearchService()
        results = searcher.search(f'site:memoryzone.com.vn "{query}"', limit=10)
        return [r.url for r in results if "memoryzone.com.vn" in r.url.lower()]

    def parse_product(self, product_url: str) -> Optional[CatalogSourceResult]:
        return super().parse_product(product_url)


class CatalogPipeline:
    def __init__(self, adapters: Optional[Iterable[BaseSourceAdapter]] = None):
        self.adapters = list(adapters or [GearVNAdapter(), MemoryZoneAdapter(), GenericWebAdapter()])

    def _query_variants(self, query: str) -> List[str]:
        normalized = re.sub(r"\s+", " ", query).strip()
        variants = [normalized]
        compact = normalized.replace(" ", "")
        variants.append(compact)
        tokens = [t for t in re.split(r"\s+", normalized) if t]
        if len(tokens) > 2:
            variants.append(" ".join(tokens[:3]))
            variants.append(" ".join(tokens[-3:]))
        if tokens:
            variants.append(tokens[0])
        # dedupe preserving order
        seen = set()
        out = []
        for v in variants:
            key = v.lower().strip()
            if key and key not in seen:
                seen.add(key)
                out.append(v)
        return out

    def _score_match(self, query: str, result: CatalogSourceResult) -> int:
        q = re.sub(r"[^a-z0-9]+", "", query.lower())
        n = re.sub(r"[^a-z0-9]+", "", result.name.lower())
        score = 0
        if q and q in n:
            score += 50
        q_tokens = [t for t in re.split(r"[^a-z0-9]+", query.lower()) if t]
        n_text = result.name.lower()
        for token in q_tokens:
            if len(token) > 2 and token in n_text:
                score += 10
        if result.brand and result.brand.lower() in query.lower():
            score += 10
        if result.category and result.category.lower() in query.lower():
            score += 5
        return score

    def find_best_match(self, query: str) -> Optional[CatalogSourceResult]:
        best: Optional[CatalogSourceResult] = None
        best_score = -1
        seen_urls = set()

        for variant in self._query_variants(query):
            for adapter in self.adapters:
                try:
                    urls = adapter.search(variant)
                except Exception:
                    continue
                for product_url in urls:
                    if product_url in seen_urls:
                        continue
                    seen_urls.add(product_url)
                    try:
                        result = adapter.parse_product(product_url)
                    except Exception:
                        continue
                    if not result:
                        continue
                    score = self._score_match(query, result)
                    if score > best_score:
                        best_score = score
                        best = result
                    if score >= 50:
                        return result

        return best
