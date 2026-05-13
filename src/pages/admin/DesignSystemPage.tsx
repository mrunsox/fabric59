import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { HealthIndicator } from "@/components/ui/health-indicator";
import { PremiumStatCard } from "@/components/ui/premium-stat-card";
import { PremiumEmptyState } from "@/components/ui/premium-empty-state";
import { ActionBanner } from "@/components/ui/action-banner";
import { MetricStrip } from "@/components/ui/metric-strip";
import { StepCard } from "@/components/ui/step-card";
import {
  Palette, Type, Layers, Activity, Users, Building2, Globe,
  CheckCircle, AlertTriangle, Info, XCircle, Clock, Wifi, Zap,
} from "lucide-react";

function ColorSwatch({ name, value }: { name: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-lg border border-border" style={{ background: `hsl(${value})` }} />
      <div>
        <p className="text-sm font-medium text-foreground">{name}</p>
        <p className="text-xs text-muted-foreground font-mono">{value}</p>
      </div>
    </div>
  );
}

export default function DesignSystemPage() {
  return (
    <div className="space-y-10 animate-fade-in max-w-5xl">
      <PageHeader
        title="Design System"
        subtitle="Fabric59 premium enterprise component reference"
        icon={<div className="h-10 w-10 rounded-xl bg-primary/8 flex items-center justify-center"><Palette className="h-5 w-5 text-primary" /></div>}
      />

      {/* Color Tokens */}
      <section className="space-y-4">
        <h2 className="text-headline flex items-center gap-2"><Palette className="h-4 w-4" /> Color Tokens</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 surface-raised p-6">
          <ColorSwatch name="Primary" value="var(--primary)" />
          <ColorSwatch name="Accent" value="var(--accent)" />
          <ColorSwatch name="Success" value="var(--success)" />
          <ColorSwatch name="Warning" value="var(--warning)" />
          <ColorSwatch name="Destructive" value="var(--destructive)" />
          <ColorSwatch name="Muted" value="var(--muted)" />
          <ColorSwatch name="Background" value="var(--background)" />
          <ColorSwatch name="Card" value="var(--card)" />
        </div>
      </section>

      {/* Typography */}
      <section className="space-y-4">
        <h2 className="text-headline flex items-center gap-2"><Type className="h-4 w-4" /> Typography Scale</h2>
        <div className="surface-raised p-6 space-y-6">
          <div><p className="text-caption mb-1">Display</p><p className="text-display">The quick brown fox</p></div>
          <div><p className="text-caption mb-1">Headline</p><p className="text-headline">The quick brown fox jumps</p></div>
          <div><p className="text-caption mb-1">Body</p><p className="text-sm text-foreground">The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.</p></div>
          <div><p className="text-caption mb-1">Caption</p><p className="text-caption">UPPERCASE CAPTION TEXT</p></div>
        </div>
      </section>

      {/* Status System */}
      <section className="space-y-4">
        <h2 className="text-headline flex items-center gap-2"><Activity className="h-4 w-4" /> Status System</h2>
        <div className="surface-raised p-6 space-y-4">
          <div className="flex flex-wrap gap-3">
            <StatusBadge variant="active" dot>Active</StatusBadge>
            <StatusBadge variant="pending" dot>Pending</StatusBadge>
            <StatusBadge variant="success" dot>Success</StatusBadge>
            <StatusBadge variant="warning" dot>Warning</StatusBadge>
            <StatusBadge variant="error" dot>Error</StatusBadge>
            <StatusBadge variant="info" dot>Info</StatusBadge>
            <StatusBadge variant="syncing" dot>Syncing</StatusBadge>
            <StatusBadge variant="review" dot>Review</StatusBadge>
            <StatusBadge variant="disconnected" dot>Disconnected</StatusBadge>
          </div>
          <div className="flex flex-wrap gap-4">
            <HealthIndicator status="healthy" />
            <HealthIndicator status="degraded" />
            <HealthIndicator status="critical" />
            <HealthIndicator status="offline" />
            <HealthIndicator status="syncing" />
            <HealthIndicator status="pending" />
          </div>
          <div className="flex flex-wrap gap-3">
            <StatusBadge variant="active" size="sm" dot>Small</StatusBadge>
            <StatusBadge variant="active" size="default" dot>Default</StatusBadge>
            <StatusBadge variant="active" size="lg" dot>Large</StatusBadge>
          </div>
        </div>
      </section>

      {/* Buttons */}
      <section className="space-y-4">
        <h2 className="text-headline">Buttons</h2>
        <div className="surface-raised p-6 space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button size="sm">Small</Button>
            <Button size="default">Default</Button>
            <Button size="lg">Large</Button>
            <Button size="icon"><Zap className="h-4 w-4" /></Button>
          </div>
        </div>
      </section>

      {/* Stat Cards */}
      <section className="space-y-4">
        <h2 className="text-headline flex items-center gap-2"><Layers className="h-4 w-4" /> Stat Cards</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <PremiumStatCard title="Platform Health" value="98.5%" icon={Activity} tier="hero" variant="primary" trend={{ value: 2.3, label: "vs last week" }} />
          <PremiumStatCard title="Active Agents" value={42} icon={Users} variant="success" trend={{ value: 5 }} />
          <PremiumStatCard title="Active Clients" value={18} icon={Building2} variant="primary" />
          <PremiumStatCard title="Five9 Domains" value={3} icon={Globe} tier="compact" variant="default" />
        </div>
      </section>

      {/* Action Banners */}
      <section className="space-y-4">
        <h2 className="text-headline">Action Banners</h2>
        <div className="space-y-3">
          <ActionBanner icon={Info} title="New integration available" description="Connect Salesforce to sync contacts automatically." variant="info" action={{ label: "Learn More", onClick: () => {} }} />
          <ActionBanner icon={AlertTriangle} title="3 agents pending setup" description="Complete provisioning to activate." variant="warning" action={{ label: "Review", onClick: () => {} }} onDismiss={() => {}} />
          <ActionBanner icon={CheckCircle} title="All systems operational" description="Last checked 2 minutes ago." variant="success" />
        </div>
      </section>

      {/* Metric Strip */}
      <section className="space-y-4">
        <h2 className="text-headline">Metric Strip</h2>
        <MetricStrip items={[
          { label: "Agents", value: 42, icon: Users },
          { label: "Clients", value: 18, icon: Building2 },
          { label: "Domains", value: 3, icon: Globe },
          { label: "Uptime", value: "99.9%", icon: Activity, change: "+0.1%" },
        ]} />
      </section>

      {/* Step Cards */}
      <section className="space-y-4">
        <h2 className="text-headline">Step Cards</h2>
        <div className="space-y-2 max-w-lg">
          <StepCard icon={Building2} title="Create Organization" description="Set up your workspace" status="completed" />
          <StepCard icon={Globe} title="Connect Five9 Domain" description="Link your call center" status="active" expandable>
            <p className="text-sm text-muted-foreground">Enter your Five9 admin credentials to establish a secure connection.</p>
          </StepCard>
          <StepCard icon={Users} title="Add First Client" description="Configure your first client" status="upcoming" />
        </div>
      </section>

      {/* Surfaces */}
      <section className="space-y-4">
        <h2 className="text-headline">Surfaces</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card-elevated p-6"><p className="text-sm font-medium">card-elevated</p><p className="text-xs text-muted-foreground mt-1">Top accent border</p></div>
          <div className="card-glass p-6"><p className="text-sm font-medium">card-glass</p><p className="text-xs text-muted-foreground mt-1">Frosted glass</p></div>
          <div className="surface-raised p-6"><p className="text-sm font-medium">surface-raised</p><p className="text-xs text-muted-foreground mt-1">Subtle shadow</p></div>
          <div className="surface-inset p-6"><p className="text-sm font-medium">surface-inset</p><p className="text-xs text-muted-foreground mt-1">Recessed background</p></div>
        </div>
      </section>

      {/* Empty State */}
      <section className="space-y-4">
        <h2 className="text-headline">Empty State</h2>
        <PremiumEmptyState icon={Users} title="No agents found" description="Add your first agent to get started with provisioning." action={{ label: "Add Agent", onClick: () => {} }} />
      </section>
    </div>
  );
}
