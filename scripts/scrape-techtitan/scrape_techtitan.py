"""
Scrape product list from Tech Titan (techtitanlb.com) homepage.
Run: pip install -r requirements.txt  then  python scrape_techtitan.py
"""

import json
import re
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup

BASE_URL = "https://techtitanlb.com/"
OUTPUT_JSON = Path(__file__).resolve().parent / "techtitan_products.json"


def fetch_page(url: str) -> str:
    """Fetch HTML from URL. Uses a browser-like User-Agent to avoid blocks."""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }
    resp = requests.get(url, headers=headers, timeout=15)
    resp.raise_for_status()
    return resp.text


def parse_price(text: str) -> str:
    """Extract price string (e.g. $60.00 or $25.00 – $100.00)."""
    if not text:
        return ""
    return text.strip()


def scrape_homepage(url: str = BASE_URL) -> list[dict]:
    """
    Scrape product titles, links, and prices from the Tech Titan homepage.
    WooCommerce often uses li.product; we try several selectors for compatibility.
    """
    html = fetch_page(url)
    soup = BeautifulSoup(html, "html.parser")
    products = []

    # WooCommerce product loop: each product is usually in li.product
    product_cards = soup.select("li.product")
    if not product_cards:
        # Fallback: look for product links that point to /product/
        product_links = soup.select('a[href*="/product/"]')
        seen_urls = set()
        for link in product_links:
            href = link.get("href", "")
            if not href or href in seen_urls:
                continue
            # Skip cart, wishlist, category links
            if "add-to-cart" in href or "add_to_wishlist" in href or "/product-category/" in href:
                continue
            title_el = link.select_one(".woocommerce-loop-product__title, h2, h3, .product-title")
            title = (title_el or link).get_text(strip=True)
            # Skip slider/CTA links (e.g. "BUY IT NOW for Just 690$")
            if not title or len(title) < 3 or title.upper().startswith(("BUY IT NOW", "SHOP NOW")):
                continue
            seen_urls.add(href)
            price_el = link.find_next(string=re.compile(r"\$[\d,]+\.?\d*"))
            price = parse_price(price_el) if price_el else ""
            products.append({"title": title, "url": href, "price": price})
        return products

    for card in product_cards:
        # Link to product page
        link = card.select_one("a.woocommerce-LoopProduct-link, a[href*='/product/']")
        if not link:
            link = card.find("a", href=re.compile(r"/product/"))
        if not link:
            continue
        href = link.get("href", "")
        if not href or "add-to-cart" in href or "add_to_wishlist" in href:
            continue

        # Title (often in h2/h3 or .woocommerce-loop-product__title)
        title_el = card.select_one(".woocommerce-loop-product__title, h2, h3, .product-title")
        title = (title_el or link).get_text(strip=True)
        if not title:
            continue

        # Price (WooCommerce uses .price .amount or ins/del for sale)
        price_el = card.select_one(".price .amount, .price ins .amount, .price")
        price = ""
        if price_el:
            price = parse_price(price_el.get_text(separator=" ", strip=True))
        if not price and card.select_one(".price"):
            price = parse_price(card.select_one(".price").get_text(separator=" ", strip=True))

        products.append({"title": title, "url": href, "price": price})

    return products


def main():
    print("Fetching", BASE_URL, "...")
    products = scrape_homepage(BASE_URL)
    print(f"Found {len(products)} products.")

    for i, p in enumerate(products[:10], 1):
        print(f"  {i}. {p['title'][:50]} ... | {p.get('price', '')} | {p['url'][:50]}...")

    if len(products) > 10:
        print(f"  ... and {len(products) - 10} more.")

    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(products, f, ensure_ascii=False, indent=2)
    print(f"\nSaved to {OUTPUT_JSON}")

    # Optional: scrape a category (uncomment and add delay between requests)
    # category_url = "https://techtitanlb.com/product-category/laptops/"
    # time.sleep(1)
    # more = scrape_homepage(category_url)
    # print(f"Category page: {len(more)} products.")


if __name__ == "__main__":
    main()
