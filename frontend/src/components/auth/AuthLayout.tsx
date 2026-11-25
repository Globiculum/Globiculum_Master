import { useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { BookOpen, ChartNoAxesColumnIncreasing, Globe } from "lucide-react";
import logo from "@/assets/Globiculum_BBG.png";
// The family (with table, book and globe), cut out of the designer's
// background picture with rembg (isnet-general-use), transparent WebP, 990 x 493.
import familyPhoto from "@/assets/auth-family.webp";
import { AuthWaves, CapDoodle } from "./AuthIcons";
import "./authPages.css";

/** The left-hand text, shared by every auth page: change it here. */
const AUTH_HEADLINE = {
  line1: "New country, new school.",
  line2: "Same confident child.",
};
const AUTH_LEAD = "A personalized learning companion that helps your child thrive in any curriculum, anywhere in the world.";
const AUTH_FEATURES = [
  { icon: BookOpen, line1: "Curriculum", line2: "Support" },
  { icon: ChartNoAxesColumnIncreasing, line1: "Skill", line2: "Growth" },
  { icon: Globe, line1: "Global", line2: "Readiness" },
];

interface AuthLayoutProps {
  /** Browser tab title, e.g. "Log in | Globiculum". */
  pageTitle: string;
  /** The card's heading (an h2: the page's h1 is the headline). */
  title: ReactNode;
  /** Line under the card's heading, e.g. "Log in to continue learning with Globiculum." */
  subtitle?: ReactNode;
  children: ReactNode;
  /** Line under the card's content, e.g. "New to Globiculum? Create an account". */
  footer?: ReactNode;
  /** Centres the card's content (status pages: email sent, link expired). */
  centered?: boolean;
  /** Status icon shown above the title (status pages). */
  icon?: ReactNode;
}

/**
 * Shared shell of the Log in, Sign up, password and email-link pages, built
 * from the 25 Nov 2026 mock: the logo in the top-left corner, headline,
 * subtitle and three features on the left with the family photo below, teal
 * waves on the right, and the white card for the page's form floating over them.
 */
const AuthLayout = ({ pageTitle, title, subtitle, children, footer, centered = false, icon }: AuthLayoutProps) => {
  useEffect(() => {
    const previous = document.title;
    document.title = pageTitle;
    return () => {
      document.title = previous;
    };
  }, [pageTitle]);

  return (
    <div className="ga-frame">
      <AuthWaves className="ga-waves" />

      <div className="ga-inner">
        {/* The page's banner landmark: headline, subtitle, features and photo. */}
        <header className="ga-left">
          <Link to="/" className="ga-logo-link">
            <img src={logo} alt="Globiculum" className="ga-logo" width={188} height={52} />
          </Link>
          <span aria-hidden="true" className="ga-accent" />
          <h1 className="ga-h1">
            {AUTH_HEADLINE.line1}
            <br />
            <span className="ga-h1-accent">{AUTH_HEADLINE.line2}</span>
          </h1>
          <p className="ga-lead">{AUTH_LEAD}</p>
          {/* The cap doodle hangs off the right end of the features. */}
          <div className="ga-feature-row">
            <ul className="ga-features">
              {AUTH_FEATURES.map(({ icon: Icon, line1, line2 }) => (
                <li key={line1} className="ga-feature">
                  <span aria-hidden="true" className="ga-feature-icon">
                    <Icon />
                  </span>
                  <span>
                    {line1}
                    <br />
                    {line2}
                  </span>
                </li>
              ))}
            </ul>
            <CapDoodle className="ga-doodle" />
          </div>
          <div className="ga-photo">
            <img src={familyPhoto} alt="Parents and two children smiling over a tablet and a textbook" width={990} height={493} />
          </div>
        </header>

        <main id="main-content" className={`ga-card${centered ? " ga-card--center" : ""}`} aria-labelledby="ga-card-title">
          {icon}
          <div className="ga-heading">
            <h2 id="ga-card-title" className="ga-title">
              {title}
            </h2>
            {subtitle && <p className="ga-subtitle">{subtitle}</p>}
          </div>
          {children}
          {footer && <p className="ga-footer">{footer}</p>}
        </main>

        {/* Phones and tablets: the same photo under the card, so the form comes
            first. Decorative here: the header's copy carries the description. */}
        <img src={familyPhoto} alt="" aria-hidden="true" className="ga-photo-below" width={990} height={493} loading="lazy" />
      </div>
    </div>
  );
};

export default AuthLayout;
