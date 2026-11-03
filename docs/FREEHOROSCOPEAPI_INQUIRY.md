# FreeHoroscopeAPI inquiry — draft, not sent

To: admin@freehoroscopeapi.com
Subject: Clarifying forecast freshness and usage rights for an authenticated web/PWA

Hello,

We're evaluating FreeHoroscopeAPI for Muse, a commercial authenticated web application and installable PWA. We need general daily, weekly and monthly readings for all twelve Western zodiac signs. Requests would be server-side and sign-only; no birth details or private user information would be sent. We would display “Powered by FreeHoroscopeAPI” with a link.

Your published terms allow commercial API/response use with attribution. Could you clarify:

1. When do daily, weekly and monthly readings refresh, in which timezone, and what period does each returned date represent? During November 2, 2026 testing all weekly signs returned October 26 and Cloudflare STALE headers; was this expected or stale? Daily labels mixed November 2 and 3.
2. How long may we cache each response server-side and share it across our authenticated users?
3. May a user explicitly save the complete reading privately, revisit it indefinitely, and include it in their personal JSON export? Are historical archives or offline PWA copies restricted, and what deletion obligations apply if we stop using the API?
4. Is this authenticated commercial web/PWA use covered? Are there publication, redistribution or paywall restrictions?
5. What attribution wording, link and placement are required? Does an in-app source credit or About page satisfy the terms?
6. What REST GET quotas, throttling and fair-use limits apply to shared server requests? Are retry/backoff instructions or availability/support commitments available?
7. Who supplies/authors the forecast text, and do you hold the rights needed to license its display and any permitted storage/redistribution to us? Is any content AI-generated?

Thank you for helping us evaluate this responsibly.

## Documentation check

Reviewed the official documentation and usage-terms section again on November 2, 2026. Commercial use and visible attribution are stated. The API documents current sign-only readings and no timezone/date selector; valid response dates do not guarantee freshness. The remaining questions above are not answered expressly. No new permission is inferred from silence. Existing actual-response evidence is retained without presenting it as approval or a longitudinal reliability test.

Sources: https://freehoroscopeapi.com/docs, https://freehoroscopeapi.com/#usage-terms, https://freehoroscopeapi.com/openapi.json.
