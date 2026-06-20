import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        node: {
          start: "hsl(var(--node-start))",
          question: "hsl(var(--node-question))",
          action: "hsl(var(--node-action))",
          condition: "hsl(var(--node-condition))",
          end: "hsl(var(--node-end))",
          content: "hsl(var(--node-content))",
          data: "hsl(var(--node-data))",
          logic: "hsl(var(--node-logic))",
          integration: "hsl(var(--node-integration))",
          call: "hsl(var(--node-call))",
          ai: "hsl(var(--node-ai))",
          flow: "hsl(var(--node-flow))",
        },
        // Phase 2 — Brain semantic aliases (additive).
        "bb-surface": {
          1: "hsl(var(--bb-surface-1))",
          2: "hsl(var(--bb-surface-2))",
          3: "hsl(var(--bb-surface-3))",
          inset: "hsl(var(--bb-surface-inset))",
          overlay: "hsl(var(--bb-surface-overlay))",
        },
        "bb-border": {
          subtle: "hsl(var(--bb-border-subtle))",
          strong: "hsl(var(--bb-border-strong))",
          focus: "hsl(var(--bb-border-focus))",
        },
        "bb-status": {
          ok: "hsl(var(--bb-status-ok))",
          "ok-fg": "hsl(var(--bb-status-ok-fg))",
          warn: "hsl(var(--bb-status-warn))",
          "warn-fg": "hsl(var(--bb-status-warn-fg))",
          bad: "hsl(var(--bb-status-bad))",
          "bad-fg": "hsl(var(--bb-status-bad-fg))",
          info: "hsl(var(--bb-status-info))",
          "info-fg": "hsl(var(--bb-status-info-fg))",
          muted: "hsl(var(--bb-status-muted))",
          "muted-fg": "hsl(var(--bb-status-muted-fg))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "heart-pop": {
          "0%": { transform: "scale(1)" },
          "30%": { transform: "scale(1.4)" },
          "60%": { transform: "scale(0.95)" },
          "100%": { transform: "scale(1)" },
        },
        scroll: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        shimmer: "shimmer 2s linear infinite",
        "heart-pop": "heart-pop 0.4s ease-in-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
