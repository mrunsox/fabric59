# Dev Guide architecture flowchart

Add a visual architecture flowchart to the existing internal `/admin/dev-guide` page so the dev team can understand the Five9 → Fabric59 → Legal systems chain at a glance.

## Approach

Build a **custom React/CSS flowchart** (no new dependencies). Mermaid isn't installed and adding it for one diagram is overkill; React Flow is overkill for a static layered diagram. A semantic-tokened grid of layered "lane" cards with connector arrows fits the Linear-style admin shell, renders crisply in light mode, and stays maintainable (edit an array, the diagram updates).

## What to build

### 1. New component: `src/components/dev-guide/ArchitectureFlowchart.tsx`

A self-contained, responsive layered flowchart with seven horizontal lanes stacked top-to-bottom, each containing labeled chip-style nodes. Between lanes, a thin vertical connector with a downward chevron in primary color indicates flow.

Layers (top → bottom), with a small Lucide icon and a one-line caption per lane:

1. **Five9 event source** (`PhoneIncoming`) — On Call Dispositioned · On Call Ended · Callback Requested · Inbound ANI Lookup
2. **Flow Template** (`LayoutTemplate`) — Disposition Webhook · CRM Action · Inbound Lookup · Callback / Task · Custom Relay
3. **Configured Flow** (`Workflow`) — Trigger · Filters · Mappings · Action · Failure Policy · Test / Review
4. **Deployment Scope** (`Target`) — Workspace · Client · Five9 Domain · Campaign · Queue · Disposition Conditions
5. **Connector Layer** (`Plug`) — Clio · MyCase · Smokeball · Webhook · Custom HTTP · Future Connectors
6. **Execution Run** (`Activity`) — Request Payload · Response Payload · Success / Failure · Retry / Replay · Idempotency / External Record
7. **Target Outcomes** (`CheckCircle2`) — Create/Update Contact · Create Matter/Case · Create Task · Create Note/Activity · Return Screen-Pop Context · Send Webhook Payload

Visual structure:

- Each lane is a rounded card with a header row (icon + lane name + caption) and a flex-wrap row of chip nodes (small bordered pills using `bg-secondary/40`, `border-border/60`).
- Between lanes: a centered 24px-tall vertical line in `bg-border` topped by a `ChevronDown` glyph in `text-primary`, communicating directional flow without an SVG arrow library.
- The Connector lane and Deployment lane both feed into Execution; this fan-in is annotated with a small caption under the arrow ("Deployment scope + Connector resolve at run time").
- Container: `border border-border/60 rounded-xl bg-card p-4 sm:p-6` with `overflow-x-auto` for narrow viewports. Chip rows use `flex-wrap gap-2` and are readable at the current admin width (1202px) without horizontal scroll.

Color use: cyan primary only on the chevrons, lane icons, and lane name. Chips and lane cards use neutral semantic tokens. No raw hex colors. Fully built from semantic tokens so it inherits future theme work.

A short legend strip below the diagram (3 inline items): primary chevron = directional flow · neutral chip = entity / value · stacked lane = system layer.

### 2. Caption block under the diagram

Render the brief's prose verbatim:

> Fabric59 uses Five9 as the event source and orchestration entry point. Admins choose a flow template, configure logic and mappings, scope where the flow is deployed, and route actions through reusable connectors such as Clio, MyCase, Smokeball, or generic webhook/HTTP targets. Every execution is tracked as a run so the system can support monitoring, retry, replay, and safe connector behavior over time.

Plus a one-line reinforcement: *Fabric59 is a reusable Five9-native integration hub, not a one-off Clio connector.*

### 3. Mount it in `src/pages/admin/DevGuidePage.tsx`

Insert a new **"Architecture flowchart"** section as the second section (right after Overview, before Core architecture) so the visual primes the rest of the doc. Add it to the sticky section nav with an icon (`GitBranch`) and id `flowchart`. Section body = `<ArchitectureFlowchart />` followed by the caption block.

## Acceptance check

- The Dev Guide shows a layered flowchart covering all seven layers in the brief, each with the listed nodes.
- Diagram renders cleanly at 1202px and remains usable down to mobile (chips wrap, container scrolls horizontally only as a last resort).
- All chips and labels match the FlowBuilder terminology already used in the rest of the guide.
- Caption block reinforces "reusable integration hub, not a one-off Clio connector".
- Uses semantic tokens only; no hex colors, no new dependencies.

## Out of scope

- Mermaid runtime, React Flow, or any diagramming library.
- Interactivity (clicking nodes, zoom/pan).
- Editing the diagram from the UI.
