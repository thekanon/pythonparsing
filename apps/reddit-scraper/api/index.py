import hmac
import json
import os
import re
import time
import xml.etree.ElementTree as ET
from datetime import datetime
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import parse_qs, urlparse

from scrapling.fetchers import StealthyFetcher
from scrapling.parser import Selector

COMMUNITIES = {
    "frontend": "Frontend",
    "sideproject": "SideProject",
    "chatgpt": "ChatGPT",
    "obsidianmd": "ObsidianMD",
}
ATOM_NAMESPACE = {"atom": "http://www.w3.org/2005/Atom"}
MAX_RESPONSE_BYTES = 2_000_000
MAX_ITEMS = 10
MAX_ITEM_CHARACTERS = 1_200
USERNAME_PATTERN = re.compile(r"(?<![\w/])/?u/[A-Za-z0-9_-]{3,20}", re.IGNORECASE)
POST_ID_PATTERN = re.compile(r"/comments/([a-z0-9]{5,16})(?:/|$)", re.IGNORECASE)
FULLNAME_PATTERN = re.compile(r"^t3_([a-z0-9]{5,16})$", re.IGNORECASE)


def _normalized_text(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def _without_usernames(value: str) -> str:
    return USERNAME_PATTERN.sub("[reddit user]", value)


def _entry_body(entry: ET.Element, title: str) -> str:
    content = entry.findtext("atom:content", default="", namespaces=ATOM_NAMESPACE)
    self_text = ""
    if content:
        document = Selector(content)
        markdown = document.css(".md")
        if markdown:
            self_text = str(markdown[0].get_all_text(separator=" ", strip=True))
    combined = title if not self_text else f"{title}. {self_text}"
    return _without_usernames(_normalized_text(combined))[:MAX_ITEM_CHARACTERS]


def _timestamp(value: str) -> float:
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()
    except (TypeError, ValueError):
        return time.time()


def parse_feed(payload: bytes, source: str) -> dict:
    if not payload or len(payload) > MAX_RESPONSE_BYTES:
        raise ValueError("REDDIT_FEED_SIZE_INVALID")

    root = ET.fromstring(payload)
    items = []
    entries = root.findall("atom:entry", ATOM_NAMESPACE)
    for rank, entry in enumerate(entries[:MAX_ITEMS]):
        title = _normalized_text(
            entry.findtext("atom:title", default="", namespaces=ATOM_NAMESPACE)
        )
        link_element = entry.find("atom:link", ATOM_NAMESPACE)
        link = link_element.attrib.get("href", "") if link_element is not None else ""
        post_id_match = POST_ID_PATTERN.search(link)
        if not title or not post_id_match:
            continue
        updated = entry.findtext("atom:updated", default="", namespaces=ATOM_NAMESPACE)
        items.append(
            {
                "id": post_id_match.group(1).lower(),
                "body": _entry_body(entry, title),
                "score": MAX_ITEMS - rank,
                "createdUtc": _timestamp(updated),
            }
        )

    if len(items) < 3:
        raise ValueError("REDDIT_FEED_INSUFFICIENT_ITEMS")

    return {
        "source": source,
        "canonicalUrl": f"https://www.reddit.com/r/{source}/",
        "title": f"r/{source} 오늘의 주요 게시물",
        "availableItemCount": len(entries),
        "items": items,
    }


def _attribute(node, name: str) -> str:
    return str(node.attrib.get(name, "")).strip()


def _post_body(post, title: str) -> str:
    text_nodes = post.css('[slot="text-body"]')
    self_text = ""
    if text_nodes:
        self_text = str(text_nodes[0].get_all_text(separator=" ", strip=True))
    combined = title if not self_text else f"{title}. {self_text}"
    return _without_usernames(_normalized_text(combined))[:MAX_ITEM_CHARACTERS]


def _post_id(post) -> str:
    fullname_match = FULLNAME_PATTERN.match(_attribute(post, "id"))
    if fullname_match:
        return fullname_match.group(1).lower()
    permalink_match = POST_ID_PATTERN.search(_attribute(post, "permalink"))
    return permalink_match.group(1).lower() if permalink_match else ""


def _post_score(post, fallback: int) -> int:
    raw_score = _attribute(post, "score").replace(",", "")
    try:
        return max(0, int(raw_score))
    except ValueError:
        return fallback


def parse_listing(payload: bytes, source: str) -> dict:
    if not payload or len(payload) > MAX_RESPONSE_BYTES:
        raise ValueError("REDDIT_LISTING_SIZE_INVALID")

    document = Selector(payload)
    posts = document.css("shreddit-post")
    items = []
    for rank, post in enumerate(posts):
        if len(items) >= MAX_ITEMS:
            break
        post_id = _post_id(post)
        title = _normalized_text(_attribute(post, "post-title"))
        if not post_id or not title:
            continue
        created = _attribute(post, "created-timestamp")
        items.append(
            {
                "id": post_id,
                "body": _post_body(post, title),
                "score": _post_score(post, MAX_ITEMS - rank),
                "createdUtc": _timestamp(created),
            }
        )

    if len(items) < 3:
        raise ValueError("REDDIT_LISTING_INSUFFICIENT_ITEMS")

    return {
        "source": source,
        "canonicalUrl": f"https://www.reddit.com/r/{source}/",
        "title": f"r/{source} 오늘의 주요 게시물",
        "availableItemCount": len(posts),
        "items": items,
    }


def fetch_feed(source: str) -> dict:
    url = f"https://www.reddit.com/r/{source}/hot/"
    try:
        page = StealthyFetcher.fetch(
            url,
            headless=True,
            disable_resources=True,
            network_idle=False,
            wait_selector="shreddit-post[post-title]",
            wait_selector_state="attached",
            google_search=False,
            block_ads=True,
            locale="en-US",
            timeout=25_000,
            wait=2_000,
            retries=1,
        )
    except Exception as error:
        raise RuntimeError("REDDIT_FETCH_BROWSER") from error
    if page.status != 200:
        raise RuntimeError(f"REDDIT_FETCH_{page.status}")
    return parse_listing(page.body, source)


class handler(BaseHTTPRequestHandler):
    def _send_json(self, status: int, payload: dict) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        expected_secret = os.environ.get("CRON_SECRET", "")
        supplied = self.headers.get("Authorization", "")
        expected = f"Bearer {expected_secret}"
        if not expected_secret or not hmac.compare_digest(supplied, expected):
            self._send_json(401, {"error": "UNAUTHORIZED"})
            return

        query = parse_qs(urlparse(self.path).query)
        requested = query.get("subreddit", [""])[0].strip().lower()
        source = COMMUNITIES.get(requested)
        if source is None:
            self._send_json(404, {"error": "REDDIT_SOURCE_NOT_ALLOWED"})
            return

        try:
            self._send_json(200, fetch_feed(source))
        except (ET.ParseError, ValueError) as error:
            self._send_json(502, {"error": str(error)})
        except RuntimeError as error:
            self._send_json(502, {"error": str(error)})


def serve() -> None:
    port = int(os.environ.get("REDDIT_SCRAPER_PORT", "3400"))
    server = HTTPServer(("127.0.0.1", port), handler)
    print(f"Reddit scraper listening on http://127.0.0.1:{port}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    serve()
