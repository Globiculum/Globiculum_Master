import { AnimatePresence, motion } from "framer-motion";

interface FieldErrorProps {
  message?: string;
}

// Single canonical inline validation-message treatment shared by every
// field and field-group in both assessments — QuestionCard and
// SectionContainer render this internally, and step files render it
// directly for composite sub-fields (e.g. first/last name) that need a
// per-part message instead of one message for the whole group.
const FieldError = ({ message }: FieldErrorProps) => (
  <AnimatePresence>
    {message && (
      <motion.p
        role="alert"
        className="mt-1.5 text-sm font-medium text-destructive"
        initial={{ opacity: 0, y: -4, height: 0 }}
        animate={{ opacity: 1, y: 0, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        {message}
      </motion.p>
    )}
  </AnimatePresence>
);

export default FieldError;
