import { motion } from "framer-motion";

const logos = [
  "slack", "teams", "hubspot", "salesforce", "stripe", "zoom",
  "google-drive", "openai", "quickbooks", "asana", "twilio",
  "calendly", "zapier", "make", "onedrive", "dropbox",
  "docusign", "zendesk", "microsoft", "google",
];

export function LogoCarousel() {
  return (
    <section className="py-12 overflow-hidden">
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center text-sm text-muted-foreground mb-8"
      >
        Works with <span className="text-foreground font-medium">55+</span> tools your team already uses
      </motion.p>
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-background to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent z-10" />
        <div className="flex animate-[scroll_30s_linear_infinite] hover:[animation-play-state:paused]">
          {[...logos, ...logos].map((logo, i) => (
            <div
              key={`${logo}-${i}`}
              className="flex-shrink-0 mx-4 h-12 w-12 rounded-xl bg-card border border-border/40 flex items-center justify-center hover:border-primary/40 hover:scale-110 transition-all duration-200"
            >
              <img src={`/integration-logos/${logo}.svg`} alt={logo} className="h-6 w-6 opacity-60 hover:opacity-100 transition-opacity" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
