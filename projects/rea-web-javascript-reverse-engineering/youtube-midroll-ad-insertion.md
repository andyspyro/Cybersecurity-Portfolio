# YouTube Mid-Roll Advertisement Insertion — REA Case Study

**Date:** October 25, 2026  
**Type:** Browser-based reverse engineering / static JavaScript analysis  
**Tools:** REA (Reverse Engineer Anything), Codex, Chrome DevTools Protocol (CDP), JavaScript, PowerShell  
**Status:** Completed bounded *source-analysis* investigation. Live mid-roll execution and server-side ad-selection decisions remain unverified.

## Research question

**How can YouTube interrupt an existing video, show a mid-roll advertisement, and then restore the video at the correct playback position?** This case study focuses on the client-side player logic, not on bypassing advertisements or accessing YouTube's private backend.

This is a sanitized reconstruction of findings shared from the local Codex/REA report named `youtube-midroll-report.md`. The complete local report and all of its 34 reported source anchors were **not** provided to this repository, so the document below does not claim to reproduce or independently validate all 34 coordinates.

## Documented product behavior (separate from reverse-engineering evidence)

According to [YouTube's official mid-roll guide](https://support.google.com/youtube/answer/6175006?hl=en), monetized videos of at least 8 minutes may enable mid-roll ads. Creators can place manual ad *opportunities* or use automatically placed slots, but YouTube determines which opportunities actually receive an ad.

The crucial separation is: **an available ad slot is not the same thing as an ad request, and an ad request is not the same thing as an actual interruption.**

## Working client-side model

~~~mermaid
flowchart TD
  A[Potential ad-break slots] --> B[Player tracks playback-time cues]
  B --> C[Candidate ad request or prefetch]
  C --> D{Ad available / selected?}
  D -->|No| E[Continue content]
  D -->|Yes| F[Enter ad presentation layout]
  F --> G[Ad or ad pod exits]
  G --> H[Restore retained content]
  H --> I[Conditionally resume playback]
~~~

**Evidence level:** This is a simplified conceptual synthesis, **not** an execution trace observed end-to-end in the browser. Real player versions, live streams, and server-stitched variants can use distinct paths.

## Findings from the AI-assisted source investigation

| Component | What the reported source analysis supports | What it does not establish |
|---|---|---|
| Timed ad opportunities | Player code contains cue-range handling that can lead to slot fulfillment, subject to entry guards | Which break was eligible for the observed viewer |
| Ad request and prefetch | Code can start fetching before playback is interrupted | That a particular ad was fetched or selected in the capture |
| Ad presentation | A conventional ad layout uses player type 2 while retaining the content playback object | That all YouTube ad formats use this arrangement |
| Ad-state transitions | The source contains callbacks and indicators associated with entering and exiting ad presentation | A recorded end-to-end runtime event sequence |
| Content restoration | A VOD exit adapter follows the call sequence `Ze → Lt → Ap(jb())` to restore content, conditionally play, and potentially adjust timing | That this path executed during the observed browsing session |
| Completion outcomes | Source distinguishes normal completion, abandonment, skipping, and errors | That every outcome sends a particular telemetry request |
| Viewability and progress | Code contains event handling for impression, progress/quartiles, audibility/viewability, and completion | That those events were transmitted during the analyzed session |

The reported mid-roll investigation checked **34 source anchors**. Only a selection of source coordinates from the accompanying earlier player investigation is preserved below. Names such as `Ze`, `Lt`, and `Ap` are minified identifiers in a particular captured build, **not stable public APIs**.

### Concrete reference points from the earlier REA player report

Captured player script: `/s/player/cbcfbf2f/player_es6.vflset/en_US/base.js` (source SHA-256: `7c0e081a9ff0c4139a7dc61cd7e7281237446febfbb342e5d3f0852f370d982f`). The earlier report specified zero-based line and UTF-16-column positions.

| Source position | Previously recorded static evidence |
|---|---|
| `8478:500` and `8479:0` | Play/Pause button click handler registration; branching to `pauseVideo()` or `playVideo()` depending on playback state |
| `2387:0` | Event-to-ping collections include impression, pause/resume, start, quartiles, completion, and viewability-related terms |
| `5777:0` and `8914:222` | Viewability/audibility event mapping and ad-specific measurement-related code |
| `6961:635` | Ad presentation layout adds/removes `ad-showing` and `ad-interrupting` markers |
| `6887:188` | Exit handling distinguishes normal, abandoned, skipped, and error reasons |
| `8925:102` | Guarded `resumeVideo(a)` helper; conditional invocation of `playVideo()` |

These references are **source observations**, not proof that a function was invoked.

## Separately observed network evidence

A previous passive browser capture retained one same-origin request, `POST /api/stats/qoe`, returning HTTP `204`, with an initiator in `base.js`. It is plausibly quality-of-experience telemetry. Its relation to advertising was **not** established.

The previous browser capture was attach-limited and policy-filtered; some origins and scripts were excluded. No complete ad-to-content session, sanitized HAR, or confirmed ad-measurement transmission was supplied as part of the evidence summarized here.

## What remains unknown

- The private server-side algorithm that chooses *whether* to serve an ad and *which* advertiser's creative to show.
- A verified sequence linking a specific viewer's timed breakpoint to a particular ad request and response.
- The precise runtime path between mid-roll completion and content resumption in a real observed session.
- Whether the same source path applies to live streams, continuous content, or server-side-stitched advertisements.

A configured opportunity, an actual server decision, and observable player behavior must be measured separately.

## Reproducible next validation

1. Use a separate Chrome debugging profile and identify an eligible video with a mid-roll opportunity.
2. Open **Network**, enable **Keep log**, and record a naturally occurring mid-roll through normal-content resumption.
3. Export a **sanitized HAR**. Keep safe hostname/path, HTTP method, response status, relative timing, and non-sensitive initiator information; remove cookies, signed query values, credentials, personalized identifiers, and sensitive bodies.
4. Correlate the network timeline with timestamped observations of ad markers, media state, user actions, and Play/Pause events in DevTools.
5. Use REA/CDP to examine relevant read-only script evidence; retain source coordinates and completeness limits. Do not equate static code presence with runtime execution.
6. Compare ad and no-ad runs before claiming a universal behavior. Do not attempt to bypass ads, alter access controls, or replay authenticated requests.

## Outcome

This work progresses beyond a JavaScript inventory: the AI-assisted REA investigation assembled a bounded client-side **ad-break state-transition model**, identified VOD content-restoration logic and a guarded resume path, and clearly separated those findings from unobserved ad eligibility/ranking and runtime activity.

**Portfolio claim:** *Investigated YouTube's client-side mid-roll insertion architecture using REA and AI-assisted static JavaScript analysis, tracing timed cue handling, potential prefetch, ad presentation state, exit adapters, and conditional content restoration, while documenting evidence boundaries and unresolved server-side decisions.*

**References:** [REA browser observation](https://github.com/morluto/rea/blob/main/docs/browser-observation.md) · [YouTube official mid-roll help](https://support.google.com/youtube/answer/6175006?hl=en)
