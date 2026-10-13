# Daypond local page draft

Approved base: https://saberzou.ai/daypond/ ; approved support: saberzou@gmail.com. NOT published or verified live. Source app privacy links: local Daypond commit c77499a.

Generated static routes: /daypond/, /daypond/support/, /daypond/privacy/ plus equivalent /zh-hans/, /ja/ and /es/ routes. All use current site conventions, approved koi-only icon, four-language content, draft notice and noindex. No Finwords or homepage files change.

Edit content.json, then run `python3 scripts/build-daypond.py` and `python3 scripts/check-daypond.py` at the site root. Do not modify generated HTML as the source of truth. Local preview: `python3 -m http.server 8767 --bind 127.0.0.1`.

Validation: twelve static pages/link checks pass; original Finwords checker passes and all twelve Finwords files remain byte-identical. Existing Playwright with installed Chrome passed twenty-four desktop/mobile checks, FAQ expansion, language/page navigation, mailto contact and no console errors/overflow. Browser plugin unavailable. Screenshots and temporary QA script remain outside the repository under /tmp.

Before later approved publication: settle policy/support retention wording, verify hosting data behavior, remove explicit draft wording/noindex as appropriate, verify any store link/version/price instead of guessing, and anonymously check HTTPS routes in every language. Preserve CSP against host-injected analytics scripts. Publishing authorization is still absent. App media commercial rights remain unresolved.
