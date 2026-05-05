from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional
from urllib.parse import quote_plus, urlparse

import requests
from bs4 import BeautifulSoup


@dataclass
class SearchResult:
    title: str
    url: str
    snippet: str = ""
    source: str = "duckduckgo"


class InternetSearchService:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            )
        })

    def search(self, query: str, limit: int = 10) -> List[SearchResult]:
        results: List[SearchResult] = []
        try:
            results.extend(self._duckduckgo(query, limit))
        except Exception:
            pass
        try:
            if len(results) < limit:
                results.extend(self._bing(query, limit - len(results)))
        except Exception:
            pass
        deduped: List[SearchResult] = []
        seen = set()
        for r in results:
            key = self._normalize_url(r.url)
            if key in seen:
                continue
            seen.add(key)
            deduped.append(r)
            if len(deduped) >= limit:
                break
        return deduped

    def _duckduckgo(self, query: str, limit: int) -> List[SearchResult]:
        url = f"https://duckduckgo.com/html/?q={quote_plus(query)}"
        html = self.session.get(url, timeout=20).text
        soup = BeautifulSoup(html, "html.parser")
        results: List[SearchResult] = []
        for a in soup.select("a.result__a"):
            href = a.get("href") or ""
            title = a.get_text(" ", strip=True)
            if href and title:
                results.append(SearchResult(title=title, url=href, source="duckduckgo"))
            if len(results) >= limit:
                break
        return results

    def _bing(self, query: str, limit: int) -> List[SearchResult]:
        url = f"https://www.bing.com/search?q={quote_plus(query)}"
        html = self.session.get(url, timeout=20).text
        soup = BeautifulSoup(html, "html.parser")
        results: List[SearchResult] = []
        for li in soup.select("li.b_algo"):
            a = li.select_one("h2 a")
            if not a:
                continue
            href = a.get("href") or ""
            title = a.get_text(" ", strip=True)
            snippet_node = li.select_one("p")
            snippet = snippet_node.get_text(" ", strip=True) if snippet_node else ""
            if href and title:
                results.append(SearchResult(title=title, url=href, snippet=snippet, source="bing"))
            if len(results) >= limit:
                break
        return results

    def _normalize_url(self, url: str) -> str:
        parsed = urlparse(url)
        return f"{parsed.netloc}{parsed.path}".rstrip("/")
