# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary user: an individual running a pre-registered N-of-1 (single-subject)
self-experiment — initially the requester, running an active protocol on
their own device today. The app is built to be shareable: if published,
other self-experimenters are equivalent primary users, each running their
own separate protocol(s) on their own device. There is no shared or
cross-user context — no backend, no accounts, nothing to coordinate between
users.

Usage pattern: installed to the iPhone home screen as a standalone PWA,
opened once each morning for about 30 seconds to log the previous day
(whole-day measures are scored retrospectively, so the app defaults to
yesterday). Desktop use is secondary and occasional.

## Product Purpose

ABLATION runs one or more N-of-1 trials at a time: the user removes or
changes exactly one variable in their life, commits to falsifiable
predictions before any data exists, logs a short structured entry daily,
and receives an honest, direction-only verdict once the trial's fixed
duration ends.

It exists because journals and habit trackers let people quietly revise
what they believed at the start once they see how things turned out.
ABLATION makes that commitment mechanically checkable instead of a matter
of willpower. Success is an honest verdict at the end — a null result
(the intervention didn't do anything) is treated as a legitimate, useful
outcome, not a failure of the tool or the user.

## Positioning

Locked pre-registration: predictions, the user's own stated effect-size
threshold, and their falsifier are hashed (SHA-256, first 8 hex chars)
into a fingerprint shown on every screen, and become immutable the moment
they're locked — no edit path exists anywhere in the UI. A notes app or
habit tracker cannot truthfully make this claim.

It also refuses the two shortcuts that make most self-tracking data look
more meaningful than it is: no partial verdict before the trial's end date,
and no p-values or inferential statistics anywhere — daily single-subject
self-report is heavily autocorrelated, and a naive significance test would
report certainty that isn't there.

## Operating Context

- Opened briefly each morning, offline-capable (works with airplane mode
  on once installed).
- All data lives in `localStorage` on that one device only — no backend,
  no sync, no cloud, no accounts. Multiple protocols can run concurrently
  on the same device without bleeding into each other.
- An active protocol is currently running on the requester's own device
  with real logged entries. That data is private to the device and is not
  available as design evidence — design and testing work must continue to
  use synthetic/seeded data (as already done for the Trends/Protocols
  design pass), never fabricate "real" usage as if it were observed.
- Data quality varies by recall lag: entries are timestamped separately
  for the day being scored and the moment they were actually written, and
  a long gap between the two is treated as a real signal, not noise to
  hide.

## Capabilities and Constraints

- Storage is a `Store` interface backed by `localStorage`
  (`ablation:v1:*`), so a future sync backend could be dropped in without
  touching the UI. Not built yet — out of scope until asked for.
- Protocols are data: the shipped templates (cannabis washout, alcohol
  reduction, phone/short-form video, medication change) are the only
  places anything substance- or behavior-specific may appear; the rest of
  the app's logic must stay generic enough for a fully custom protocol.
- All metrics are enforced higher-is-better at creation time; a metric
  name that reads as lower-is-better (e.g. "irritability") is flagged so
  the user reframes it (e.g. to "evenness") rather than the app silently
  supporting mixed directions.
- Pre-registration (predictions, effect-size text, falsifier text) is
  immutable once locked, enforced at the storage layer, not just hidden in
  the UI. Changing a hypothesis means abandoning the protocol and starting
  a new one; abandoned and completed protocols stay in a permanent
  archive and are never deleted.
- The verdict screen is inaccessible before the protocol's own end date —
  there is no partial verdict.
- No p-values or inferential statistics anywhere in the codebase; only
  means, deltas, and observation counts, with an explicit one-line
  statement of why whenever a statistic would otherwise imply certainty.
- Export as JSON (full round-trip via import) and CSV (one row per day),
  plus a copyable plain-text clinical summary ending in an explicit
  "self-reported, unblinded, n=1" line, meant to be pasted into an email
  to a prescriber.
- Installed iOS PWAs cannot schedule local notifications, and web push
  needs a server this app doesn't have. The app states this plainly and
  offers copyable reminder text for iOS Reminders rather than implying it
  will notify the user itself.
- Undecided: whether/how the project is actually distributed if shared —
  open-sourcing the repository versus just sharing a deployed URL for
  others to install their own instance. Left open until the user decides.

## Brand Commitments

Name: **ABLATION** — a literal reference to an ablation study (remove one
component, measure what breaks).

Voice commitment (binding on all future copy, independent of whatever
visual system a later DESIGN.md records): cold, institutional, precise.
Never congratulatory, no streak language, no gamification, no
editorializing about a result. A bad week is stated as plainly as a good
one — the strongest thing the app is allowed to say about a bad result is
displaying the number.

## Evidence on Hand

No public testimonials, case studies, or press — this is a personal tool,
not a marketed product. One protocol is actively running on the
requester's own device with real entries, but that data is private and
local; future work must not treat it as available evidence and must not
fabricate sample "real" data.

## Product Principles

1. A null result is a legitimate, useful outcome — nothing in the product
   may make "the effect didn't show up" read as a failure of the tool or
   the user.
2. Commitment must be mechanically checkable, not willpower-dependent —
   pre-registration is hashed and immutable, not merely advised against
   editing.
3. Never claim certainty the data doesn't support — no p-values, no
   partial verdicts, explicit statements about recall lag and
   autocorrelation wherever they're relevant.
4. Protocols are data, not code — the app's own logic stays generic;
   anything substance- or behavior-specific lives only in template data.
5. Honesty over engagement — a feature that makes the app more engaging
   without making it more accurate doesn't ship (no streaks, no
   notifications the app can't actually deliver, no encouragement copy).

## Accessibility & Inclusion

General floor only, no additional personal requirement identified:
minimum 4.5:1 contrast for body text, visible keyboard focus on every
control, tick controls exposed as real buttons with `aria-pressed`,
meaning never carried by color alone (shape/character differences too),
usable down to a 320px viewport, and `prefers-reduced-motion` respected.
