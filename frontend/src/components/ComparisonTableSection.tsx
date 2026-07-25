import { Check } from "lucide-react";
import { motion, type Variants } from "framer-motion";

interface Row {
  capability: string;
  others: "faded" | "partial";
}

const ROWS: Row[] = [
  { capability: "Subject-level gap analysis vs Indian curriculum", others: "faded" },
  { capability: "NCERT chapter-level references (not fabricated scores)", others: "faded" },
  { capability: "US / IB / Cambridge → CBSE / ICSE mapping", others: "faded" },
  { capability: "Confidence-first view (what your child already knows)", others: "faded" },
  { capability: "Personalised month-by-month bridge plan", others: "partial" },
  { capability: "Assessment-first before recommending tutors", others: "faded" },
  { capability: "Tutor-ready shareable report link", others: "faded" },
  { capability: "Guardian / parent co-access dashboard", others: "faded" },
];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

const rowStagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

const ComparisonTableSection = () => {
  return (
    <section className="relative bg-white py-16 sm:py-20 md:py-24">
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div
          className="mx-auto mb-12 max-w-2xl text-center sm:mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          variants={staggerContainer}
        >
          <motion.span
            variants={fadeUp}
            className="mb-6 inline-block rounded-full bg-accent px-6 py-2.5 text-base font-bold uppercase tracking-wide text-accent-foreground shadow-[0_8px_24px_-8px_rgba(245,158,11,0.55)] sm:text-lg"
          >
            Why Globiculum
          </motion.span>

          <motion.h2 variants={fadeUp} className="text-[28px] font-extrabold leading-tight text-foreground sm:text-[36px] md:text-[42px]">
            What nothing else does
          </motion.h2>

          <motion.p variants={fadeUp} className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Every tool parents use today fails the same way: they can&apos;t tell you what your specific child is actually missing — chapter by chapter.
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-[rgba(15,23,42,0.06)] shadow-xl"
        >
          <div className="overflow-x-auto" role="table" aria-label="Comparison of Globiculum against other tools">
            <div className="min-w-[560px]">
              <div role="row" className="grid grid-cols-[1fr_140px_140px] items-center bg-primary px-6 py-4 sm:px-8">
                <span role="columnheader" className="text-sm font-semibold text-white/70">
                  Capability
                </span>
                <span role="columnheader" className="text-center text-sm font-bold text-mint">
                  Globiculum
                </span>
                <span role="columnheader" className="text-center text-sm font-semibold text-white/70">
                  Others
                </span>
              </div>

              <motion.div variants={rowStagger} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }}>
                {ROWS.map((row, index) => (
                  <motion.div
                    key={row.capability}
                    variants={fadeUp}
                    role="row"
                    className={`grid grid-cols-[1fr_140px_140px] items-center px-6 py-4 transition-colors duration-200 hover:bg-secondary/[0.05] sm:px-8 sm:py-5 ${
                      index % 2 === 1 ? "bg-muted/30" : "bg-white"
                    }`}
                  >
                    <span role="rowheader" className="pr-4 text-sm text-foreground sm:text-[15px]">
                      {row.capability}
                    </span>
                    <span role="cell" className="flex justify-center" aria-label="Included">
                      <Check className="h-5 w-5 text-secondary" strokeWidth={3} aria-hidden="true" />
                    </span>
                    <span role="cell" className="flex justify-center">
                      {row.others === "partial" ? (
                        <span className="text-xs font-semibold uppercase tracking-wide text-accent" aria-label="Partial">
                          Partial
                        </span>
                      ) : (
                        <Check
                          className="h-5 w-5 text-muted-foreground/25"
                          strokeWidth={3}
                          aria-label="Not meaningfully included"
                        />
                      )}
                    </span>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ComparisonTableSection;
