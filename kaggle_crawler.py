"""
Kaggle-ready single-file crawler for CHIMS catalog research.

What it does:
- Takes a list of product names (edit POPULAR_SKUS below)
- Searches the web for likely product pages
- Parses title, specs, and image gallery
- Saves a JSON report locally

Install:
    pip install requests beautifulsoup4

Run:
    python kaggle_crawler.py
"""

from __future__ import annotations

import json
import re
import time
from dataclasses import dataclass, asdict, field
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.parse import quote_plus, urljoin, urlparse

import requests
from bs4 import BeautifulSoup

OUT_DIR = Path(".")
REPORT_PATH = OUT_DIR / "kaggle_catalog_report.json"
IMAGES_DIR = OUT_DIR / "catalog_images"
IMAGES_DIR.mkdir(exist_ok=True)

POPULAR_SKUS = [
    # Replace/extend this list to 200 items if you want a wider batch.
    "AMD Ryzen 5 5600X",
    "Intel Core i7-13700K",
    "AMD Ryzen 9 7950X",
    "NVIDIA RTX 4060 Ti",
    "AMD RX 7800 XT",
    "NVIDIA RTX 4090",
    "Kingston Fury Beast DDR4 16GB",
    "Corsair Vengeance DDR5 32GB",
    "G.Skill Trident Z5 RGB DDR5 32GB",
    "Samsung 980 PRO 1TB",
    "WD Black SN850X 2TB",
    "Seagate BarraCuda 2TB",
    "ASUS ROG STRIX B550-F Gaming",
    "MSI MAG Z790 TOMAHAWK WiFi",
    "Corsair RM850x 850W",
    "Seasonic Focus GX-1000 1000W",
    "NZXT H510 Flow",
    "Noctua NH-D15",
]


@dataclass
class Asset:
    source: str
    url: str


@dataclass
class MatchResult:
    query: str
    matched: bool
    title: str = ""
    url: str = ""
    brand: str = ""
    category: str = ""
    images: List[str] = field(default_factory=list)
    specs: Dict[str, Any] = field(default_factory=dict)
    reason: str = ""


class WebSearch:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update(
            {
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
                )
            }
        )

    def search(self, query: str, limit: int = 10) -> List[str]:
        urls: List[str] = []
        for q in [f'site:gearvn.com "{query}"', f'site:memoryzone.com.vn "{query}"', query]:
            try:
                urls.extend(self._duckduckgo(q, limit))
            except Exception:
                pass
            try:
                urls.extend(self._bing(q, limit))
            except Exception:
                pass
        deduped = []
        seen = set()
        for u in urls:
            key = self._norm(u)
            if key not in seen:
                seen.add(key)
                deduped.append(u)
            if len(deduped) >= limit:
                break
        return deduped

    def _duckduckgo(self, query: str, limit: int) -> List[str]:
        html = self.session.get(f"https://duckduckgo.com/html/?q={quote_plus(query)}", timeout=20).text
        soup = BeautifulSoup(html, "html.parser")
        out = []
        for a in soup.select("a.result__a"):
            href = a.get("href") or ""
            if href:
                out.append(href)
            if len(out) >= limit:
                break
        return out

    def _bing(self, query: str, limit: int) -> List[str]:
        html = self.session.get(f"https://www.bing.com/search?q={quote_plus(query)}", timeout=20).text
        soup = BeautifulSoup(html, "html.parser")
        out = []
        for li in soup.select("li.b_algo"):
            a = li.select_one("h2 a")
            if a and a.get("href"):
                out.append(a.get("href"))
            if len(out) >= limit:
                break
        return out

    def _norm(self, url: str) -> str:
        p = urlparse(url)
        return f"{p.netloc}{p.path}".rstrip("/")


class Parser:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update(
            {
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
                )
            }
        )

    def parse(self, url: str) -> Optional[MatchResult]:
        try:
            html = self.session.get(url, timeout=25).text
        except Exception as exc:
            return MatchResult(query=url, matched=False, reason=f"fetch failed: {exc}")

        soup = BeautifulSoup(html, "html.parser")
        title = self._title(soup, url)
        images = self._images(soup, url)
        specs = self._specs(soup)
        brand = self._brand(title)
        category = self._category(url, title)
        return MatchResult(query=url, matched=True, title=title, url=url, brand=brand, category=category, images=images, specs=specs)

    def _title(self, soup: BeautifulSoup, url: str) -> str:
        for selector in ["meta[property='og:title']", "h1", "title"]:
            if selector.startswith("meta"):
                tag = soup.select_one(selector)
                if tag and tag.get("content"):
                    return tag.get("content").strip()
            else:
                tag = soup.select_one(selector)
                if tag and tag.get_text(strip=True):
                    return tag.get_text(" ", strip=True)
        return url.rsplit("/", 1)[-1]

    def _images(self, soup: BeautifulSoup, base: str) -> List[str]:
        out: List[str] = []
        for img in soup.select("img[src], img[data-src], img[data-zoom-image]"):
            for attr in ["src", "data-src", "data-zoom-image"]:
                src = img.get(attr) or ""
                if not src:
                    continue
                if src.startswith("//"):
                    src = "https:" + src
                full = urljoin(base, src)
                if any(ext in full.lower() for ext in [".jpg", ".jpeg", ".png", ".webp"]):
                    if full not in out:
                        out.append(full)
        return out[:8]

    def _specs(self, soup: BeautifulSoup) -> Dict[str, Any]:
        specs: Dict[str, Any] = {}
        for row in soup.select("table tr"):
            cells = row.find_all(["th", "td"])
            if len(cells) >= 2:
                k = cells[0].get_text(" ", strip=True)
                v = cells[1].get_text(" ", strip=True)
                if k and v:
                    specs[k] = v
        return specs

    def _brand(self, title: str) -> str:
        brands = ["Intel", "AMD", "NVIDIA", "ASUS", "MSI", "Gigabyte", "Kingston", "Corsair", "Samsung", "WD", "Seagate", "Noctua", "NZXT", "G.Skill", "Razer", "Logitech"]
        for b in brands:
            if b.lower() in title.lower():
                return b
        return ""

    def _category(self, url: str, title: str) -> str:
        hay = f"{url} {title}".lower()
        rules = [
            ("cpu", "CPU"), ("gpu", "GPU"), ("vga", "GPU"), ("ram", "RAM"), ("ssd", "Storage"), ("hdd", "Storage"),
            ("mainboard", "Mainboard"), ("motherboard", "Mainboard"), ("psu", "PSU"), ("nguon", "PSU"),
            ("case", "Case"), ("cool", "Cooling"), ("fan", "Cooling"), ("monitor", "Monitor"),
            ("man-hinh", "Monitor"), ("keyboard", "Keyboard"), ("mouse", "Mouse"), ("chuot", "Mouse"),
            ("headset", "Headset"), ("tai-nghe", "Headset"),
        ]
        for needle, cat in rules:
            if needle in hay:
                return cat
        return "Other"


class Crawler:
    def __init__(self):
        self.searcher = WebSearch()
        self.parser = Parser()

    def crawl_one(self, query: str) -> MatchResult:
        print(f"[crawl] searching: {query}")
        urls = self.searcher.search(query, limit=8)
        print(f"[crawl] candidates={len(urls)}")
        best: Optional[MatchResult] = None
        best_score = -1
        for url in urls:
            print(f"[crawl] parsing: {url}")
            res = self.parser.parse(url)
            if not res or not res.matched:
                continue
            score = self.score(query, res)
            if score > best_score:
                best_score = score
                best = res
            if score >= 60:
                return res
        return best or MatchResult(query=query, matched=False, reason="no match")

    def score(self, query: str, res: MatchResult) -> int:
        q = re.sub(r"[^a-z0-9]+", "", query.lower())
        t = re.sub(r"[^a-z0-9]+", "", res.title.lower())
        score = 0
        if q and q in t:
            score += 50
        for token in [x for x in re.split(r"[^a-z0-9]+", query.lower()) if len(x) > 2]:
            if token in res.title.lower():
                score += 10
        if res.brand and res.brand.lower() in query.lower():
            score += 10
        return score


def main():
    crawler = Crawler()
    results = []
    started = time.perf_counter()
    for idx, q in enumerate(POPULAR_SKUS, start=1):
        print(f"\n[{idx}/{len(POPULAR_SKUS)}] {q}")
        res = crawler.crawl_one(q)
        results.append(asdict(res))
        print(f"[done] matched={res.matched} title={res.title[:80]} images={len(res.images)} specs={len(res.specs)} reason={res.reason}")
    payload = {
        "summary": {
            "total": len(results),
            "matched": sum(1 for r in results if r["matched"]),
            "failed": sum(1 for r in results if not r["matched"]),
            "elapsed_seconds": round(time.perf_counter() - started, 1),
        },
        "results": results,
    }
    REPORT_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nSaved report to {REPORT_PATH.resolve()}")


if __name__ == "__main__":
    main()
