import { motion } from 'framer-motion';
import { Loader2, Sparkles } from 'lucide-react';

interface TemplateLoadingOverlayProps {
  isLoading: boolean;
  templateName?: string;
}

export function TemplateLoadingOverlay({ isLoading, templateName }: TemplateLoadingOverlayProps) {
  if (!isLoading) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-card border border-border rounded-2xl p-8 shadow-2xl max-w-sm mx-4"
      >
        <div className="flex flex-col items-center text-center">
          {/* Animated icon */}
          <div className="relative mb-6">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center shadow-lg"
            >
              <Loader2 className="w-8 h-8 text-primary-foreground" />
            </motion.div>
            
            {/* Sparkle effects */}
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute -top-2 -right-2"
            >
              <Sparkles className="w-5 h-5 text-primary" />
            </motion.div>
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
              className="absolute -bottom-1 -left-2"
            >
              <Sparkles className="w-4 h-4 text-primary/70" />
            </motion.div>
          </div>

          {/* Text */}
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Loading Template
          </h3>
          {templateName && (
            <p className="text-sm text-primary font-medium mb-3">
              "{templateName}"
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            Arranging nodes and calculating flow sequence...
          </p>

          {/* Progress bar animation */}
          <div className="w-full h-1.5 bg-muted rounded-full mt-6 overflow-hidden">
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ 
                duration: 1, 
                repeat: Infinity, 
                ease: 'easeInOut',
              }}
              className="h-full w-1/2 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full"
            />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
