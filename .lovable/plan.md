
# Agent Page Fixes: Stat Cards, Filters & Color Contrast

## What the Screenshots Show Is Missing

### Missing: Stat Cards at the Top of the Page
The light-mode screenshot (image-8) shows 4 stat cards at the very top of the Agent Lifecycle page:
- **Total Agents** (people icon)
- **Active** (green checkmark)
- **Deprovisioned** (red X)
- **Pending Jobs** (clock icon)

Currently `AgentsPage.tsx` has no stat cards at all — only a title and the tabs.

### Missing: Role & Status Filters in Offboarding Tab
The screenshot shows the `AgentSearchList` has two additional filter dropdowns:
- **All Roles** dropdown (filtering by agent role)
- **All Status** dropdown (filtering by status: Active, Scheduled, Under Review, Removed)

Currently `AgentSearchList.tsx` only has a text search input — no role or status filters.

### Color Contrast Issues
Looking at the dark-theme form screenshot (image-9) and the CSS:
- Input fields use `--input: 217 33% 22%` (dark background) but placeholder text uses `--muted-foreground: 215 20% 75%` which is reasonably ok, however **form labels** and certain text elements are hard to read
- In dark mode, `--destructive: 0 62% 30%` is quite dark — destructive text/badges may be unreadable against dark card backgrounds  
- The `under_review` badge uses `text-yellow-400` which may clash in light mode
- The `AdminLayout` hardcodes `className="dark"` forcing dark mode at all times — this is correct per design intent, but some components (like the `DeprovisioningModal` dialog) don't inherit the dark class, so they render in light mode with wrong colors

## Plan

### 1. Add Stat Cards to `AgentsPage.tsx`
Add 4 stat cards at the top of the page, computed from the `history` array:
- **Total Agents**: `history.length`
- **Active**: `history.filter(a => a.status === 'active').length`
- **Deprovisioned**: `history.filter(a => a.status === 'deprovisioned').length`  
- **Pending Jobs**: `history.filter(a => a.status === 'pending_deletion').length`

Use the existing `StatCard` component from `src/components/ui/stat-card.tsx` (already in the project).

### 2. Add Role & Status Filters to `AgentSearchList.tsx`
Add two `Select` dropdowns above the agent list:
- **Role filter**: populated from unique roles in the agents array
- **Status filter**: predefined options — All Status, Active, Scheduled (pending_deletion), Under Review, Removed (deprovisioned)

Filter the displayed list by combining: text search + role filter + status filter.

Also fix the column layout to match the screenshot (search on left, two filter dropdowns on right).

### 3. Fix Color Contrast

**`src/index.css` — dark mode CSS variables:**
- `--destructive`: Change from `0 62% 30%` → `0 72% 50%` so destructive text/buttons are readable against dark card backgrounds
- `--muted-foreground`: Bump from `215 20% 75%` → `215 20% 80%` for slightly better readability

**`src/components/agents/shared/StatusBadge.tsx`:**
- Fix `under_review` badge: change `text-yellow-400` → `text-yellow-500` (more contrast) or use the existing `--warning` token
- Fix `deprovisioned` badge: currently `text-muted-foreground` which is invisible in dark mode — change to `text-foreground/60`

**`DeprovisioningModal.tsx`:** The `<DialogContent>` renders outside the `dark` class container. Add `className="dark"` to the `DialogContent` so it inherits dark styling consistently. Actually the better fix is to apply `dark` class to the `<DialogPortal>` or ensure the dialog portal is under the dark root. The cleanest fix: add `dark` to the modal content wrapper directly.

**`AgentSearchList.tsx` batch bar:** The `text-warning` on the orange batch selection bar — ensure it's legible.

### 4. Fix Audit Log Column Order
Reorder columns to match the screenshot: **Time → Action → Agent → Performed By → Details** (currently Action is first).

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/admin/AgentsPage.tsx` | Add 4 stat cards above the tabs |
| `src/components/agents/offboarding/AgentSearchList.tsx` | Add Role + Status filter dropdowns; fix layout |
| `src/components/agents/offboarding/AuditLogTable.tsx` | Reorder columns: Time first |
| `src/components/agents/offboarding/DeprovisioningModal.tsx` | Add `dark` class to DialogContent for consistent dark styling |
| `src/index.css` | Fix `--destructive` in dark mode for better readability |
| `src/components/agents/shared/StatusBadge.tsx` | Fix `under_review` and `deprovisioned` badge contrast |

## Implementation Detail: Stat Cards

```tsx
// In AgentsPage.tsx — above <Tabs>
const totalAgents = history.length;
const activeAgents = history.filter(a => a.status === 'active').length;
const deprovisionedAgents = history.filter(a => a.status === 'deprovisioned').length;
const pendingJobs = history.filter(a => a.status === 'pending_deletion').length;

// Render 4 StatCards in a grid
<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
  <StatCard title="Total Agents" value={totalAgents} icon={Users2} />
  <StatCard title="Active" value={activeAgents} icon={CheckCircle} iconColor="text-success" />
  <StatCard title="Deprovisioned" value={deprovisionedAgents} icon={XCircle} iconColor="text-destructive" />
  <StatCard title="Pending Jobs" value={pendingJobs} icon={Clock} iconColor="text-warning" />
</div>
```

## Implementation Detail: Filters

```tsx
// New state in AgentSearchList
const [roleFilter, setRoleFilter] = useState("all");
const [statusFilter, setStatusFilter] = useState("all");

// Filtered list
const filtered = agents.filter(a => {
  const matchesSearch = `${a.agentName} ${a.email} ${a.role} ${a.extension}`
    .toLowerCase().includes(search.toLowerCase());
  const matchesRole = roleFilter === "all" || a.role === roleFilter;
  const matchesStatus = statusFilter === "all" || a.status === statusFilter;
  return matchesSearch && matchesRole && matchesStatus;
});
```

Status filter options map:
- "all" → All Status
- "active" → Active  
- "pending_deletion" → Scheduled
- "under_review" → Under Review
- "deprovisioned" → Removed
