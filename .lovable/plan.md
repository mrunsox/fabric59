
The project currently has an `/outline` page that serves as a living roadmap. To improve navigation, I'll add two clear navigation buttons in the page header: one to return to the landing/entry point of the application and another to quickly jump to the admin dashboard.

### Proposed Changes

#### Frontend

1.  **Modify `src/pages/OutlinePage.tsx`**
    *   Import navigation components: `Link` from `react-router-dom` and the `Button` UI component.
    *   Import icons: `ArrowLeft` (for navigation back) and `LayoutDashboard` (for the dashboard link).
    *   Update the header layout to include:
        *   **"Back to Landing" Button**: A ghost-style button linking to the root path (`/`). This will naturally take the user to the home page or login screen depending on their auth state.
        *   **"Go to Dashboard" Button**: A primary-styled button linking to `/admin` for quick access to the main application interface.
    *   Refine the header's responsive layout to ensure the buttons and existing progress stats are well-spaced on both mobile and desktop.

### Technical Implementation Details

```text
Header Layout Update:
+-----------------------------------------------------------+
| [Logo] Build Outline          [Back] [Go to Dashboard] [📊]|
+-----------------------------------------------------------+
```

*   The buttons will use the established design system (`shadcn/ui` buttons).
*   Responsive classes (e.g., `hidden sm:flex`) will be used to hide labels on very small screens if necessary, though the plan aims to keep them visible on most devices.
*   Since the `/outline` page is public, these buttons provide a bridge between the public roadmap and the private application areas.

### User Experience
*   **Convenience**: Users viewing the roadmap can immediately enter the app or return to where they started.
*   **Context**: Clear labels ("Back to Landing", "Go to Dashboard") remove ambiguity about where the buttons lead.
