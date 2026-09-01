import importlib.util
import unittest
from pathlib import Path

MODULE_PATH = Path(__file__).with_name("index.py")
SPEC = importlib.util.spec_from_file_location("reddit_scraper", MODULE_PATH)
reddit_scraper = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(reddit_scraper)


def feed(entries: str) -> bytes:
    return (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<feed xmlns="http://www.w3.org/2005/Atom">'
        f"{entries}</feed>"
    ).encode()


def entry(post_id: str, title: str, content: str = "") -> str:
    return f"""
      <entry>
        <id>t3_{post_id}</id>
        <title>{title}</title>
        <updated>2026-08-26T12:00:00+00:00</updated>
        <link href="https://www.reddit.com/r/Frontend/comments/{post_id}/post/" />
        <content type="html"><![CDATA[
          <div class="md"><p>{content}</p></div>
        ]]></content>
      </entry>
    """


def listing_post(
    post_id: str,
    title: str,
    content: str = "",
    score: str = "12",
) -> str:
    return f"""
      <shreddit-post
        id="t3_{post_id}"
        post-title="{title}"
        score="{score}"
        created-timestamp="2026-08-26T12:00:00+00:00"
        permalink="/r/Frontend/comments/{post_id}/post/"
      >
        <div slot="text-body"><p>{content}</p></div>
      </shreddit-post>
    """


class ParseFeedTest(unittest.TestCase):
    def test_extracts_posts_without_persisting_usernames(self):
        payload = feed(
            entry("abcde1", "First topic", "Built by u/example_user")
            + entry("abcde2", "Second topic", "A practical write-up")
            + entry("abcde3", "Third topic", "Another useful discussion")
        )

        result = reddit_scraper.parse_feed(payload, "Frontend")

        self.assertEqual(result["source"], "Frontend")
        self.assertEqual(len(result["items"]), 3)
        self.assertIn("[reddit user]", result["items"][0]["body"])
        self.assertNotIn("example_user", result["items"][0]["body"])

    def test_requires_at_least_three_posts(self):
        payload = feed(entry("abcde1", "Only one", "Not enough data"))

        with self.assertRaisesRegex(ValueError, "REDDIT_FEED_INSUFFICIENT_ITEMS"):
            reddit_scraper.parse_feed(payload, "Frontend")

    def test_rejects_oversized_payloads(self):
        with self.assertRaisesRegex(ValueError, "REDDIT_FEED_SIZE_INVALID"):
            reddit_scraper.parse_feed(b"x" * 2_000_001, "Frontend")


class ParseListingTest(unittest.TestCase):
    def test_extracts_public_posts_and_redacts_usernames(self):
        payload = (
            listing_post("abcde1", "First topic", "Built by u/example_user", "101")
            + listing_post("abcde2", "Second topic", "A practical write-up", "23")
            + listing_post("abcde3", "Third topic", "Another discussion", "7")
        ).encode()

        result = reddit_scraper.parse_listing(payload, "Frontend")

        self.assertEqual(result["source"], "Frontend")
        self.assertEqual(result["availableItemCount"], 3)
        self.assertEqual(result["items"][0]["id"], "abcde1")
        self.assertEqual(result["items"][0]["score"], 101)
        self.assertIn("[reddit user]", result["items"][0]["body"])
        self.assertNotIn("example_user", result["items"][0]["body"])

    def test_requires_at_least_three_public_posts(self):
        payload = listing_post("abcde1", "Only one", "Not enough data").encode()

        with self.assertRaisesRegex(ValueError, "REDDIT_LISTING_INSUFFICIENT_ITEMS"):
            reddit_scraper.parse_listing(payload, "Frontend")


if __name__ == "__main__":
    unittest.main()
