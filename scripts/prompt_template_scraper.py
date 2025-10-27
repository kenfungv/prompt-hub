import os
import json
import time
import random
import pathlib
from typing import List, Dict
import requests
from bs4 import BeautifulSoup

# Sources to crawl: simple public pages listing prompts by industry
SOURCES = [
    {
        "name": "awesome-chatgpt-prompts",
        "url": "https://raw.githubusercontent.com/f/awesome-chatgpt-prompts/main/prompts.csv",
        "type": "csv"
    },
    {
        "name": "learnprompting-industry",
        "url": "https://learnprompting.org/docs/category/industry",
        "type": "html_index"
    }
]

TARGET_INDUSTRIES = ["sales", "customer service", "marketing", "engineering", "technology", "medical", "healthcare", "support"]

OUTPUT_DIR = pathlib.Path("data/prompts")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_JSON = OUTPUT_DIR / "industry_prompts.json"

HEADERS = {
    "User-Agent": "PromptHubCrawler/1.0 (+https://github.com/kenfungv/prompt-hub)"
}


def normalize_industry(text: str) -> str:
    t = text.lower()
    if any(k in t for k in ["sales"]):
        return "sales"
    if any(k in t for k in ["customer", "support", "service", "cs"]):
        return "customer_service"
    if any(k in t for k in ["marketing", "growth", "seo", "ads"]):
        return "marketing"
    if any(k in t for k in ["engineering", "developer", "dev", "software", "tech", "technology"]):
        return "technology"
    if any(k in t for k in ["medical", "health", "healthcare", "clinical", "doctor"]):
        return "medical"
    return "general"


def fetch(url: str) -> str:
    resp = requests.get(url, headers=HEADERS, timeout=20)
    resp.raise_for_status()
    return resp.text


def parse_csv_prompts(csv_text: str) -> List[Dict]:
    import csv
    out = []
    for row in csv.DictReader(csv_text.splitlines()):
        act = row.get("act", "")
        prompt = row.get("prompt", "")
        if not prompt:
            continue
        industry = normalize_industry(act)
        out.append({
            "title": act.strip() or "Untitled",
            "prompt": prompt.strip(),
            "industry": industry,
            "source": "awesome-chatgpt-prompts"
        })
    return out


def parse_learnprompting_index(html: str) -> List[str]:
    soup = BeautifulSoup(html, "html.parser")
    links = []
    for a in soup.select("a[href]"):
        href = a.get("href", "")
        text = (a.get_text() or "").strip().lower()
        if any(k in text for k in TARGET_INDUSTRIES):
            if href.startswith("http"):
                links.append(href)
            else:
                links.append("https://learnprompting.org" + href)
    return list(dict.fromkeys(links))


def extract_prompts_from_page(html: str, source_name: str) -> List[Dict]:
    soup = BeautifulSoup(html, "html.parser")
    items = []
    # Heuristics: code blocks, list items, paragraphs with colon
    for pre in soup.select("pre, code"):
        text = pre.get_text("\n").strip()
        if len(text) > 40 and len(text.split()) > 6:
            items.append(text)
    for li in soup.select("li"):
        text = li.get_text(" ").strip()
        if 40 < len(text) < 800 and any(w in text.lower() for w in ["you are", "as a", "write", "generate", "act as", "prompt"]):
            items.append(text)
    for p in soup.select("p"):
        txt = p.get_text(" ").strip()
        if 60 < len(txt) < 1200 and any(w in txt.lower() for w in ["you are", "as a", "write", "generate", "act as", "prompt"]):
            items.append(txt)
    results = []
    for t in items:
        title = (t.split("\n")[0][:60] if t else "Prompt").strip() or "Prompt"
        results.append({
            "title": title,
            "prompt": t,
            "industry": normalize_industry(soup.get_text(" ")),
            "source": source_name
        })
    return results


def crawl() -> Dict[str, List[Dict]]:
    all_prompts: List[Dict] = []
    # CSV source
    try:
        csv_text = fetch(SOURCES[0]["url"])
        all_prompts.extend(parse_csv_prompts(csv_text))
    except Exception as e:
        print("CSV source failed:", e)
    # LearnPrompting index
    try:
        index_html = fetch(SOURCES[1]["url"])
        links = parse_learnprompting_index(index_html)[:25]
        for href in links:
            time.sleep(random.uniform(0.4, 1.2))
            try:
                page = fetch(href)
                all_prompts.extend(extract_prompts_from_page(page, "learnprompting"))
            except Exception as ee:
                print("Page fetch failed:", href, ee)
    except Exception as e:
        print("Index source failed:", e)

    # Deduplicate by (prompt, industry)
    seen = set()
    deduped = []
    for it in all_prompts:
        key = (it["prompt"].strip(), it["industry"])
        if key in seen:
            continue
        seen.add(key)
        deduped.append(it)

    # Group by industry
    grouped: Dict[str, List[Dict]] = {}
    for it in deduped:
        grouped.setdefault(it["industry"], []).append(it)

    return grouped


def save_json(data: Dict[str, List[Dict]]):
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    data = crawl()
    save_json(data)
    print(f"Saved {sum(len(v) for v in data.values())} prompts to {OUTPUT_JSON}")
