import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronRight, X, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export interface TourStep {
  title: string;
  description: string;
  icon?: React.ReactNode;
}

interface GuidedTourProps {
  tourKey: string; // e.g., "admin" or "master"
  steps: TourStep[];
}

export function GuidedTour({ tourKey, steps }: GuidedTourProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user) return;
    // Check localStorage first for instant dismissal
    if (localStorage.getItem(`tour_completed_${tourKey}`)) return;

    const checkOnboarding = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .single();

      const completed = (data?.onboarding_completed as Record<string, boolean>) || {};
      if (!completed[tourKey]) {
        setVisible(true);
      }
    };
    checkOnboarding();
  }, [user, tourKey]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    setDismissed(true);
    setVisible(false);
    // Persist to localStorage immediately for reliable dismissal
    localStorage.setItem(`tour_completed_${tourKey}`, "true");
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", user.id)
      .single();

    const completed = (data?.onboarding_completed as Record<string, boolean>) || {};
    await supabase
      .from("profiles")
      .upsert({ id: user.id, onboarding_completed: { ...completed, [tourKey]: true } });
  };

  if (!visible || dismissed) return null;

  const step = steps[currentStep];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-card border border-border rounded-2xl p-8 max-w-md w-full shadow-2xl"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Step {currentStep + 1} of {steps.length}
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleComplete} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="mb-6">
            {step.icon && <div className="mb-4">{step.icon}</div>}
            <h3 className="text-xl font-bold mb-2">{step.title}</h3>
            <p className="text-muted-foreground leading-relaxed">{step.description}</p>
          </div>

          {/* Progress dots */}
          <div className="flex items-center gap-1.5 mb-6">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === currentStep
                    ? "w-6 bg-primary"
                    : i < currentStep
                    ? "w-1.5 bg-primary/50"
                    : "w-1.5 bg-muted"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={handleComplete}>
              Skip Tour
            </Button>
            <Button onClick={handleNext} className="gap-2">
              {currentStep < steps.length - 1 ? (
                <>
                  Next <ChevronRight className="h-4 w-4" />
                </>
              ) : (
                "Get Started"
              )}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
