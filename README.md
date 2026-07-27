# ⚡ BigQuery Release Pulse

> A modern, real-time web application to track Google Cloud BigQuery release notes and instantly share updates via an integrated Twitter / X Tweet Studio.

![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat&logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-3.1-000000?style=flat&logo=flask&logoColor=white)
![Vanilla JS](https://img.shields.io/badge/Vanilla_JS-ES6+-F7DF1E?style=flat&logo=javascript&logoColor=black)
![License](https://img.shields.io/badge/License-MIT-blue.svg)

---

## 🌟 Key Features

* **📡 Live Feed Ingestion**: Direct integration with Google Cloud's official BigQuery release notes RSS/Atom feed (`https://docs.cloud.google.com/feeds/bigquery-release-notes.xml`).
* **🏷️ Smart Categorization**: Automatically categorizes release notes into distinct tags: **Feature**, **Change**, **Deprecated**, **Issue/Fix**, and **Announcement**.
* **🔄 Live Refresh with Spinner**: Header button with an animated SVG spinner to force-refresh the RSS feed on demand (`?refresh=true`).
* **🔍 Search & Category Filters**: Real-time client-side keyword search and tag pills with live result counts.
* **🐦 Twitter / X Tweet Studio**:
  * Customizable tweet templates (*⚡ Quick News*, *🚀 Launch Alert*, *💡 Tech Insight*, *🧵 Thread Hook*).
  * Circular SVG progress ring character tracker (280-character limit).
  * Quick-add hashtag chips (`#BigQuery`, `#GoogleCloud`, `#DataEngineering`).
  * Direct one-click launch to Twitter's web intent composer (`https://twitter.com/intent/tweet?text=...`).
* **📊 Batch Digest Creator**: Select multiple release notes via checkboxes to build a consolidated multi-update digest tweet.

---

## 🛠️ Technology Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Backend** | Python 3.11, Flask 3.1 | REST API provider & server-side routing |
| **Parser** | `feedparser`, `BeautifulSoup4`, `requests` | XML feed fetcher, HTML sanitizer, & category extractor |
| **Frontend** | Vanilla HTML5, CSS3, JavaScript (ES6+) | Single-page responsive dashboard & modal system |
| **Styling** | Glassmorphism Vanilla CSS | Custom dark theme with CSS variables and micro-animations |

---

## 🚀 Quick Start

### 1. Prerequisites
- Python 3.11 or higher installed on your system.

### 2. Installation & Setup

Clone the repository and set up a virtual environment:

```bash
# Clone the repository
git clone https://github.com/aamamun91/event-talks-app.git
cd event-talks-app

# Create a virtual environment
python -m venv .venv

# Activate the virtual environment
# Windows (PowerShell):
.\.venv\Scripts\Activate.ps1
# Linux / macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Running the Server

Start the Flask application:

```bash
python app.py
```

Open your browser and navigate to **`http://127.0.0.1:5000`**.

---

## 📁 Project Structure

```
├── app.py              # Flask server, RSS feed fetcher, & REST API
├── requirements.txt    # Python dependencies
├── .gitignore          # Environment & temporary file exclusions
├── templates/
│   └── index.html      # Dashboard template & Tweet Studio modal
└── static/
    ├── css/
    │   └── style.css   # Dark glassmorphism stylesheet & animations
    └── js/
        └── app.js      # Client-side API fetch, filtering, & Twitter composer
```

---

## ⚙️ REST API Reference

### `GET /api/release-notes`

Fetches structured release notes array.

#### Query Parameters:
- `refresh` *(optional, boolean)*: Set to `true` to force-refresh Google's RSS feed bypassing the 5-minute in-memory cache.

#### Sample Response:
```json
{
  "status": "success",
  "cached": false,
  "last_updated": "2026-07-27 15:45:00",
  "count": 58,
  "notes": [
    {
      "id": "note-0",
      "date_title": "July 23, 2026",
      "category": "Change",
      "link": "https://docs.cloud.google.com/bigquery/docs/release-notes#July_23_2026",
      "content_html": "<p>An updated version of the Simba ODBC driver for BigQuery is now available.</p>",
      "plain_text": "An updated version of the Simba ODBC driver for BigQuery is now available.",
      "tweet_draft": "⚡ BigQuery Change (July 23, 2026):\nAn updated version of the Simba ODBC driver... \n\n🔗 https://docs.cloud.google.com/bigquery/docs/release-notes#July_23_2026\n#BigQuery #GoogleCloud"
    }
  ]
}
```

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
