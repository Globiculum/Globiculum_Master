import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Users, Target, Heart, Globe, Brain, Route, BookOpen, MessageCircle, Trophy, User, type LucideIcon } from "lucide-react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import aboutHeroImage from "@/assets/about-page.png";

interface AboutValue {
  icon: typeof Heart;
  title: string;
  description: string;
  color: string;
}

const ABOUT_VALUES: AboutValue[] = [
  {
    icon: Heart,
    title: "Family-First Approach",
    description: "Empathetic support for the whole family, not just the student.",
    color: "hsl(var(--mint))",
  },
  {
    icon: Globe,
    title: "Global Perspective",
    description: "A dual-curriculum approach that keeps kids competitive, everywhere.",
    color: "hsl(var(--secondary))",
  },
  {
    icon: Users,
    title: "Expert Guidance",
    description: "Recommendations grounded in real US–India academic expertise.",
    color: "hsl(var(--violet))",
  },
];

interface AdvantageFeature {
  icon: LucideIcon;
  title: string;
  description: string;
  badge: string;
  color: string;
}

const ADVANTAGE_FEATURES: AdvantageFeature[] = [
  {
    icon: Brain,
    title: "AI Curriculum Gap Mapping",
    description: "Intelligent analysis of US ↔ India ↔ University Entrance Test/AP gaps with personalized bridge recommendations.",
    badge: "AI-Powered",
    color: "hsl(var(--violet))",
  },
  {
    icon: Route,
    title: "Personalized Learning Pathways",
    description: "Custom study routes combining US breadth with Indian rigor for optimal exam performance.",
    badge: "Adaptive",
    color: "hsl(var(--mint))",
  },
  {
    icon: BookOpen,
    title: "Cultural & Language Immersion",
    description: "Support for Hindi, Telugu, Tamil, Kannada, or any home-country Indian language your family prefers.",
    badge: "Cultural",
    color: "hsl(var(--secondary))",
  },
  {
    icon: Users,
    title: "Parent Counseling Hub",
    description: "24/7 support portal for Indian migrant parents with expert guidance and community support.",
    badge: "Family Focus",
    color: "hsl(var(--accent))",
  },
  {
    icon: Trophy,
    title: "Dual-Prep Excellence",
    description: "Simultaneous preparation for US University Entrance Test/AP and Indian Board exams with proven methodologies.",
    badge: "Competitive Edge",
    color: "hsl(var(--violet))",
  },
  {
    icon: MessageCircle,
    title: "Always-On Educational Companion",
    description: "Trusted AI assistant for any educational query, academic need, or transition support.",
    badge: "24/7 Support",
    color: "hsl(var(--mint))",
  },
];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

// Temporarily hidden per request — kept in code (not deleted) so they can be
// switched back on later without rebuilding them.
const SHOW_CORE_TEAM = false;
const SHOW_TECH_SUPPORT = false;
const SHOW_GENERAL_ADVISORS = false;

const ADVISORY_BOARD: { name: string; role: string }[] = [
  { name: "Usha Chaitanya", role: "Academic Advisor" },
  { name: "Srivatsala", role: "Academic Advisor" },
  { name: "Sowmyasree Sumadhar", role: "Academic Advisor" },
  { name: "Prerana Oswal", role: "Academic Advisor" },
];

const AboutValueCard = ({ value }: { value: AboutValue }) => {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const Icon = value.icon;

  return (
    <motion.div variants={fadeUp} className="group relative h-full">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-2 rounded-2xl opacity-0 blur-xl transition-opacity duration-[450ms] group-hover:opacity-25"
        style={{ background: value.color }}
      />
      <motion.div
        whileHover={shouldReduceMotion ? undefined : { y: -3 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        className="relative flex h-full items-start gap-2.5 rounded-xl border border-white/12 bg-primary/25 p-3 backdrop-blur-md transition-colors duration-300 group-hover:bg-primary/20 sm:p-3.5"
      >
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${value.color}26` }}
        >
          <Icon className="h-4 w-4" style={{ color: value.color }} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h3 className="text-[13px] font-bold leading-tight text-white sm:text-sm">{value.title}</h3>
          <p className="mt-0.5 text-[11.5px] leading-snug text-white/65 sm:text-xs">{value.description}</p>
        </div>
      </motion.div>
    </motion.div>
  );
};

const AdvantageFeatureCard = ({ feature }: { feature: AdvantageFeature }) => {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const Icon = feature.icon;

  return (
    <motion.div variants={fadeUp} className="group relative h-full">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-3 rounded-[32px] opacity-0 blur-2xl transition-opacity duration-[450ms] group-hover:opacity-20"
        style={{ background: feature.color }}
      />
      <motion.div
        whileHover={shouldReduceMotion ? undefined : { y: -8 }}
        transition={{ type: "spring", stiffness: 300, damping: 22, mass: 0.6 }}
        className="relative flex h-full flex-col overflow-hidden rounded-[28px] border border-border bg-white p-6 shadow-sm transition-[box-shadow,border-color] duration-[450ms] hover:border-secondary hover:shadow-xl sm:p-7"
      >
        <div className="relative mb-4 flex items-center justify-between gap-3">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
            style={{ backgroundColor: `${feature.color}1f` }}
          >
            <Icon className="h-6 w-6" style={{ color: feature.color }} aria-hidden="true" />
          </div>
          <span
            className="rounded-full px-3 py-1 text-xs font-bold"
            style={{ backgroundColor: `${feature.color}1a`, color: feature.color }}
          >
            {feature.badge}
          </span>
        </div>

        <h3 className="relative mb-2 text-lg font-bold text-foreground">{feature.title}</h3>
        <p className="relative text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
      </motion.div>
    </motion.div>
  );
};

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="relative overflow-hidden bg-gradient-hero py-10 sm:py-12 md:py-16">
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10" />

        <div className="container relative mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6">
            {/* LEFT: intro + mission + values, all left-aligned and compact */}
            <motion.div
              className="text-center lg:text-left"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.4 }}
              variants={staggerContainer}
            >
              <motion.span
                variants={fadeUp}
                className="mb-4 inline-block rounded-full bg-accent px-5 py-2 text-sm font-bold uppercase tracking-wide text-accent-foreground shadow-[0_8px_24px_-8px_rgba(245,158,11,0.55)] sm:text-base"
                style={{ letterSpacing: "1px" }}
              >
                Our Story
              </motion.span>

              <motion.h1
                variants={fadeUp}
                className="text-[28px] font-extrabold leading-tight text-white sm:text-[34px] md:text-[38px]"
              >
                About <span className="bg-gradient-mint bg-clip-text text-transparent">Globiculum</span>
              </motion.h1>

              <motion.p
                variants={fadeUp}
                className="mx-auto mt-3 max-w-lg text-[15px] leading-relaxed text-white/80 sm:text-base lg:mx-0"
              >
                Bridging educational worlds for Indian migrant families, one student at a time.
              </motion.p>

              {/* Mission — left-aligned, no boxed card, blends straight into the section */}
              <motion.div
                variants={fadeUp}
                className="mx-auto mt-6 max-w-lg border-l-2 border-mint/50 pl-4 text-left sm:mt-7 lg:mx-0"
              >
                <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[2px] text-mint">
                  <Target className="h-3.5 w-3.5" aria-hidden="true" />
                  Our Mission
                </p>
                <p className="text-[15px] font-bold leading-relaxed text-white/95 sm:text-base">
                  Empowering Indian migrant families to bridge two education systems — with confidence, not confusion.
                </p>
              </motion.div>

              {/* Values — compact, horizontally aligned; full column width on desktop so the
                  cards get enough room per-column and don't wrap into cramped, uneven shapes */}
              <motion.div
                variants={fadeUp}
                className="mx-auto mt-6 grid max-w-lg grid-cols-1 gap-3 sm:mt-7 sm:grid-cols-3 lg:mx-0 lg:max-w-none"
              >
                {ABOUT_VALUES.map((value) => (
                  <AboutValueCard key={value.title} value={value} />
                ))}
              </motion.div>
            </motion.div>

            {/* RIGHT: large hero image, masked so it fades into the dark gradient instead of sitting in a card */}
            <motion.div
              className="relative mx-auto h-[320px] w-full max-w-md sm:h-[420px] lg:mx-0 lg:h-[560px] lg:max-w-none"
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-secondary/20 blur-3xl" />
              <img
                src={aboutHeroImage}
                alt="A family walking a glowing bridge that connects U.S. education to Indian education, moving from uncertainty toward a confident future"
                loading="lazy"
                className="animate-hero-float h-full w-full object-cover object-[center_20%]"
                style={{
                  WebkitMaskImage: "radial-gradient(58% 58% at 50% 46%, black 58%, black 76%, transparent 100%)",
                  maskImage: "radial-gradient(58% 58% at 50% 46%, black 58%, black 76%, transparent 100%)",
                }}
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Our Advantage Section */}
      <section className="relative overflow-hidden bg-muted/30 py-12 sm:py-16 md:py-20">
        <div className="container relative mx-auto px-4 sm:px-6">
          <motion.div
            className="mx-auto mb-10 max-w-3xl text-center sm:mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
            variants={staggerContainer}
          >
            <motion.span
              variants={fadeUp}
              className="mb-6 inline-block rounded-full bg-accent px-6 py-2.5 text-base font-bold uppercase tracking-wide text-accent-foreground shadow-[0_8px_24px_-8px_rgba(245,158,11,0.55)] sm:text-lg"
              style={{ letterSpacing: "1px" }}
            >
              Our Advantage
            </motion.span>

            <motion.h2
              variants={fadeUp}
              className="text-[28px] font-extrabold leading-tight text-foreground sm:text-[36px] md:text-[42px]"
            >
              What Makes <span className="text-secondary">Globiculum</span> Unique
            </motion.h2>

            <motion.p variants={fadeUp} className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Discover what makes Globiculum unique — AI precision meets human care for every learner's journey.
            </motion.p>
          </motion.div>

          <motion.div
            className="mx-auto grid max-w-6xl grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
          >
            {ADVANTAGE_FEATURES.map((feature) => (
              <AdvantageFeatureCard key={feature.title} feature={feature} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* People & Advisors Section */}
      <section className="relative overflow-hidden bg-gradient-hero py-12 sm:py-16 md:py-20">
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10" />

        <div className="container relative mx-auto px-4 sm:px-6">
          <motion.div
            className="mx-auto mb-10 max-w-2xl text-center sm:mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
            variants={staggerContainer}
          >
            <motion.span
              variants={fadeUp}
              className="mb-6 inline-block rounded-full bg-accent px-6 py-2.5 text-base font-bold uppercase tracking-wide text-accent-foreground shadow-[0_8px_24px_-8px_rgba(245,158,11,0.55)] sm:text-lg"
              style={{ letterSpacing: "1px" }}
            >
              Our Team
            </motion.span>
            <motion.h2
              variants={fadeUp}
              className="text-[28px] font-extrabold leading-tight text-white sm:text-[36px] md:text-[42px]"
            >
              People behind our vision & mission
            </motion.h2>
          </motion.div>

          {/* Core Team — hidden for now, kept in code via SHOW_CORE_TEAM */}
          {SHOW_CORE_TEAM && (
            <div className="mb-16">
              <h3 className="text-2xl font-semibold mb-8 text-center text-white">
                Core Team — People behind the vision & mission
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i} className="border border-white/15 bg-primary/25 text-center p-6 backdrop-blur-md">
                    <div className="w-20 h-20 bg-white/10 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <Users className="h-8 w-8 text-white/70" />
                    </div>
                    <p className="font-bold text-white">Name Surname</p>
                    <p className="italic text-white/70 text-sm">Role placeholder</p>
                    <p className="text-white/60 text-sm mt-2">Short tagline describing role</p>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Educational Advisory Board */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={staggerContainer}
          >
            <motion.h3 variants={fadeUp} className="text-2xl font-semibold mb-8 text-center text-mint">
              Our Educational Advisory Board
            </motion.h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-5xl mx-auto">
              {ADVISORY_BOARD.map((advisor) => (
                <motion.div key={advisor.name} variants={fadeUp} className="group relative h-full">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -inset-2 rounded-2xl bg-secondary opacity-0 blur-xl transition-opacity duration-[450ms] group-hover:opacity-25"
                  />
                  <div className="relative flex h-full min-h-[220px] flex-col items-center justify-center rounded-2xl border border-white/15 bg-primary/25 p-6 text-center backdrop-blur-md transition-colors duration-300 group-hover:bg-primary/20">
                    <div className="w-20 h-20 bg-white/10 rounded-full mb-4 flex shrink-0 items-center justify-center">
                      <User className="h-8 w-8 text-white/70" aria-hidden="true" />
                    </div>
                    <p className="font-bold text-white">{advisor.name}</p>
                    <p className="italic text-white/70 text-sm">{advisor.role}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Tech Support / Technical Gurus — hidden for now, kept in code via SHOW_TECH_SUPPORT */}
          {SHOW_TECH_SUPPORT && (
            <div className="mt-16">
              <h3 className="text-2xl font-semibold mb-8 text-center text-white">
                Our Tech Support / Technical Guru(s)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 max-w-4xl mx-auto">
                {[
                  { role: "Technical Lead", tagline: "Platform architecture & scalability" },
                  { role: "Platform Architect", tagline: "System design & integration" },
                  { role: "AI/ML Engineer", tagline: "Curriculum gap analysis algorithms" },
                ].map((tech, i) => (
                  <Card key={i} className="border border-white/15 bg-primary/25 text-center p-6 backdrop-blur-md">
                    <div className="w-20 h-20 bg-white/10 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <Users className="h-8 w-8 text-white/70" />
                    </div>
                    <p className="font-bold text-white">Name Surname</p>
                    <p className="italic text-white/70 text-sm">{tech.role}</p>
                    <p className="text-white/60 text-sm mt-2">{tech.tagline}</p>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* General Advisors — hidden for now, kept in code via SHOW_GENERAL_ADVISORS */}
          {SHOW_GENERAL_ADVISORS && (
            <div className="mt-16">
              <h3 className="text-2xl font-semibold mb-8 text-center text-white">
                Our Advisors
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 max-w-5xl mx-auto">
                {[
                  "Strategic Growth Advisor",
                  "Finance & Operations Advisor",
                  "Legal & Compliance Advisor",
                  "Marketing & Brand Advisor",
                  "Community Outreach Advisor",
                  "Partnership Development Advisor",
                  "Product Strategy Advisor",
                  "User Experience Advisor",
                ].map((role, i) => (
                  <Card key={i} className="border border-white/15 bg-primary/25 text-center p-4 backdrop-blur-md">
                    <div className="w-16 h-16 bg-white/10 rounded-full mx-auto mb-3 flex items-center justify-center">
                      <Users className="h-6 w-6 text-white/70" />
                    </div>
                    <p className="font-bold text-white text-sm">Name Surname</p>
                    <p className="italic text-white/70 text-xs">{role}</p>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default About;
