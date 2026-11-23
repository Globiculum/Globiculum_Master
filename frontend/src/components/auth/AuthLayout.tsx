import { useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import logo from "@/assets/Globiculum_BBG.png";
// The design's family photo, sharpened: a 2x made with Real-ESRGAN from the
// 767 px original, and the 1x shrunk from that 2x (sharper than the original).
import familyPhoto from "@/assets/family_soft.webp";
import familyPhoto2x from "@/assets/family_soft@2x.webp";
import { CardNetwork, PanelNetwork } from "./AuthIcons";
import "./authPages.css";

/** The panel headline, shared by every auth page: change it here. */
const AUTH_HEADLINE = {
  line1: "New country, new school.",
  line2: "Same confident child.",
};

interface AuthLayoutProps {
  /** Browser tab title, e.g. "Log in | Globiculum". */
  pageTitle: string;
  /** The card's heading (an h2: the page's h1 is the panel headline). */
  title: string;
  children: ReactNode;
  /** Line under the card's content, e.g. "New to Globiculum? Create an account". */
  footer?: ReactNode;
  /** Centres the card's content (status pages: email sent, link expired). */
  centered?: boolean;
  /** Status icon shown above the title (status pages). */
  icon?: ReactNode;
}

/**
 * Shared shell of the Log in, Sign up, password and email-link pages
 * (GLOBICULUM_AUTH_PAGES_V2.md): a navy frame holding a teal panel with the
 * logo, headline and family photo, and a white card for the page's form.
 */
const AuthLayout = ({ pageTitle, title, children, footer, centered = false, icon }: AuthLayoutProps) => {
  useEffect(() => {
    const previous = document.title;
    document.title = pageTitle;
    return () => {
      document.title = previous;
    };
  }, [pageTitle]);

  return (
    <div className="ga-frame">
      <div className="ga-panel">
        <div aria-hidden="true" className="ga-glow" />
        <div aria-hidden="true" className="ga-glow-2" />
        <div aria-hidden="true" className="ga-dots" />
        <PanelNetwork className="ga-network" />

        <div className="ga-inner">
          <section className="ga-left">
            <Link to="/" className="ga-logo-link">
              <img src={logo} alt="Globiculum" className="ga-logo" width={188} height={52} />
            </Link>
            <h1 className="ga-h1">
              {AUTH_HEADLINE.line1}
              <br />
              <span className="ga-h1-accent">{AUTH_HEADLINE.line2}</span>
            </h1>
            <div className="ga-photo">
              <div aria-hidden="true" className="ga-photo-glow" />
              <div aria-hidden="true" className="ga-photo-glow-2" />
              <img
                src={familyPhoto}
                srcSet={`${familyPhoto} 767w, ${familyPhoto2x} 1534w`}
                sizes="(max-width: 960px) calc(100vw - 64px), 740px"
                alt="Parents and two children smiling over a tablet and a textbook"
                width={767}
                height={497}
              />
            </div>
          </section>

          <main id="main-content" className={`ga-card${centered ? " ga-card--center" : ""}`} aria-labelledby="ga-card-title">
            <CardNetwork className="ga-card-network" />
            {icon}
            <h2 id="ga-card-title" className="ga-title">
              {title}
            </h2>
            {children}
            {footer && <p className="ga-footer">{footer}</p>}
          </main>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
