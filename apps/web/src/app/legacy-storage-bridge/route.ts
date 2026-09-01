import {
  LEGACY_STORAGE_MESSAGE_TYPE,
  LEGACY_STORAGE_PREFIX,
  SITE_ORIGIN,
} from "@/lib/site";

const bridgeHtml = `<!doctype html>
<html lang="ko">
  <head><meta charset="utf-8"><title>Sentence 학습 데이터 이동</title></head>
  <body>
    <script>
      (() => {
        const entries = [];
        try {
          for (let index = 0; index < localStorage.length; index += 1) {
            const key = localStorage.key(index);
            if (!key || !key.startsWith(${JSON.stringify(LEGACY_STORAGE_PREFIX)})) continue;
            const value = localStorage.getItem(key);
            if (value !== null) entries.push([key, value]);
          }
        } catch {}
        window.parent.postMessage(
          { type: ${JSON.stringify(LEGACY_STORAGE_MESSAGE_TYPE)}, entries },
          ${JSON.stringify(SITE_ORIGIN)},
        );
      })();
    </script>
  </body>
</html>`;

export function GET() {
  return new Response(bridgeHtml, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Security-Policy": `default-src 'none'; script-src 'unsafe-inline'; frame-ancestors ${SITE_ORIGIN}`,
      "Content-Type": "text/html; charset=utf-8",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
