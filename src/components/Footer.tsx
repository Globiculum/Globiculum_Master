import { GraduationCap } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-primary border-t border-primary-glow py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <GraduationCap className="h-8 w-8 text-secondary" />
              <span className="text-xl font-bold text-primary-foreground">
                EduSetu
              </span>
            </div>
            <p className="text-sm text-primary-foreground/70">
              Your Family's Learning Bridge
            </p>
            <p className="text-sm text-primary-foreground/70">
              Seamless Transitions, Confident Futures
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="font-semibold text-primary-foreground">Quick Links</h4>
            <div className="space-y-2 text-sm text-primary-foreground/70">
              <div><a href="#about" className="hover:text-secondary transition-colors">About Us</a></div>
              <div><a href="#how-it-works" className="hover:text-secondary transition-colors">How It Works</a></div>
              <div><a href="#features" className="hover:text-secondary transition-colors">Features</a></div>
              <div><a href="#assessment" className="hover:text-secondary transition-colors">Assessment</a></div>
            </div>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h4 className="font-semibold text-primary-foreground">Family Support</h4>
            <div className="space-y-2 text-sm text-primary-foreground/70">
              <div><a href="#" className="hover:text-secondary transition-colors">Parent Trust Center</a></div>
              <div><a href="#" className="hover:text-secondary transition-colors">Contact Us</a></div>
              <div><a href="#" className="hover:text-secondary transition-colors">Community</a></div>
              <div><a href="#" className="hover:text-secondary transition-colors">Help Center</a></div>
            </div>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h4 className="font-semibold text-primary-foreground">Trust & Safety</h4>
            <div className="space-y-2 text-sm text-primary-foreground/70">
              <div><a href="#" className="hover:text-secondary transition-colors">Privacy Policy</a></div>
              <div><a href="#" className="hover:text-secondary transition-colors">Terms of Service</a></div>
              <div><a href="#" className="hover:text-secondary transition-colors">FERPA Compliance</a></div>
              <div><a href="#" className="hover:text-secondary transition-colors">COPPA Compliance</a></div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-primary-foreground/20 mt-8 pt-8 text-center">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-primary-foreground/70">
              EduSetu © 2025 | Privacy Policy | Parent Trust Center | Contact Us
            </p>
            <p className="text-sm text-primary-foreground/70">
              Academic Success, Cultural Belonging
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
