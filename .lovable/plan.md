
# Fix Integrations Page Scroll, Tenant Integration Badges, and Configure Flow — DONE

All three fixes implemented:

1. ✅ **Scroll Overflow**: `<main>` in AdminLayout now has `overflow-y-auto h-[calc(100vh-4rem)]`; IntegrationsPage tabs use horizontal `ScrollArea` with `inline-flex`
2. ✅ **Tenant Integration Badges**: New "Integrations" column shows icon badges for CRM type + webhook integrations (Slack, Zapier, Make, n8n, Pabbly)
3. ✅ **Configure Client Flow**: "Configure in Clients" opens `ClientSelectDialog` → select a client → navigates to `/admin?edit=<id>` → auto-opens edit dialog
