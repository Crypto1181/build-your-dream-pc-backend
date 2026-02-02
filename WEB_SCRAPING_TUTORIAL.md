# How to Web Scrape Tech Titan (techtitanlb.com)

This guide teaches you how to scrape your own store [Tech Titan](https://techtitanlb.com/) safely and legally.

---

## 1. What is web scraping?

**Web scraping** means programmatically downloading a webpage and extracting specific data (product names, prices, links, etc.) instead of copying it by hand.

- **Your own site**: Scraping your own site for data backup, price monitoring, or feeding another app (like Build Your Dream PC) is fine.
- **Be respectful**: Don’t hammer the server (use delays, limit concurrency). Respect `robots.txt` if you add rules later.

---

## 2. Two ways to scrape

| Method | Best for | Tools |
|--------|-----------|--------|
| **Static HTML** | Pages that show content in the initial HTML (like your WooCommerce product lists) | Python: `requests` + `BeautifulSoup`. Node: `axios` + `cheerio` |
| **JavaScript-rendered** | Pages that load content only after JS runs | Python: `Playwright` or `Selenium`. Node: `Puppeteer` or `Playwright` |

Your Tech Titan site serves product HTML in the initial response, so **static scraping** (requests + BeautifulSoup) is enough for product lists and prices.

---

## 3. Finding what to scrape (DevTools)

Before writing code, you need to know **which HTML elements** contain the data.

1. Open [https://techtitanlb.com/](https://techtitanlb.com/) in Chrome or Edge.
2. Right‑click a product (e.g. product title or price) → **Inspect**.
3. In the **Elements** panel you’ll see the HTML (e.g. `<div class="product">`, `<a class="woocommerce-LoopProduct-link">`, `<span class="price">`).
4. Note:
   - **Tags**: `div`, `a`, `span`, `h3`, etc.
   - **Classes**: `product`, `price`, `woocommerce-loop-product__title`, etc.
   - **Structure**: e.g. “each product is inside `li.product`”.

WooCommerce often uses:

- **Product container**: `li.product` or `.product`
- **Title**: `.woocommerce-loop-product__title` or `h2`/`h3` inside the product
- **Price**: `.price` or `.amount`
- **Link**: `a.woocommerce-LoopProduct-link` or the first `a` in the product

Your exact classes may differ; use DevTools to confirm.

---

## 4. Python approach (recommended for learning)

### Setup

```bash
cd "c:\Users\Programmer\Documents\my flutter project\build-your-dream-pc-main\scripts\scrape-techtitan"
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### Run the example scraper

```bash
python scrape_techtitan.py
```

This script (see `scripts/scrape-techtitan/scrape_techtitan.py`):

1. Fetches the homepage with `requests`.
2. Parses HTML with `BeautifulSoup`.
3. Finds product blocks (e.g. `li.product` or fallback selectors).
4. Extracts title, price, and link for each product.
5. Prints the results and optionally saves JSON.

### Core idea (Python)

```python
import requests
from bs4 import BeautifulSoup

url = "https://techtitanlb.com/"
resp = requests.get(url)
soup = BeautifulSoup(resp.text, "html.parser")

# Example: find all product links (adjust selector to your HTML)
for link in soup.select("li.product a.woocommerce-LoopProduct-link"):
    title = link.get_text(strip=True)
    href = link.get("href", "")
    print(title, href)
```

You **must** adjust the selectors (e.g. `li.product`, `.price`) to match what you see in DevTools on your site.

---

## 5. Scraping multiple pages (categories / pagination)

- **Category pages**: e.g. `https://techtitanlb.com/product-category/laptops/`, `.../keyboards/`, etc. Use the same parsing logic as the homepage; only the URL changes.
- **Pagination**: If the category has “Next” or page 2, 3, etc.:
  - Find the “next” link or the URL pattern (e.g. `?paged=2`).
  - Loop over page numbers or next-link and run the same scraper for each URL.
- **Rate limiting**: Add `time.sleep(1)` (or similar) between requests so you don’t overload the server.

---

## 6. Saving and using the data

- **JSON**: Easy to feed into other apps (e.g. your Build Your Dream PC app or a small backend).
- **CSV**: Good for Excel or import into WooCommerce/other tools.
- **Database**: For large or recurring scrapes, insert into PostgreSQL/Supabase, etc.

The example script shows how to save to JSON; you can extend it to CSV or your DB.

---

## 7. If the site changes (selectors break)

When you redesign the site or WooCommerce updates templates:

- Selectors (e.g. `.price`, `li.product`) may change.
- Re-open DevTools, find the new classes/tags for “product”, “title”, “price”, “link”.
- Update the scraper’s selectors and test again.

Keeping selectors in one place (e.g. constants at the top of the script) makes this easier.

---

## 8. Optional: WooCommerce REST API

If your store has the [WooCommerce REST API](https://woocommerce.github.io/woocommerce-rest-api-docs/) enabled, you can get products as JSON instead of scraping HTML:

- **Pros**: Stable, no HTML parsing, official.
- **Cons**: Requires API keys and possibly enabling the API in WordPress/WooCommerce.

If you enable it, you can replace or complement scraping with API calls. The tutorial above still applies for pages that are not exposed by the API (e.g. custom landing content).

---

## Quick reference

| Task | Tool / step |
|------|-------------|
| Inspect HTML | Browser → Right‑click → Inspect |
| Fetch page | `requests.get(url)` (Python) or `fetch`/`axios` (Node) |
| Parse HTML | `BeautifulSoup(resp.text, "html.parser")` |
| Find elements | `soup.select(".price")`, `soup.find_all("li", class_="product")` |
| Get text | `element.get_text(strip=True)` |
| Get attribute | `element.get("href")` |
| Be nice to server | `time.sleep(1)` between requests |

Start with the script in `scripts/scrape-techtitan/scrape_techtitan.py`, run it, then change the selectors to match your live HTML. If you want to scrape categories or add CSV/API export, we can extend that script step by step.
