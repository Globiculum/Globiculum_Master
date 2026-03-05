import globiculumLogo from "@/assets/globiculum-logo.png";

const Footer = () => {
  return (
    <footer className="bg-primary border-t border-primary-glow py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <img src={globiculumLogo} alt="Globiculum" className="h-8 w-auto brightness-0 invert" />
            <p className="text-sm text-primary-foreground/70">
              Seamless curriculum transitions for global learners. Bridging worlds, building futures.
            </p>
          </div>

          {/* Company */}
          <div className="space-y-4">
            <h4 className="font-semibold text-primary-foreground">Company</h4>
            <div className="space-y-2 text-sm text-primary-foreground/70">
              <div><a href="/about" className="hover:text-secondary transition-colors">About Us</a></div>
              <div><a href="#" className="hover:text-secondary transition-colors">Success Stories</a></div>
              <div><a href="#" className="hover:text-secondary transition-colors">Blog</a></div>
              <div><a href="#" className="hover:text-secondary transition-colors">Contact</a></div>
            </div>
          </div>

          {/* Family Support */}
          <div className="space-y-4">
            <h4 className="font-semibold text-primary-foreground">Family Support</h4>
            <div className="space-y-2 text-sm text-primary-foreground/70">
              <div><a href="#faq" className="hover:text-secondary transition-colors">FAQs</a></div>
              <div><span className="opacity-50">Resource Library (Planned)</span></div>
              <div><span className="opacity-50">Support Center (Planned)</span></div>
            </div>
          </div>

          {/* Trust & Safety */}
          <div className="space-y-4">
            <h4 className="font-semibold text-primary-foreground">Trust & Safety</h4>
            <div className="space-y-2 text-sm text-primary-foreground/70">
              <div><a href="#" className="hover:text-secondary transition-colors">Privacy Policy</a></div>
              <div><a href="#" className="hover:text-secondary transition-colors">Terms of Service</a></div>
              <div><a href="#" className="hover:text-secondary transition-colors">Data Security</a></div>
            </div>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 mt-8 pt-8 text-center">
          <p className="text-sm text-primary-foreground/70">
            Globiculum © {new Date().getFullYear()} | Privacy Policy | Terms of Service | Contact Us
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
