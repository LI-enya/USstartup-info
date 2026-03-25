#!/usr/bin/env python3
"""
USstartup-info — Daily auto-update data collection script
Scrapes free public sources (RSS feeds, media pages) for startup CEO interviews
and DTC brand news. Runs via GitHub Actions daily.
"""

import requests
from bs4 import BeautifulSoup
import json
import re
import datetime
import sys
import os
import time
import random
import hashlib
import xml.etree.ElementTree as ET

# --- Config ---
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7,ja;q=0.6",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

# Use UTC for consistency in GitHub Actions
TODAY = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")

# Project root directory
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# --- RSS / Atom feed sources for CEO interviews ---
CEO_FEED_SOURCES = {
    "us": [
        # Lenny's Newsletter (Substack RSS)
        {
            "name": "Lenny's Podcast",
            "url": "https://www.lennysnewsletter.com/feed",
            "type": "rss",
            "keywords": ["CEO", "founder", "startup", "growth", "product", "company"],
        },
        # TechCrunch Startups
        {
            "name": "TechCrunch",
            "url": "https://techcrunch.com/category/startups/feed/",
            "type": "rss",
            "keywords": ["CEO", "founder", "startup", "raises", "funding", "launch"],
        },
        # Hacker News Best
        {
            "name": "Hacker News",
            "url": "https://hnrss.org/best?q=startup+founder",
            "type": "rss",
            "keywords": ["CEO", "founder", "startup", "YC", "launch"],
        },
        # Y Combinator blog
        {
            "name": "Y Combinator",
            "url": "https://www.ycombinator.com/blog/rss/",
            "type": "rss",
            "keywords": ["CEO", "founder", "startup", "launched", "YC"],
        },
    ],
    "jp": [
        # FastGrow
        {
            "name": "FastGrow",
            "url": "https://www.fastgrow.jp/feed",
            "type": "rss",
            "keywords": ["CEO", "創業", "起業", "スタートアップ", "経営", "代表"],
        },
        # BRIDGE (THE BRIDGE)
        {
            "name": "BRIDGE",
            "url": "https://thebridge.jp/feed",
            "type": "rss",
            "keywords": ["CEO", "創業者", "スタートアップ", "資金調達", "インタビュー"],
        },
        # INITIAL (Startup DB) feed
        {
            "name": "INITIAL",
            "url": "https://initial.inc/feed",
            "type": "rss",
            "keywords": ["CEO", "代表", "スタートアップ", "資金調達", "創業"],
        },
    ],
}

# --- Web scraping sources for DTC brands ---
DTC_SCRAPE_SOURCES = {
    "us": [
        {
            "name": "Modern Retail",
            "url": "https://www.modernretail.co/feed/",
            "type": "rss",
            "keywords": ["DTC", "D2C", "brand", "direct-to-consumer", "ecommerce",
                         "revenue", "funding", "valuation", "retail"],
        },
        {
            "name": "Retail Dive",
            "url": "https://www.retaildive.com/feeds/news/",
            "type": "rss",
            "keywords": ["DTC", "D2C", "brand", "startup", "funding",
                         "direct-to-consumer", "ecommerce"],
        },
    ],
    "jp": [
        {
            "name": "BRIDGE",
            "url": "https://thebridge.jp/feed",
            "type": "rss",
            "keywords": ["D2C", "DTC", "EC", "ブランド", "消費者直販"],
        },
    ],
}


def fetch_page(url, retries=2):
    """Fetch a URL and return its text content."""
    for attempt in range(retries + 1):
        try:
            time.sleep(random.uniform(0.8, 2.0))
            resp = requests.get(url, headers=HEADERS, timeout=15, allow_redirects=True)
            resp.raise_for_status()
            resp.encoding = resp.apparent_encoding or "utf-8"
            return resp.text
        except Exception as e:
            print(f"  [WARN] {url} attempt {attempt+1} failed: {e}", file=sys.stderr)
            if attempt < retries:
                time.sleep(2)
    return None


def parse_rss_feed(xml_text, source_name):
    """Parse RSS/Atom feed and return list of entries."""
    if not xml_text:
        return []

    entries = []
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError as e:
        print(f"  [WARN] Failed to parse feed from {source_name}: {e}", file=sys.stderr)
        return []

    # Handle both RSS and Atom namespaces
    ns = {"atom": "http://www.w3.org/2005/Atom",
          "dc": "http://purl.org/dc/elements/1.1/",
          "content": "http://purl.org/rss/1.0/modules/content/"}

    # Try RSS 2.0 format
    for item in root.iter("item"):
        entry = {}
        title_el = item.find("title")
        link_el = item.find("link")
        desc_el = item.find("description")
        date_el = item.find("pubDate")
        if date_el is None:
            date_el = item.find("dc:date", ns)

        entry["title"] = title_el.text.strip() if title_el is not None and title_el.text else ""
        entry["url"] = link_el.text.strip() if link_el is not None and link_el.text else ""
        entry["description"] = ""
        if desc_el is not None and desc_el.text:
            # Strip HTML from description
            soup = BeautifulSoup(desc_el.text, "html.parser")
            entry["description"] = soup.get_text(strip=True)[:500]

        entry["date"] = ""
        if date_el is not None and date_el.text:
            entry["date"] = parse_date(date_el.text.strip())

        entry["source_name"] = source_name
        if entry["title"] and entry["url"]:
            entries.append(entry)

    # Try Atom format
    if not entries:
        for item in root.iter("{http://www.w3.org/2005/Atom}entry"):
            entry = {}
            title_el = item.find("{http://www.w3.org/2005/Atom}title")
            link_el = item.find("{http://www.w3.org/2005/Atom}link")
            summary_el = item.find("{http://www.w3.org/2005/Atom}summary")
            content_el = item.find("{http://www.w3.org/2005/Atom}content")
            date_el = item.find("{http://www.w3.org/2005/Atom}published")
            if date_el is None:
                date_el = item.find("{http://www.w3.org/2005/Atom}updated")

            entry["title"] = title_el.text.strip() if title_el is not None and title_el.text else ""
            entry["url"] = link_el.get("href", "") if link_el is not None else ""
            desc_text = ""
            if summary_el is not None and summary_el.text:
                desc_text = summary_el.text
            elif content_el is not None and content_el.text:
                desc_text = content_el.text
            soup = BeautifulSoup(desc_text, "html.parser")
            entry["description"] = soup.get_text(strip=True)[:500]

            entry["date"] = ""
            if date_el is not None and date_el.text:
                entry["date"] = parse_date(date_el.text.strip())

            entry["source_name"] = source_name
            if entry["title"] and entry["url"]:
                entries.append(entry)

    return entries


def parse_date(date_str):
    """Parse various date formats into YYYY-MM-DD."""
    if not date_str:
        return ""

    # Try ISO 8601 formats
    for fmt in [
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%dT%H:%M:%S.%f%z",
        "%Y-%m-%d",
    ]:
        try:
            dt = datetime.datetime.strptime(date_str[:26], fmt[:len(date_str[:26])])
            return dt.strftime("%Y-%m-%d")
        except (ValueError, IndexError):
            continue

    # Try RFC 2822 (RSS pubDate format): "Mon, 01 Jan 2025 00:00:00 +0000"
    try:
        from email.utils import parsedate_to_datetime
        dt = parsedate_to_datetime(date_str)
        return dt.strftime("%Y-%m-%d")
    except Exception:
        pass

    # Try extracting YYYY-MM-DD from the string
    m = re.search(r'(\d{4}-\d{2}-\d{2})', date_str)
    if m:
        return m.group(1)

    return ""


def matches_keywords(text, keywords):
    """Check if text contains any of the keywords (case-insensitive)."""
    text_lower = text.lower()
    return any(kw.lower() in text_lower for kw in keywords)


def generate_id(prefix, title, url):
    """Generate a stable unique ID from content."""
    h = hashlib.md5((title + url).encode("utf-8")).hexdigest()[:8]
    return f"{prefix}-{h}"


def collect_ceo_entries(market):
    """Collect CEO interview entries from RSS feeds."""
    sources = CEO_FEED_SOURCES.get(market, [])
    new_entries = []

    for source in sources:
        print(f"[INFO] Fetching CEO feed: {source['name']}")
        xml_text = fetch_page(source["url"])
        feed_entries = parse_rss_feed(xml_text, source["name"])
        print(f"  Found {len(feed_entries)} feed items")

        for entry in feed_entries:
            # Filter: must match at least one keyword
            combined_text = entry["title"] + " " + entry["description"]
            if not matches_keywords(combined_text, source["keywords"]):
                continue

            # Skip entries without dates or very old entries (>90 days)
            if not entry["date"]:
                continue

            try:
                entry_date = datetime.datetime.strptime(entry["date"], "%Y-%m-%d")
                today_dt = datetime.datetime.strptime(TODAY, "%Y-%m-%d")
                if (today_dt - entry_date).days > 90:
                    continue
            except ValueError:
                continue

            # Extract speaker/company from title using common patterns
            speaker, company = extract_speaker_company(entry["title"])

            new_entry = {
                "id": generate_id(f"{market}-ceo", entry["title"], entry["url"]),
                "type": "article",
                "title_zh": entry["title"],  # Keep original, no auto-translation
                "title_en": entry["title"],
                "speaker": speaker,
                "speaker_zh": speaker,
                "speaker_en": speaker,
                "company": company,
                "company_zh": company,
                "desc_zh": entry["description"][:300] if entry["description"] else entry["title"],
                "desc_en": entry["description"][:300] if entry["description"] else entry["title"],
                "tags": extract_tags(entry["title"] + " " + entry["description"]),
                "market_zh": "北美" if market == "us" else "日本",
                "market_en": "North America" if market == "us" else "Japan",
                "date": entry["date"],
                "source_url": entry["url"],
                "source_name": source["name"],
            }

            # Add Japanese fields for JP market
            if market == "jp":
                new_entry["title_ja"] = entry["title"]
                new_entry["speaker_ja"] = speaker
                new_entry["company_ja"] = company
                new_entry["desc_ja"] = entry["description"][:300] if entry["description"] else entry["title"]
                new_entry["market_ja"] = "日本"

            new_entries.append(new_entry)

    return new_entries


def collect_dtc_entries(market):
    """Collect DTC brand entries from RSS feeds and web scraping."""
    sources = DTC_SCRAPE_SOURCES.get(market, [])
    new_entries = []

    for source in sources:
        print(f"[INFO] Fetching DTC feed: {source['name']}")
        xml_text = fetch_page(source["url"])
        feed_entries = parse_rss_feed(xml_text, source["name"])
        print(f"  Found {len(feed_entries)} feed items")

        for entry in feed_entries:
            combined_text = entry["title"] + " " + entry["description"]
            if not matches_keywords(combined_text, source["keywords"]):
                continue

            if not entry["date"]:
                continue

            try:
                entry_date = datetime.datetime.strptime(entry["date"], "%Y-%m-%d")
                today_dt = datetime.datetime.strptime(TODAY, "%Y-%m-%d")
                if (today_dt - entry_date).days > 90:
                    continue
            except ValueError:
                continue

            # Extract brand name from title
            brand_name = extract_brand_name(entry["title"])

            new_entry = {
                "id": generate_id(f"{market}-dtc", entry["title"], entry["url"]),
                "name": brand_name,
                "name_zh": brand_name,
                "name_en": brand_name,
                "tagline_zh": entry["title"][:60],
                "tagline_en": entry["title"][:60],
                "url": entry["url"],
                "desc_zh": entry["description"][:300] if entry["description"] else entry["title"],
                "desc_en": entry["description"][:300] if entry["description"] else entry["title"],
                "category_zh": "DTC品牌",
                "category_en": "DTC Brand",
                "market_zh": "美国" if market == "us" else "日本",
                "market_en": "United States" if market == "us" else "Japan",
                "tags": extract_tags(entry["title"] + " " + entry["description"]),
                "founded": "",
                "funding": "",
                "source_url": entry["url"],
                "source_name": source["name"],
                "date": entry["date"],
            }

            if market == "jp":
                new_entry["name_ja"] = brand_name
                new_entry["tagline_ja"] = entry["title"][:60]
                new_entry["desc_ja"] = entry["description"][:300] if entry["description"] else entry["title"]
                new_entry["category_ja"] = "DTCブランド"
                new_entry["market_ja"] = "日本"

            new_entries.append(new_entry)

    return new_entries


def extract_speaker_company(title):
    """Try to extract speaker name and company from article title."""
    # Pattern: "Name (Company)" or "Name, Company" or "Name | Company"
    patterns = [
        r'(?:^|\|)\s*([A-Z][a-z]+ [A-Z][a-z]+)\s*\(([^)]+)\)',  # "Name (Company)"
        r'([A-Z][a-z]+ [A-Z][a-z]+)\s*[,|]\s*(?:CEO|founder|co-founder)\s*(?:of|at)\s+(\w[\w\s]*)',
    ]
    for pattern in patterns:
        m = re.search(pattern, title, re.IGNORECASE)
        if m:
            return m.group(1).strip(), m.group(2).strip()

    return "", ""


def extract_brand_name(title):
    """Extract brand name from article title."""
    # Try to find a capitalized brand name
    # Remove common prefixes
    title = re.sub(r'^(How|Why|What|The|Meet|Inside|Exclusive:)\s+', '', title, flags=re.IGNORECASE)
    # Get first 2-3 words as potential brand name
    words = title.split()[:3]
    return " ".join(words) if words else title[:30]


def extract_tags(text):
    """Extract relevant tags from text."""
    tag_keywords = {
        "AI": ["AI", "artificial intelligence", "machine learning", "LLM"],
        "SaaS": ["SaaS", "software as a service"],
        "fintech": ["fintech", "finance", "payment", "banking"],
        "health": ["health", "wellness", "medical", "biotech"],
        "e-commerce": ["ecommerce", "e-commerce", "retail", "shopping"],
        "DTC": ["DTC", "D2C", "direct-to-consumer"],
        "food": ["food", "beverage", "nutrition", "snack"],
        "fashion": ["fashion", "apparel", "clothing", "beauty"],
        "climate": ["climate", "sustainability", "clean energy", "green"],
        "crypto": ["crypto", "blockchain", "web3"],
        "funding": ["funding", "raised", "valuation", "series", "資金調達"],
        "IPO": ["IPO", "上場", "public offering"],
    }

    tags = []
    text_lower = text.lower()
    for tag, keywords in tag_keywords.items():
        if any(kw.lower() in text_lower for kw in keywords):
            tags.append(tag)
    return tags[:6]


def load_existing_data(filepath):
    """Load existing JSON data file."""
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []


def merge_entries(existing, new_entries, max_items=20):
    """Merge new entries into existing, avoiding duplicates by URL. Keep max_items."""
    existing_urls = {item.get("source_url", item.get("url", "")) for item in existing}
    existing_ids = {item.get("id", "") for item in existing}

    added = 0
    for entry in new_entries:
        entry_url = entry.get("source_url", entry.get("url", ""))
        if entry_url in existing_urls:
            continue
        if entry.get("id", "") in existing_ids:
            continue
        existing.insert(0, entry)  # Add to front (newest first)
        existing_urls.add(entry_url)
        added += 1

    # Sort by date (newest first) and trim
    existing.sort(key=lambda x: x.get("date", ""), reverse=True)
    if len(existing) > max_items:
        existing = existing[:max_items]

    return existing, added


def save_data(filepath, data):
    """Save data to JSON file."""
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"[OK] Saved {len(data)} entries to {filepath}")


def main():
    print(f"=== USstartup-info Data Collection: {TODAY} ===\n")

    total_added = 0

    for market in ["us", "jp"]:
        print(f"\n--- {market.upper()} Market ---")

        # CEO interviews
        ceo_path = os.path.join(PROJECT_ROOT, "data", market, "ceo.json")
        existing_ceo = load_existing_data(ceo_path)
        new_ceo = collect_ceo_entries(market)
        print(f"  CEO: found {len(new_ceo)} candidates from feeds")
        merged_ceo, ceo_added = merge_entries(existing_ceo, new_ceo)
        if ceo_added > 0:
            save_data(ceo_path, merged_ceo)
            total_added += ceo_added
        print(f"  CEO: added {ceo_added} new entries (total: {len(merged_ceo)})")

        # DTC brands
        dtc_path = os.path.join(PROJECT_ROOT, "data", market, "dtc.json")
        existing_dtc = load_existing_data(dtc_path)
        new_dtc = collect_dtc_entries(market)
        print(f"  DTC: found {len(new_dtc)} candidates from feeds")
        merged_dtc, dtc_added = merge_entries(existing_dtc, new_dtc)
        if dtc_added > 0:
            save_data(dtc_path, merged_dtc)
            total_added += dtc_added
        print(f"  DTC: added {dtc_added} new entries (total: {len(merged_dtc)})")

    print(f"\n=== Done: {TODAY} — Total new entries added: {total_added} ===")
    return total_added


if __name__ == "__main__":
    main()
