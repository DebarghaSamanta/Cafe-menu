import { Link } from "react-router-dom";
import {
  ShieldCheck,
  QrCode,
  ArrowRight,
  Sparkles,
  Clock,
  MapPin,
  Heart,
  Award,
  Flame,
  Smartphone,
  CheckCircle2,
} from "lucide-react";
import ArtisanLogo from "../components/ArtisanLogo";
import "./LandingPage.css";

export default function LandingPage() {
  const SIGNATURES = [
    {
      id: "s1",
      name: "Hazelnut Cortado",
      category: "Specialty Espresso",
      price: "₹160",
      desc: "Equal parts double ristretto and silky steamed milk infused with roasted Piedmont hazelnut.",
      tag: "Barista Pick",
      image: "https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=600&q=80",
      rotation: "-2.8deg",
      offsetY: "10px",
      tapeRotation: "-15deg",
    },
    {
      id: "s2",
      name: "Cold Brew Tonic",
      category: "Signature Cold",
      price: "₹180",
      desc: "18-hour single-origin cold drip topped with crisp botanical tonic and dehydrated Valencia orange.",
      tag: "Seasonal",
      image: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80",
      rotation: "2.2deg",
      offsetY: "-12px",
      tapeRotation: "8deg",
    },
    {
      id: "s3",
      name: "Basque Burnt Cheesecake",
      category: "Artisan Bakes",
      price: "₹240",
      desc: "Caramelized deeply on top with a silky, rich molten cream cheese center baked daily.",
      tag: "House Special",
      image: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=600&q=80",
      rotation: "-1.8deg",
      offsetY: "16px",
      tapeRotation: "-6deg",
    },
    {
      id: "s4",
      name: "Truffle Mushroom Brioche",
      category: "Savoury Kitchen",
      price: "₹290",
      desc: "Sautéed wild forest mushrooms on house-toasted butter brioche with black truffle oil.",
      tag: "Chef's Choice",
      image: "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=600&q=80",
      rotation: "3.2deg",
      offsetY: "-8px",
      tapeRotation: "12deg",
    },
  ];

  return (
    <div className="landing-root">
      {/* ── Top Navigation Bar ── */}
      <header className="landing-nav">
        <div className="landing-nav-container">
          <Link to="/" className="landing-brand">
            <div className="landing-brand-crest">
              <ArtisanLogo size={22} color="#FFFFFF" />
            </div>
            <div className="landing-brand-text">
              <span className="landing-brand-title">The Artisan Café</span>
              <span className="landing-brand-sub">EST. 2024 &bull; 18 PARK STREET</span>
            </div>
          </Link>

          <nav className="landing-nav-links">
            <a href="#about" className="landing-nav-link">Our Craft</a>
            <a href="#menu-highlights" className="landing-nav-link">Signatures</a>
            <a href="#qr-experience" className="landing-nav-link">QR Dining</a>
            <a href="#visit" className="landing-nav-link">Visit Us</a>
          </nav>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section className="landing-hero">
        <div className="landing-hero-backdrop" />
        <div className="landing-hero-container">
          {/* Badge */}
          <div className="landing-hero-badge">
            <Sparkles size={13} color="var(--cafe-terracotta)" />
            <span>SPECIALTY ROASTERS &bull; KOLKATA</span>
          </div>

          {/* Grand Headline */}
          <h1 className="landing-hero-headline">
            Where Every Cup Tells a Story of Craft &amp; Care.
          </h1>

          {/* Subtitle */}
          <p className="landing-hero-sub">
            Slow-extracted single-origin Arabica, hand-laminated European pastries,
            and seamless contactless table-side ordering in the heart of Park Street.
          </p>

          {/* Actions */}
          <div className="landing-hero-actions">
            <Link to="/menu" className="landing-cta-primary">
              <ArtisanLogo size={18} color="#FFFFFF" />
              <span>Explore Menu &amp; Prices</span>
              <ArrowRight size={16} />
            </Link>

            <Link to="/login" className="landing-cta-admin">
              <ShieldCheck size={18} />
              <span>Admin Login / Sign Up</span>
            </Link>
          </div>

          {/* Trust Highlights */}
          <div className="landing-hero-stats">
            <div className="landing-stat-item">
              <span className="landing-stat-num">100%</span>
              <span className="landing-stat-label">Shade-Grown Arabica</span>
            </div>
            <div className="landing-stat-divider" />
            <div className="landing-stat-item">
              <span className="landing-stat-num">4.9★</span>
              <span className="landing-stat-label">Guest Rating</span>
            </div>
            <div className="landing-stat-divider" />
            <div className="landing-stat-item">
              <span className="landing-stat-num">Live</span>
              <span className="landing-stat-label">Contactless QR Ordering</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pillars / Features Section ── */}
      <section id="about" className="landing-section">
        <div className="landing-container">
          <div className="landing-section-header">
            <span className="landing-eyebrow">OUR PHILOSOPHY</span>
            <h2 className="landing-section-title">Rooted in Heritage. Brewed with Precision.</h2>
            <p className="landing-section-desc">
              We believe a café should be a sanctuary—a place where time slows down and every flavor is intentional.
            </p>
          </div>

          <div className="landing-grid-3">
            {/* Pillar 1 */}
            <div className="landing-craft-card">
              <div className="landing-craft-media">
                <img
                  src="https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=700&q=80"
                  alt="Single Origin Pour Over"
                  className="landing-craft-img"
                  loading="lazy"
                />
                <div className="landing-craft-badge">01 &bull; SOURCING</div>
              </div>
              <div className="landing-craft-content">
                <div className="landing-craft-icon-wrap">
                  <Flame size={20} color="var(--cafe-terracotta)" />
                </div>
                <h3 className="landing-craft-title">Direct-Trade Single Origins</h3>
                <p className="landing-craft-body">
                  Sourced sustainably from high-altitude estates in Chikmagalur and Yirgacheffe. Roasted in small batches weekly for peak aromatics and floral sweetness.
                </p>
                <div className="landing-craft-tags">
                  <span className="landing-craft-tag">Chikmagalur Estates</span>
                  <span className="landing-craft-tag">Weekly Roasts</span>
                </div>
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="landing-craft-card">
              <div className="landing-craft-media">
                <img
                  src="https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=700&q=80"
                  alt="House Laminated Croissants"
                  className="landing-craft-img"
                  loading="lazy"
                />
                <div className="landing-craft-badge">02 &bull; VIENNOISERIE</div>
              </div>
              <div className="landing-craft-content">
                <div className="landing-craft-icon-wrap">
                  <Award size={20} color="var(--cafe-terracotta)" />
                </div>
                <h3 className="landing-craft-title">House-Laminated Bakes</h3>
                <p className="landing-craft-body">
                  Our viennoiserie is rolled with French AOP butter over 72 hours. From flaky honeycomb croissants to rich sourdough toasties, baked fresh every sunrise.
                </p>
                <div className="landing-craft-tags">
                  <span className="landing-craft-tag">French AOP Butter</span>
                  <span className="landing-craft-tag">72-Hour Lamination</span>
                </div>
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="landing-craft-card">
              <div className="landing-craft-media">
                <img
                  src="https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=700&q=80"
                  alt="Artisan Table Service"
                  className="landing-craft-img"
                  loading="lazy"
                />
                <div className="landing-craft-badge">03 &bull; HOSPITALITY</div>
              </div>
              <div className="landing-craft-content">
                <div className="landing-craft-icon-wrap">
                  <QrCode size={20} color="var(--cafe-terracotta)" />
                </div>
                <h3 className="landing-craft-title">Frictionless QR Table Dining</h3>
                <p className="landing-craft-body">
                  No waiting for paper menus. Simply scan the brass QR code at your table to customize milk, sweetness, and extras, and place your ticket straight to the kitchen.
                </p>
                <div className="landing-craft-tags">
                  <span className="landing-craft-tag">Contactless Ordering</span>
                  <span className="landing-craft-tag">Live Kitchen Milestones</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Signature Selections Strip ── */}
      <section id="menu-highlights" className="landing-section landing-section-alt">
        <div className="landing-container">
          <div className="landing-section-header">
            <span className="landing-eyebrow">BARISTA &amp; KITCHEN PICKS</span>
            <h2 className="landing-section-title">Signature House Creations</h2>
            <p className="landing-section-desc">
              A curated selection of our most loved preparations, hand-crafted to order.
            </p>
          </div>

          <div className="landing-album-board">
            {SIGNATURES.map((sig, idx) => (
              <div
                key={sig.id}
                className="landing-album-card"
                style={{
                  "--card-rot": sig.rotation,
                  "--card-offset-y": sig.offsetY,
                  "--tape-rot": sig.tapeRotation,
                  zIndex: idx + 1,
                }}
              >
                {/* Washi Tape Strip */}
                <div className="landing-album-tape" />

                {/* Polaroid Photo Frame */}
                <div className="landing-album-photo-wrap">
                  <img
                    src={sig.image}
                    alt={sig.name}
                    className="landing-album-img"
                    loading="lazy"
                  />
                  <span className="landing-album-tag">{sig.tag}</span>
                </div>

                {/* Album Card Caption & Details */}
                <div className="landing-album-caption">
                  <div className="landing-album-header">
                    <div>
                      <h3 className="landing-album-title">{sig.name}</h3>
                      <span className="landing-album-cat">{sig.category}</span>
                    </div>
                    <div className="landing-album-price">{sig.price}</div>
                  </div>
                  <p className="landing-album-desc">{sig.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── QR Table Dining Experience ── */}
      <section id="qr-experience" className="landing-section">
        <div className="landing-container">
          <div className="landing-qr-banner">
            <div className="landing-qr-text">
              <span className="landing-eyebrow">TABLE-SIDE SERVICE</span>
              <h2 className="landing-banner-title">At Your Table? Simply Scan.</h2>
              <p className="landing-banner-desc">
                Every table at The Artisan Café is equipped with a handcrafted wooden QR plaque. Scan with your camera to customize milk, sweetness, and extras, send tickets directly to the barista, and track preparation milestones in real time.
              </p>

              {/* 3-Step Micro Workflow */}
              <div className="landing-qr-steps">
                <div className="landing-qr-step">
                  <div className="landing-step-num">1</div>
                  <div>
                    <strong className="landing-step-heading">Scan Table QR</strong>
                    <span className="landing-step-detail">Instant live menu on phone</span>
                  </div>
                </div>

                <div className="landing-qr-step">
                  <div className="landing-step-num">2</div>
                  <div>
                    <strong className="landing-step-heading">Customize &amp; Order</strong>
                    <span className="landing-step-detail">Direct to barista station</span>
                  </div>
                </div>

                <div className="landing-qr-step">
                  <div className="landing-step-num">3</div>
                  <div>
                    <strong className="landing-step-heading">Settle Digitally</strong>
                    <span className="landing-step-detail">UPI, Card or Cash counter</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Brass & Wood QR Plaque Visual */}
            <div className="landing-qr-visual">
              <div className="landing-qr-plaque">
                <div className="landing-qr-plaque-inner">
                  <ArtisanLogo size={36} color="var(--cafe-roast-primary)" />
                  <div className="landing-qr-table-num">TABLE 04</div>
                  <div className="landing-qr-code-box">
                    <QrCode size={110} color="var(--cafe-roast-primary)" />
                  </div>
                  <span className="landing-qr-scan-hint">SCAN TO ORDER</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Rich European Sanctuary Footer & Visit Section ── */}
      <footer id="visit" className="landing-footer">
        <div className="landing-container">
          <div className="landing-footer-grid">
            {/* Column 1: Brand & Heritage */}
            <div className="landing-footer-col">
              <div className="landing-footer-brand-header">
                <div className="landing-footer-crest">
                  <ArtisanLogo size={24} color="#FFFFFF" />
                </div>
                <div>
                  <h3 className="landing-footer-brand-title">The Artisan Café</h3>
                  <span className="landing-footer-brand-sub">EST. 2024 &bull; PARK STREET</span>
                </div>
              </div>
              <p className="landing-footer-about">
                A specialty roastery and European bakery dedicated to slow extraction, single-origin terroir, and mindful hospitality on Kolkata's historic Heritage Row.
              </p>
              <div className="landing-footer-badge">
                <Sparkles size={12} color="var(--cafe-terracotta)" />
                <span>SHADE-GROWN ARABICA &bull; 100% IN-HOUSE ROASTED</span>
              </div>
            </div>

            {/* Column 2: Sanctuary Hours & Hospitality */}
            <div className="landing-footer-col">
              <h4 className="landing-footer-heading">Sanctuary Hours</h4>
              <ul className="landing-footer-list">
                <li className="landing-footer-list-item">
                  <Clock size={16} color="var(--cafe-terracotta)" />
                  <div>
                    <strong>Monday &ndash; Sunday</strong>
                    <span>08:00 AM &ndash; 11:00 PM</span>
                  </div>
                </li>
                <li className="landing-footer-list-item">
                  <Heart size={16} color="var(--cafe-terracotta)" />
                  <div>
                    <strong>Hospitality &amp; Space</strong>
                    <span>Dine-in &bull; Takeaway &bull; High-Speed Wi-Fi &bull; Pet Friendly</span>
                  </div>
                </li>
              </ul>
            </div>

            {/* Column 3: Location & Table Inquiries */}
            <div className="landing-footer-col">
              <h4 className="landing-footer-heading">Find Our Sanctuary</h4>
              <ul className="landing-footer-list">
                <li className="landing-footer-list-item">
                  <MapPin size={16} color="var(--cafe-terracotta)" />
                  <div>
                    <strong>18 Park Street, Heritage Row</strong>
                    <span>Kolkata, West Bengal 700016</span>
                  </div>
                </li>
                <li className="landing-footer-list-item">
                  <Sparkles size={16} color="var(--cafe-terracotta)" />
                  <div>
                    <strong>Specialty Roastery &amp; Bakery</strong>
                    <span>Direct trade sourcing &bull; Small batch roasting</span>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Copyright & Fine Print Bar */}
          <div className="landing-footer-bottom">
            <p className="landing-footer-copy">
              &copy; {new Date().getFullYear()} The Artisan Café Roasters. All rights reserved. Hand-roasted with intention in Kolkata.
            </p>
            <div className="landing-footer-fine-links">
              <Link to="/menu">Digital Menu</Link>
              <Link to="/login">Admin Sign In</Link>
              <a href="#about">Our Philosophy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
