import os
import re
import time
from datetime import datetime
import requests
import feedparser
from bs4 import BeautifulSoup
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache
cache = {
    "data": None,
    "last_fetched": 0,
    "ttl": 300 # 5 minutes default cache
}

def clean_html_content(html_str):
    """Clean and sanitize HTML string, ensuring links are target='_blank'."""
    if not html_str:
        return ""
    soup = BeautifulSoup(html_str, "html.parser")
    
    # Update links to open in new tab and handle relative URLs if any
    for a in soup.find_all("a", href=True):
        a["target"] = "_blank"
        a["rel"] = "noopener noreferrer"
        if a["href"].startswith("/"):
            a["href"] = f"https://docs.cloud.google.com{a['href']}"
            
    return str(soup)

def extract_plain_text(html_str):
    """Extract clean plain text from HTML snippet."""
    if not html_str:
        return ""
    soup = BeautifulSoup(html_str, "html.parser")
    text = soup.get_text(separator=" ", strip=True)
    # Clean up multiple spaces
    text = re.sub(r'\s+', ' ', text)
    return text

def parse_release_notes():
    """Fetch XML feed and parse into structured release notes list."""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/xml, application/atom+xml, text/xml"
    }
    
    response = requests.get(FEED_URL, headers=headers, timeout=10)
    response.raise_for_status()
    
    parsed = feedparser.parse(response.text)
    
    items = []
    item_counter = 0
    
    for entry in parsed.entries:
        date_title = entry.get("title", "Release Note")
        entry_link = entry.get("link", "https://docs.cloud.google.com/bigquery/docs/release-notes")
        updated_raw = entry.get("updated", "")
        summary_html = entry.get("summary", "") or entry.get("content", [{}])[0].get("value", "")
        
        soup = BeautifulSoup(summary_html, "html.parser")
        
        # Look for category headers like <h3>Feature</h3>, <h3>Change</h3>, etc.
        headers_found = soup.find_all(["h3", "h4"])
        
        if headers_found:
            for idx, h_tag in enumerate(headers_found):
                category = h_tag.get_text(strip=True) or "General"
                
                # Gather content elements between this h_tag and the next h_tag
                content_elements = []
                curr = h_tag.next_sibling
                while curr and curr.name not in ["h3", "h4"]:
                    if getattr(curr, 'name', None) is not None or (isinstance(curr, str) and curr.strip()):
                        content_elements.append(str(curr))
                    curr = curr.next_sibling
                
                sub_html = "".join(content_elements).strip()
                if not sub_html:
                    # Fallback to paragraph right after if sibling parse was empty
                    next_p = h_tag.find_next("p")
                    if next_p:
                        sub_html = str(next_p)
                
                cleaned_html = clean_html_content(sub_html or summary_html)
                plain_txt = extract_plain_text(cleaned_html)
                
                item_id = f"note-{item_counter}"
                item_counter += 1
                
                # Generate tweet template text
                snippet = plain_txt[:160] + "..." if len(plain_txt) > 160 else plain_txt
                tweet_draft = f"⚡ BigQuery {category} ({date_title}):\n{snippet}\n\n🔗 {entry_link}\n#BigQuery #GoogleCloud #DataEngineering"
                
                items.append({
                    "id": item_id,
                    "date_title": date_title,
                    "updated_iso": updated_raw,
                    "link": entry_link,
                    "category": category,
                    "content_html": cleaned_html,
                    "plain_text": plain_txt,
                    "tweet_draft": tweet_draft
                })
        else:
            # Fallback if no <h3> tag present
            cleaned_html = clean_html_content(summary_html)
            plain_txt = extract_plain_text(cleaned_html)
            item_id = f"note-{item_counter}"
            item_counter += 1
            
            snippet = plain_txt[:160] + "..." if len(plain_txt) > 160 else plain_txt
            tweet_draft = f"⚡ BigQuery Release ({date_title}):\n{snippet}\n\n🔗 {entry_link}\n#BigQuery #GoogleCloud"
            
            items.append({
                "id": item_id,
                "date_title": date_title,
                "updated_iso": updated_raw,
                "link": entry_link,
                "category": "Update",
                "content_html": cleaned_html,
                "plain_text": plain_txt,
                "tweet_draft": tweet_draft
            })

    return items

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/release-notes")
def get_release_notes():
    force_refresh = request.args.get("refresh", "false").lower() == "true"
    now = time.time()
    
    if force_refresh or cache["data"] is None or (now - cache["last_fetched"]) > cache["ttl"]:
        try:
            notes = parse_release_notes()
            cache["data"] = notes
            cache["last_fetched"] = now
            return jsonify({
                "status": "success",
                "cached": False,
                "last_updated": datetime.fromtimestamp(now).strftime("%Y-%m-%d %H:%M:%S"),
                "count": len(notes),
                "notes": notes
            })
        except Exception as e:
            if cache["data"] is not None:
                return jsonify({
                    "status": "warning",
                    "message": f"Failed to fetch live feed ({str(e)}). Showing cached data.",
                    "cached": True,
                    "last_updated": datetime.fromtimestamp(cache["last_fetched"]).strftime("%Y-%m-%d %H:%M:%S"),
                    "count": len(cache["data"]),
                    "notes": cache["data"]
                })
            return jsonify({
                "status": "error",
                "message": f"Failed to fetch BigQuery release notes feed: {str(e)}"
            }), 500
    
    return jsonify({
        "status": "success",
        "cached": True,
        "last_updated": datetime.fromtimestamp(cache["last_fetched"]).strftime("%Y-%m-%d %H:%M:%S"),
        "count": len(cache["data"]),
        "notes": cache["data"]
    })

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"Starting BigQuery Release Notes Radar on http://127.0.0.1:{port}")
    app.run(host="127.0.0.1", port=port, debug=True)
