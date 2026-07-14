import { motion } from "framer-motion";
import { Facebook, Twitter, Instagram, Linkedin, Youtube, Mail, Phone, MapPin, Star } from "lucide-react";
import { LeadCaptureForm } from "@/components/LeadCaptureForm";
import { Link } from "react-router-dom";
import { GoogleGLogo } from "@/components/GoogleGLogo";
import logo from "@/assets/dekhocampus-footer-logo.png";
import dcLogo from "@/assets/dc-logo.png";
import { GlobalDiscoveryBar } from "@/components/GlobalDiscoveryBar";

const footerLinks = {
  explore: [
    { label: "Colleges", href: "/colleges" },
    { label: "Courses", href: "/courses" },
    { label: "Exams", href: "/exams" },
    { label: "Rankings", href: "#" },
    { label: "Compare", href: "#" },
  ],
  resources: [
    { label: "Articles", href: "/articles" },
    { label: "News", href: "/news" },
    { label: "Career Scope", href: "/careers" },
    { label: "AI Tools", href: "/tools" },
    { label: "Refer & Earn", href: "/dashboard/refer" },
  ],
  company: [
    { label: "About Us", href: "/about-us" },
    { label: "Careers", href: "/vacancies" },
    { label: "Press", href: "/about-us#press" },
    { label: "Partners", href: "#" },
    { label: "Contact", href: "#" },
  ],
  legal: [
    { label: "Privacy Policy", href: "/legal/privacy-policy" },
    { label: "Terms of Service", href: "/legal/terms-of-service" },
    { label: "Refund & Payment", href: "/legal/refund-policy" },
    { label: "Cookie Policy", href: "/legal/cookie-policy" },
    { label: "Accessibility", href: "/legal/accessibility" },
  ],
};

const socialLinks = [
  { icon: Facebook, href: "#", label: "Facebook" },
  { icon: Twitter, href: "#", label: "Twitter" },
  { icon: Instagram, href: "#", label: "Instagram" },
  { icon: Linkedin, href: "#", label: "LinkedIn" },
  { icon: Youtube, href: "#", label: "YouTube" },
];

export function Footer() {
  return (
    <footer className="bg-foreground text-background" role="contentinfo">
      {/* Built by IIT Delhi Alumni strip - shown on every page */}
      <div className="bg-background text-foreground border-b border-border/40">
        <div className="container py-3.5 md:py-4 flex flex-col items-center text-center gap-0.5">
          <div className="inline-flex items-center gap-2">
            <img src={dcLogo} alt="DekhoCampus" className="w-5 h-5 md:w-6 md:h-6 object-contain" />
            <span className="text-sm md:text-base font-bold tracking-tight text-primary">Built by IIT Delhi Alumni</span>
          </div>
          <p className="text-[11px] md:text-xs text-muted-foreground max-w-md leading-snug">
            We went through the same journey - now we've built the system to simplify yours.
          </p>
        </div>
      </div>

      <GlobalDiscoveryBar />

      {/* Lead Capture Section */}
      <div className="border-b border-background/10">
        <div className="container py-8 md:py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto"
          >
            <LeadCaptureForm
              variant="banner"
              title="🎯 Get Expert College Counseling - Free!"
              subtitle="Our counselors have helped 50,000+ students find their dream college"
              source="footer_banner"
              simple
            />
          </motion.div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="container py-10 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 md:gap-8">
          {/* Brand */}
          <div className="col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <img src={logo} alt="DekhoCampus" className="h-8 md:h-10" />
            </Link>
            <p className="text-background/70 text-sm mb-6 max-w-xs">
              India's #1 AI-powered education platform helping students find their perfect career path.
            </p>
            <div className="space-y-3 text-sm text-background/70">
              <a
                href="mailto:hello@dekhocampus.com"
                className="flex items-center gap-2 hover:text-accent transition-colors"
              >
                <Mail className="w-4 h-4" />
                <span>hello@dekhocampus.com</span>
              </a>
              <a href="tel:+919876543210" className="flex items-center gap-2 hover:text-accent transition-colors">
                <Phone className="w-4 h-4" />
                <span>+91 98765 43210</span>
              </a>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>New Delhi, India</span>
              </div>
            </div>
          </div>

          {/* Links */}
          <nav aria-label="Explore">
            <h4 className="font-bold text-background mb-4 text-sm">Explore</h4>
            <ul className="space-y-2.5">
              {footerLinks.explore.map((link) => (
                <li key={link.label}>
                  <Link to={link.href} className="text-background/70 hover:text-accent transition-colors text-sm">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Resources">
            <h4 className="font-bold text-background mb-4 text-sm">Resources</h4>
            <ul className="space-y-2.5">
              {footerLinks.resources.map((link) => (
                <li key={link.label}>
                  <Link to={link.href} className="text-background/70 hover:text-accent transition-colors text-sm">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Company">
            <h4 className="font-bold text-background mb-4 text-sm">Company</h4>
            <ul className="space-y-2.5">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <Link to={link.href} className="text-background/70 hover:text-accent transition-colors text-sm">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Legal">
            <h4 className="font-bold text-background mb-4 text-sm">Legal</h4>
            <ul className="space-y-2.5">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <Link to={link.href} className="text-background/70 hover:text-accent transition-colors text-sm">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-background/10">
        <div className="container py-4 md:py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs md:text-sm text-background/70">
            © {new Date().getFullYear()} DekhoCampus. Made with ❤️ for students in India
          </p>
          <div className="flex items-center gap-3 flex-wrap justify-center">
            <a
              href="#google-reviews"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/10 hover:bg-background/15 transition-colors"
              aria-label="4.9 star Google reviews"
            >
              <GoogleGLogo className="w-4 h-4" />
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="text-xs font-bold text-background">4.9</span>
              <span className="text-[10px] text-background/70 hidden sm:inline">Google Rating</span>
            </a>
            <div className="flex items-center gap-2.5">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  className="w-9 h-9 rounded-lg bg-background/10 flex items-center justify-center hover:bg-accent hover:text-foreground transition-colors"
                  aria-label={social.label}
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
