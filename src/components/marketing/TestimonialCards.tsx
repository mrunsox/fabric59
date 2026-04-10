import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  {
    quote: "Fabric59 cut our agent onboarding from 2 hours to under a minute. The Five9 SOAP integration is rock solid.",
    name: "Sarah Mitchell",
    role: "Operations Director",
    company: "LegalReach BPO",
    initials: "SM",
  },
  {
    quote: "The Legal Connect module transformed how we handle Clio writebacks. Disposition mapping alone saved us 15 hours a week.",
    name: "David Chen",
    role: "Contact Center Manager",
    company: "Intake Pros",
    initials: "DC",
  },
  {
    quote: "Finally, a platform that understands Five9 at the API level. The field mapping builder is exactly what we needed.",
    name: "Maria Rodriguez",
    role: "VP of Technology",
    company: "CallForce Solutions",
    initials: "MR",
  },
];

export function TestimonialCards() {
  return (
    <section className="py-20 max-w-6xl mx-auto px-6">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-12"
      >
        <h2 className="text-3xl font-bold mb-3">Trusted by contact center leaders</h2>
        <p className="text-muted-foreground">See what teams are saying about Fabric59.</p>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-6">
        {testimonials.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.15, duration: 0.5 }}
            className="rounded-xl bg-card border border-border/40 p-6 flex flex-col hover:border-primary/30 transition-colors"
          >
            <div className="flex gap-1 mb-4">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className="h-4 w-4 text-primary" fill="currentColor" />
              ))}
            </div>
            <p className="text-sm text-foreground leading-relaxed flex-1 mb-6">"{t.quote}"</p>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                {t.initials}
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.role}, {t.company}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
