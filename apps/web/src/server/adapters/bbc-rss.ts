import "server-only";

import { createHash } from "node:crypto";

import { XMLParser } from "fast-xml-parser";

import type { RssCandidate } from "@/features/ingestion/types";
import { extractExcerpt, normalizeRssText } from "@/server/domain/text";

const DEFAULT_BBC_RSS_URL = "https://feeds.bbci.co.uk/news/rss.xml";

type ParsedRssItem = {
  title?: unknown;
  description?: unknown;
  link?: unknown;
  guid?: unknown;
  pubDate?: unknown;
};

function asString(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "#text" in value) {
    const text = (value as { "#text"?: unknown })["#text"];
    return typeof text === "string" ? text : "";
  }
  return "";
}

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function parseBbcRss(xml: string): RssCandidate[] {
  const parser = new XMLParser({ ignoreAttributes: false, trimValues: false });
  const document = parser.parse(xml) as {
    rss?: { channel?: { item?: ParsedRssItem | ParsedRssItem[] } };
  };
  const rawItems = document.rss?.channel?.item;
  const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];

  return items.flatMap((item) => {
    const canonicalUrl = asString(item.link).trim();
    const externalId = asString(item.guid).trim() || canonicalUrl;
    const englishTitle = normalizeRssText(asString(item.title));
    const englishExcerpt = extractExcerpt(asString(item.description));
    const publishedAt = new Date(asString(item.pubDate));

    if (
      !externalId ||
      !canonicalUrl.startsWith("https://www.bbc.") ||
      !englishTitle ||
      !englishExcerpt ||
      Number.isNaN(publishedAt.valueOf())
    ) {
      return [];
    }

    return [
      {
        externalId,
        canonicalUrl,
        englishTitle,
        englishExcerpt,
        publishedAt,
        sourceHash: hash(`${englishTitle}\n${englishExcerpt}`),
      },
    ];
  });
}

export async function fetchBbcRss(
  url = DEFAULT_BBC_RSS_URL,
): Promise<RssCandidate[]> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/rss+xml, application/xml;q=0.9",
      "User-Agent": "NewsOrder/0.1 non-commercial education RSS reader",
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) throw new Error(`BBC_RSS_HTTP_${response.status}`);
  return parseBbcRss(await response.text());
}
