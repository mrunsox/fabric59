import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  GLOBAL_SECTIONS,
  findActiveSection,
} from "@/config/navigation";
import {
  WORKSPACE_NAV,
  WORKSPACE_NAV_GROUPS,
  WORKSPACE_NAV_PINNED,
} from "@/config/canonicalNav";

/**
 * Narrow nav + routing correctness guard.
 *
 * Locks two contracts that broke during nav convergence:
 *   1) Every visible nav target (admin rail/subnav, workspace sidebar groups +
 *      pinned) resolves to a mounted route in App.tsx that is NOT a
 *      <Navigate>-only redirect. Guards against "ghost" items like the
 *      previous `home` entry that pointed at a redirect-only path.
 *   2) Active-section matching keeps highlighting the correct parent for
 *      both /admin/* and nested /w/:id/* detail routes.
 */

const ROOT = path.resolve(process.cwd(), "src");
const APP_SRC = fs.readFileSync(path.join(ROOT, "App.tsx"), "utf8");

/**
 * Scan App.tsx for every <Route path="…"> mounted under the given parent
 * path prefix (e.g. /admin or /w/:workspaceId). Returns a map of
 * relative-path → "page" | "redirect", where "redirect" means the route
 * element is a <Navigate ...> (so it must not be a primary nav target).
 *
 * Implementation: locate the parent <Route path="…" element={<Shell />}>
 * block, then walk forward extracting nested <Route path="…" element={…} />
 * entries until the matching closing </Route>.
 */
function collectChildRoutes(parentPath: string): Map<string, "page" | "redirect"> {
  const escaped = parentPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const openRe = new RegExp(
    `<Route\\s+path=["']${escaped}["'][^>]*element=\\{[^}]*Shell[^}]*\\}\\s*>`,
  );
  const openMatch = APP_SRC.match(openRe);
  if (!openMatch || openMatch.index === undefined) {
    throw new Error(`Could not find <Route path="${parentPath}"> shell block in App.tsx`);
  }
  // Walk forward from the end of the opening tag, tracking <Route ...> opens
  // (children with their own nested routes) vs </Route> closes so we stop at
  // the matching close for THIS shell, not at the first nested close.
  const start = openMatch.index + openMatch[0].length;
  const rest = APP_SRC.slice(start);
  const tokenRe = /<Route\s[^>]*?element=\{[\s\S]*?\}\s*(\/)?>|<\/Route>/g;
  let depth = 0;
  let bodyEnd = -1;
  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(rest)) !== null) {
    const tok = m[0];
    if (tok === "</Route>") {
      if (depth === 0) { bodyEnd = m.index; break; }
      depth -= 1;
    } else if (m[1] === "/") {
      // self-closing child route — depth unchanged
    } else {
      // opening tag for a nested route with children
      depth += 1;
    }
  }
  if (bodyEnd < 0) throw new Error("Unterminated shell <Route> block");
  const body = rest.slice(0, bodyEnd);

  const result = new Map<string, "page" | "redirect">();
  const selfClosingRe = /<Route\s+path=["']([^"']+)["'][^>]*element=\{([\s\S]*?)\}\s*\/>/g;
  const openingRe = /<Route\s+path=["']([^"']+)["'][^>]*element=\{([\s\S]*?)\}\s*>/g;
  for (const re of [selfClosingRe, openingRe]) {
    let cm: RegExpExecArray | null;
    while ((cm = re.exec(body)) !== null) {
      const p = cm[1];
      const element = cm[2];
      const kind: "page" | "redirect" = /<\s*Navigate\b/.test(element) ? "redirect" : "page";
      result.set(p, kind);
    }
  }
  return result;
}

const ADMIN_ROUTES = collectChildRoutes("/admin");
const WORKSPACE_ROUTES = collectChildRoutes("/w/:workspaceId");

describe("nav + routing correctness", () => {
  it("every admin rail target is mounted (and is /admin itself or a child route)", () => {
    for (const s of GLOBAL_SECTIONS) {
      if (s.href === "/admin") continue; // index route, always mounted
      expect(s.href.startsWith("/admin/"), `${s.key} href must live under /admin`).toBe(true);
      const child = s.href.slice("/admin/".length);
      expect(
        ADMIN_ROUTES.has(child),
        `Admin rail target "${s.href}" (key=${s.key}) is not mounted in App.tsx`,
      ).toBe(true);
    }
  });

  it("admin subnav items resolve to mounted routes", () => {
    for (const s of GLOBAL_SECTIONS) {
      for (const sub of s.subNav ?? []) {
        if (sub.href === "/admin") continue;
        expect(sub.href.startsWith("/admin/"), `subnav ${sub.label} must live under /admin`).toBe(true);
        const child = sub.href.slice("/admin/".length);
        expect(
          ADMIN_ROUTES.has(child),
          `Subnav "${sub.label}" → ${sub.href} is not mounted`,
        ).toBe(true);
      }
    }
  });

  it("every visible workspace sidebar item maps to a mounted, non-redirect route (no ghosts)", () => {
    const visible = [
      ...WORKSPACE_NAV_GROUPS.flatMap((g) => g.items),
      ...WORKSPACE_NAV_PINNED,
    ];
    for (const item of visible) {
      const kind = WORKSPACE_ROUTES.get(item.to);
      expect(
        kind,
        `Workspace nav item "${item.key}" → /w/:id/${item.to} is not mounted in App.tsx`,
      ).toBeDefined();
      expect(
        kind,
        `Workspace nav item "${item.key}" → /w/:id/${item.to} is a redirect-only ghost; remove it from the visible groups/pinned set`,
      ).toBe("page");
    }
  });

  it("ghost-guard: the retired `home` item must be fully absent from canonical workspace nav", () => {
    const visibleKeys = new Set(
      [
        ...WORKSPACE_NAV_GROUPS.flatMap((g) => g.items),
        ...WORKSPACE_NAV_PINNED,
      ].map((i) => i.key),
    );
    expect(visibleKeys.has("home"), "/w/:id/home is redirect-only — keep `home` out of visible groups").toBe(false);
    // Dashboard consolidation: `home` is fully retired from the flat union
    // too. /w/:id/home still resolves (Navigate-only compat route in App.tsx)
    // but no product chrome references it.
    expect(WORKSPACE_NAV.some((i) => i.key === "home"), "`home` must not appear in flat WORKSPACE_NAV").toBe(false);
  });


  it("findActiveSection returns the matching section for each canonical /admin/* href", () => {
    for (const s of GLOBAL_SECTIONS) {
      const got = findActiveSection(s.href);
      expect(got?.key, `${s.href} should resolve to section "${s.key}"`).toBe(s.key);
    }
  });

  it("findActiveSection highlights the correct parent for nested admin probes", () => {
    const probes: Array<[string, string]> = [
      ["/admin/workspaces", "workspaces"],
      ["/admin/clients", "workspaces"],          // clients live under Workspaces section
      ["/admin/connectors/five9", "connectors"],
      ["/admin/mappings/builder", "connectors"], // mappings subnav under Connectors
      ["/admin/reports", "reports"],
      ["/admin/qa", "reports"],
      ["/admin/notifications", "notifications"],
      ["/admin/settings", "settings"],
      ["/admin/billing", "billing"],
    ];
    for (const [p, key] of probes) {
      expect(findActiveSection(p)?.key, `${p} → ${key}`).toBe(key);
    }
  });

  it("workspace sidebar active-state matches nested detail/edit routes", () => {
    // Mirror src/shells/WorkspaceShell.tsx → WorkspaceSidebar.isActive
    const workspaceId = "abc";
    const isActive = (to: string, pathname: string) => {
      const full = `/w/${workspaceId}/${to}`;
      return pathname === full || pathname.startsWith(`${full}/`);
    };
    const cases: Array<[string, string]> = [
      ["campaigns", `/w/${workspaceId}/campaigns/123`],
      ["campaigns", `/w/${workspaceId}/campaigns/new`],
      ["guides", `/w/${workspaceId}/guides/g-1/edit`],
      ["guides", `/w/${workspaceId}/guides/g-1/preview`],
      ["forms", `/w/${workspaceId}/forms/f-1`],
      ["forms", `/w/${workspaceId}/forms/f-1/edit`],
      ["clients", `/w/${workspaceId}/clients/c-1`],
      ["templates", `/w/${workspaceId}/templates/t-1`],
      ["integrations", `/w/${workspaceId}/integrations/conn-1`],
    ];
    for (const [key, path] of cases) {
      expect(isActive(key, path), `${path} should highlight "${key}"`).toBe(true);
    }
    // Sibling negative — campaigns must not light up when on guides.
    expect(isActive("campaigns", `/w/${workspaceId}/guides`)).toBe(false);
  });
});
