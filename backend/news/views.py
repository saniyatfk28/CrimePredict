import re
import logging
from typing import Any, Dict, List, Optional, Tuple


import feedparser
import requests
from bs4 import BeautifulSoup
from rest_framework.response import Response
from rest_framework.views import APIView


logger = logging.getLogger(__name__)


RSS_FEEDS = [
    "https://www.thedailystar.net/frontpage/rss.xml ",
    "https://www.banglanews24.com/rss/rss.xml ",
]

CRIME_KEYWORDS = [
    "crime",
    "murder",
    "theft",
    "robbery",
    "arrest",
    "police",
    "violence",
    "assault",
]


def _normalize_url(url: Any) -> Optional[str]:
    if url is None:
        return None
    try:
        s = str(url).strip()
    except Exception:
        return None
    if not s or s.lower() == 'none':
        return None
    return s




def _get_media_thumbnail_url(entry: Any) -> Optional[str]:
    """Priority extraction based on feedparser fields.

    Step 1: RSS media fields (preferred)
      - media:thumbnail -> entry.media_thumbnail[0]["url"]
      - media_content -> entry.media_content[0]["url"]
      - enclosure -> entry.enclosures[0]["url"]
    """

    try:
        media_thumb = getattr(entry, "media_thumbnail", None)
        if media_thumb and isinstance(media_thumb, list) and media_thumb:
            url = media_thumb[0].get("url") if isinstance(media_thumb[0], dict) else None
            if url:
                return _normalize_url(url)
    except Exception:
        pass

    try:
        media_content = getattr(entry, "media_content", None)
        if media_content and isinstance(media_content, list) and media_content:
            url = media_content[0].get("url") if isinstance(media_content[0], dict) else None
            if url:
                return _normalize_url(url)
    except Exception:
        pass

    try:
        enclosures = getattr(entry, "enclosures", None)
        if enclosures and isinstance(enclosures, list) and enclosures:
            url = enclosures[0].get("url") if isinstance(enclosures[0], dict) else None
            if url:
                return _normalize_url(url)
    except Exception:
        pass

    return None


def _extract_og_image_from_html(html: str) -> Optional[str]:
    try:
        soup = BeautifulSoup(html, "html.parser")
        meta = soup.find("meta", attrs={"property": "og:image"})
        if meta and meta.get("content"):
            return _normalize_url(meta.get("content"))
    except Exception:
        return None
    return None


def _fetch_og_image(link: str, timeout_seconds: int = 8) -> Optional[str]:
    """Step 2 fallback: fetch article HTML page and extract OpenGraph image."""
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (compatible; CrimePredictBot/1.0; +https://example.com)"
        }
        resp = requests.get(link, headers=headers, timeout=timeout_seconds)
        resp.raise_for_status()
        return _extract_og_image_from_html(resp.text)
    except Exception:
        return None


def _strip_html(text: str) -> str:
    # RSS titles sometimes come HTML-wrapped; remove tags for clean UI
    return re.sub(r"<[^>]*>", "", text or "").strip()


def _matches_crime_keyword(title: str) -> bool:
    title_l = (title or "").lower()
    return any(k in title_l for k in CRIME_KEYWORDS)



class CrimeNewsView(APIView):

    """GET /api/news/crime/

    Live RSS aggregator (no DB, no caching in DB).
    """

    authentication_classes = []
    permission_classes = []

    def get(self, request):
        results: List[Dict[str, Optional[str]]] = []

        for feed_url_raw in RSS_FEEDS:
            feed_url = _normalize_url(feed_url_raw)
            if not feed_url:
                continue

            try:
                parsed = feedparser.parse(feed_url)
            except Exception:
                logger.exception("Failed to parse feed: %s", feed_url)
                continue

            feed_title = _normalize_url(
                getattr(parsed, "feed", {}).get("title") if hasattr(parsed, "feed") else None
            )

            entries = getattr(parsed, "entries", None) or []
            for entry in entries:
                raw_title = _normalize_url(getattr(entry, "title", None)) or ""
                title = _strip_html(raw_title)

                link = _normalize_url(getattr(entry, "link", None))
                if not title or not link:
                    continue

                # Filtering logic: title matching only
                if not _matches_crime_keyword(title):
                    continue

                image = _get_media_thumbnail_url(entry)

                # Step 2 fallback: OpenGraph image extraction
                if not image:
                    image = _fetch_og_image(link)

                source_raw = getattr(entry, "source", None)
                # feedparser sometimes gives nested/dict-like objects for source
                source = (
                    _normalize_url(getattr(source_raw, "title", None))
                    or _normalize_url(getattr(source_raw, "href", None))
                    or feed_title
                    or "Unknown"
                )


                results.append(
                    {
                        "title": title,
                        "link": link,
                        "image": image,
                        "source": source,
                    }
                )

        # Lightweight de-dup by link while preserving order
        seen = set()
        deduped: List[Dict[str, Optional[str]]] = []
        for r in results:
            if r["link"] in seen:
                continue
            seen.add(r["link"])
            deduped.append(r)

        return Response(deduped[:30])


