# Web Application Reverse Engineering with REA

**Project type:** Client-side JavaScript reverse engineering and browser reconnaissance  
**Date:** October 25, 2026  
**Tools:** [REA (Reverse Engineer Anything)](https://github.com/morluto/rea), PowerShell, Node.js/npm, Chromium/Chrome DevTools Protocol (CDP), JSON  
**Targets:** REA's Notes demonstration page; a public English Wikipedia article (*Zero Time Dilemma*); YouTube's web video player and mid-roll advertising-related JavaScript  
**Status:** Static analyses and AI-assisted player source investigation documented. Live end-to-end ad interruption and server-side ad selection remain unverified.

## Objective

Learn a repeatable method for observing a browser application and inspecting delivered JavaScript without access to the application's original development project. The focus was **understanding code structure and observable behavior**, not penetration testing or identifying a vulnerability.

## What I did

1. Installed Node.js and launched the REA package from Windows using `npx.cmd`. PowerShell's script execution policy blocked `npx.ps1`, so I used the Windows command wrapper instead of weakening the system policy.
2. Started a separate Chrome browser profile with CDP debugging bound to the local machine on port 9222.
3. Used REA's `list-browser-targets` to verify connectivity, enumerate page targets, and identify the intended article by its exact origin.
4. Practiced REA's static JavaScript analysis workflow against its Notes demonstration application.
5. Performed `analyze-web-bundle` against the Wikipedia article and reviewed the returned JavaScript evidence, source locations, static route/endpoint candidates, and analysis limitations.
6. Interpreted configuration and browser-storage references as *code evidence*, rather than falsely claiming they were confirmed network calls or security vulnerabilities.

## Selected evidence

| Target / observation | Recorded result | Interpretation |
|---|---:|---|
| REA Notes demonstration | 3 parsed scripts; 1,101 AST nodes; 0 parse failures | Successful small-scale static JavaScript parsing |
| Wikipedia article | 7 parsed scripts | JavaScript source artifacts analyzed |
| Wikipedia article | 177,115 AST nodes visited | Scale of AST traversal during analysis |
| Wikipedia article | 0 parse failures | No parser failures in the recorded analysis |
| Wikipedia article | `completeness.status = "partial"` | The static analysis explicitly reports limited inference coverage |

### Notable Wikipedia code references

- `mw.config.get` — MediaWiki configuration reads.
- `mw.cookie.get` — cookie-access calls present in captured JavaScript.
- `mw.user.options.get` — user preference retrieval.
- `router.addRoute` — route-registration call identified by REA.
- `wgVisualEditorConfig` — a configuration key associated with the editor.
- `wgPopupsRestGatewayEndpoint` — a REST gateway-related configuration key.
- `ve-docstate` and `ve-dochtml` — session-storage-related editor state keys in static references.

REA classified many of these strings as **low-confidence endpoint candidates**. That label does **not** make them HTTP endpoints. Most examples above are configuration keys, cookie names, or storage keys, and the reported detector often described an `unverified-network-receiver`.

## YouTube player and mid-roll advertising investigation

[**Read the YouTube mid-roll case study**](youtube-midroll-ad-insertion.md)

Extended this work to the YouTube web player using REA, Chrome DevTools and Codex. The investigation traced a Play/Pause listener and advertising-related JavaScript, then reported **34 checked source anchors** concerning timed cue ranges, ad request/prefetch opportunities, conventional ad layouts, slot exits and conditional restoration of content. The mid-roll investigation is summarized from a local Codex report; the original full report and all source anchors have not been uploaded to this repository.

The key engineering distinction is that **an ad slot, a request for an ad, and an actual interruption are three different events**. The player-source code can show how an interruption is prepared and ended, but it cannot reveal Google's private ad-selection algorithm or prove a specific ad played without a correlated runtime capture.

## Reproduction outline (Windows)

Prerequisites: a compatible Node.js/npm installation; Chrome or another Chrome-family browser; permission to inspect the chosen page. Use an isolated profile, do not sign in with personal accounts, and keep CDP on loopback.

From PowerShell, start a separate Chrome instance (adjust the path if Chrome is installed elsewhere):

```powershell
$chrome = "$env:ProgramFiles\Google\Chrome\Application\chrome.exe"
$profile = Join-Path $env:TEMP "rea-research-profile"
Start-Process -FilePath $chrome -ArgumentList @(
  "--remote-debugging-address=127.0.0.1",
  "--remote-debugging-port=9222",
  "--user-data-dir=`"$profile`"",
  "https://en.wikipedia.org/wiki/Zero_Time_Dilemma"
)
```

In a second terminal, confirm the tab:

```powershell
npx.cmd -y rea-agents@latest list-browser-targets http://127.0.0.1:9222 --allowed-origins https://en.wikipedia.org --json
```

Copy the **current** `target_id` from the result and set it in PowerShell:

```powershell
$targetId = "REPLACE_WITH_CURRENT_TARGET_ID"

# Passive page inspection
npx.cmd -y rea-agents@latest inspect-web-page http://127.0.0.1:9222 $targetId --observation-ms 1000 --json

# Static JavaScript analysis
npx.cmd -y rea-agents@latest analyze-web-bundle http://127.0.0.1:9222 $targetId --json
```

Target IDs are browser-instance-specific, not constants. Close the isolated browser after testing to shut down the debugging endpoint.

## Interpretation and limitations

- **Static analysis is not dynamic proof.** Parsed code can indicate possible routes, configurations, and operations, but it does not establish which functions ran during an interaction.
- **No confirmed vulnerability or compromise.** This was reconnaissance and reverse-engineering practice, not an exploitation exercise.
- **No donation-banner root cause confirmed.** The code responsible for Wikipedia's "Maybe later" banner dismissal was not traced to a specific event handler or verified storage/network side effect in the retained evidence.
- **No server-side source access.** Observing browser-delivered JavaScript does not disclose Wikipedia's backend implementation.
- **Partial coverage matters.** REA's own output warns that local returned-reference projections were conservatively widened and that source-local candidates may be overinclusive.
- **Not game reverse engineering.** The Wikipedia article discussed *Zero Time Dilemma*, but the game binary itself was not examined.

## Next validation steps

1. Capture network activity during a chosen UI action with `inspect-web-page` and a user-triggered observation window.
2. Use Chrome DevTools event-listener breakpoints to identify the actual JavaScript callback and call stack.
3. Compare page state before and after the action to distinguish DOM updates, storage changes, and network requests.
4. Implement a small independent demonstration of the confirmed behavior and document the evidence.

## Responsible publication

Only a sanitized methodology and selected tool findings are described here. No browser session tokens, cookies, raw authenticated HAR captures, private profile contents, or access credentials are included.

**Reference:** [REA browser observation documentation](https://github.com/morluto/rea/blob/main/docs/browser-observation.md) · [REA project](https://github.com/morluto/rea)
