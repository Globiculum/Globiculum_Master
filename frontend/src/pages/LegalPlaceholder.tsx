import { useEffect } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

/**
 * PLACEHOLDER for the Terms of Service and Privacy Policy, which the Sign up
 * checkbox links to. The real documents are not written yet (tracker T27,
 * decision D6): replace this page before launch.
 */
const LegalPlaceholder = ({ title }: { title: "Terms of Service" | "Privacy Policy" }) => {
  useEffect(() => {
    const previous = document.title;
    document.title = `${title} | Globiculum`;
    return () => {
      document.title = previous;
    };
  }, [title]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main id="main-content" className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 sm:px-6">
        <h1 className="font-heading text-h2 text-foreground">{title}</h1>
        <p className="mt-6 font-body text-body text-muted-foreground">
          We're finalising our {title}. It will be published on this page before Globiculum launches.
        </p>
        <p className="mt-4 font-body text-body text-muted-foreground">
          <Link to="/" className="font-semibold text-secondary-contrast underline underline-offset-2 hover:text-foreground">
            Back to home
          </Link>
        </p>
      </main>
      <Footer />
    </div>
  );
};

export default LegalPlaceholder;
