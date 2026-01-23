import time
from urllib.parse import urljoin

import pandas as pd
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright


URLS = [
    "https://www.heartpage.jp/sagamihara/list?type=in_home&city=14153",
    "https://www.heartpage.jp/sagamihara/list?type=in_home&city=14153&page=2#facility_list_top",
    "https://www.heartpage.jp/sagamihara/list?type=in_home&city=14153&page=3#facility_list_top",
    "https://www.heartpage.jp/sagamihara/list?type=in_home&city=14153&page=4#facility_list_top",
    "https://www.heartpage.jp/sagamihara/list?type=in_home&city=14153&page=5#facility_list_top",
]

OUTPUT_CSV = "heartpage_sagamihara_in_home.csv"
SLEEP_SEC = 1.0


def clean(text: str) -> str:
    if not text:
        return ""
    return " ".join(text.split()).strip()


def fetch_html_by_playwright(url: str) -> str:
    """403対策：ブラウザとしてアクセスしてHTML取得"""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            locale="ja-JP",
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
        )
        page = context.new_page()
        page.goto(url, wait_until="domcontentloaded", timeout=60000)
        page.wait_for_timeout(1200)  # 描画待ち
        html = page.content()
        context.close()
        browser.close()
        return html


def get_table_value(store_div: BeautifulSoup, key: str) -> str:
    """
    table内の th が key（例：法人名）と一致する行の td を抜く
    """
    rows = store_div.select("table tr")
    for tr in rows:
        th = tr.find("th")
        if not th:
            continue

        th_text = clean(th.get_text())
        if th_text != key:
            continue

        # その行のtdを探す（colspanありなので最初のtdを取る）
        td = tr.find("td")
        if not td:
            return ""

        # 「施設・サービス」は td の中に a が入ってるので、テキストでOK
        return clean(td.get_text(" ", strip=True))

    return ""


def parse_list_page(html: str, base_url: str):
    soup = BeautifulSoup(html, "lxml")

    stores = soup.select("div.store.item")
    results = []

    for store in stores:
        corp_name = get_table_value(store, "法人名")
        service = get_table_value(store, "施設・サービス")
        address = get_table_value(store, "所在地")
        phone = get_table_value(store, "電話番号")

        # 「事業所情報を見る」リンク
        detail_a = store.select_one("div.detail a.btn.white-allow")
        detail_url = ""
        if detail_a and detail_a.get("href"):
            detail_url = urljoin(base_url, detail_a["href"])

        results.append(
            {
                "法人名": corp_name,
                "施設・サービス": service,
                "所在地": address,
                "電話番号": phone,
                "事業所情報を見るURL": detail_url,
            }
        )

    return results


def main():
    all_rows = []

    for i, url in enumerate(URLS, start=1):
        print(f"[{i}/{len(URLS)}] Fetching: {url}")
        html = fetch_html_by_playwright(url)
        rows = parse_list_page(html, base_url=url)
        print(f"  -> {len(rows)} rows")
        all_rows.extend(rows)
        time.sleep(SLEEP_SEC)

    df = pd.DataFrame(all_rows)

    # 事業所URLで重複排除
    if "事業所情報を見るURL" in df.columns:
        df = df.drop_duplicates(subset=["事業所情報を見るURL"], keep="first")

    df.to_csv(OUTPUT_CSV, index=False, encoding="utf-8-sig")
    print(f"\nSaved: {OUTPUT_CSV} ({len(df)} rows)")


if __name__ == "__main__":
    main()
