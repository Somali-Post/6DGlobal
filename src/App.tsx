import { lazy, MouseEvent, ReactNode, Suspense, useEffect, useRef, useState } from "react";
import CursorGrid from "./components/CursorGrid";
import { MapLoadingScreen } from "./components/MapLoadingScreen";
import { NoWrap6D, renderNoWrap6D } from "./components/NoWrap6D";
import { AddressingProblemSection } from "./components/sections/AddressingProblemSection";
import { ExamplesSection } from "./components/sections/ExamplesSection";
import { localityMattersExample } from "./data/localityMattersExample";

const FindPage = lazy(() => import("./pages/FindPage"));

const navItems = [
  {
    id: "how-it-works",
    label: "How it works",
    href: "#how-it-works",
    activeFor: ["problem", "how-it-works"],
  },
  {
    id: "examples",
    label: "Examples",
    href: "#examples",
    activeFor: ["examples"],
  },
  {
    id: "locality",
    label: "Locality",
    href: "#locality",
    activeFor: ["locality"],
  },
  {
    id: "use-cases",
    label: "Use cases",
    href: "#somalia-use-case",
    activeFor: ["somalia-use-case", "applications", "proposition", "team"],
  },
  {
    id: "faq",
    label: "FAQ",
    href: "#faq",
    activeFor: ["faq"],
  },
  {
    id: "contact",
    label: "Contact",
    href: "#contact",
    activeFor: ["contact"],
  },
];

const observedSectionIds = [
  "top",
  "problem",
  "how-it-works",
  "examples",
  "locality",
  "somalia-use-case",
  "applications",
  "proposition",
  "team",
  "faq",
  "contact",
];

const faqGroups = [
  {
    label: "Basics",
    items: [
      {
        question: "Is each 6D Address code unique?",
        answer: "Not without a locality. The six digits are a geographic reference based on the 2nd, 3rd and 4th decimal places of the latitude and longitude coordinates.",
      },
      {
        question: "Why is locality required?",
        answer: "6D Address is designed to fit within a conventional addressing system. The 6D Address code effectively replaces the property number and street name elements of a conventional address. Therefore, the locality is a key element of the address.",
      },
      {
        question: "What are latitude and longitude?",
        answer: "Latitude and longitude have existed for thousands of years as a means of determining a location. 6D Address is simply a reconfiguration of part of the latitude and longitude coordinates, making it far less complex than other digital address systems.",
      },
      {
        question: "Do I need GPS?",
        answer: "GPS, survey coordinates, or another coordinate source is needed to create the reference. A user can still place a pin manually.",
      },
      {
        question: "Do I need an app?",
        answer: "No single app should be compulsory. Websites, mobile apps, delivery tools and government systems can implement the method.",
      },
    ],
  },
  {
    label: "Accuracy and addressing",
    items: [
      {
        question: "How precise is 6D Address?",
        answer: "The 6D Address is accurate to approximately 10m². In the 6D Address 20-30-40, the 20 is approximately 1km², the 30 is approximately 100m² and the 40 is approximately 10m².",
      },
      {
        question: "Why approximately 10m²?",
        answer: "Because 6D Address is derived from latitude and longitude, the squares formed by the three sets of two digits are trapeziums, although on a map they may appear square or rectangular in shape. Other systems divide the earth into exact squares, but a globe cannot be created using squares.",
      },
      {
        question: "How does 6D Address manage vertical addresses?",
        answer: "In the same way conventional addresses manage vertical addressing. In a ten-storey block of 40 apartments, each apartment would be recognised by its apartment number before the 6D Address and locality line.",
      },
      {
        question: "Can 6D Address be used in uninhabited areas?",
        answer: "Technically, 6D Address can be used anywhere on earth. However, it needs a locality to provide a unique address. The 1st decimal place from the latitude and longitude coordinates can be used to create a regional code, which extends the scope of the 6D Address to 100km², and the 5th decimal place can be used to increase accuracy to 1m². These would only be required in exceptional circumstances.",
      },
      {
        question: "Why didn't you use the 1st and 5th decimals to create a 10D Address?",
        answer: "Because it is much more difficult to remember than six digits. In most parts of the world, the existing locality information is detailed enough to ensure there is no duplication of a 6D Address within its boundaries. Current GPS data usually works to around 10m accuracy, so there is limited benefit in being more accurate for normal addressing. For certain applications, 1m² accuracy could be beneficial, such as identifying electricity, gas and water points.",
      },
    ],
  },
  {
    label: "Implementation",
    items: [
      {
        question: "Can it work offline?",
        answer: "The code can be calculated offline from coordinates. Search, maps and locality datasets may need cached or local data.",
      },
      {
        question: "Does 6D operate a central database?",
        answer: "The method does not require one central database to create addresses. Organisations may maintain their own registers for pilots or operations.",
      },
      {
        question: "Can another company build a compatible app?",
        answer: "Yes. The system is intended for independent compatible implementations.",
      },
    ],
  },
  {
    label: "Governance and limitations",
    items: [
      {
        question: "Where does 6D not work well?",
        answer: "It is weaker in uninhabited places, areas with no meaningful locality, or situations requiring a globally unique standalone code.",
      },
      {
        question: "Who governs the method or system?",
        answer: "Governance should be clear, documented and practical enough for public-sector, developer and community use.",
      },
    ],
  },
];

const applicationGroups = [
  {
    label: "Public infrastructure",
    items: [
      {
        title: "National addressing support",
        body: "6D can support national addressing programmes by providing a practical location reference in areas where property numbers or named streets are incomplete.",
      },
      {
        title: "Public registries and ID systems",
        body: "Government systems may use 6D as an additional location reference for service delivery or registration, where appropriate governance, privacy and verification rules are in place.",
      },
    ],
  },
  {
    label: "Service delivery",
    items: [
      {
        title: "Utility services",
        body: "Utility providers can use 6D-style location references to identify service points, assets or customer locations where conventional addresses are unavailable.",
      },
      {
        title: "Humanitarian and disaster response",
        body: "In humanitarian or disaster-response settings, 6D can help identify agreed locations for service delivery, aid distribution or field coordination when used with verified local context.",
      },
    ],
  },
  {
    label: "Digital access",
    items: [
      {
        title: "Digital address services",
        body: "6D can help create a simple digital address that works with existing locality information and can be shared through mobile or web services.",
      },
      {
        title: "Financial inclusion",
        body: "Banks, mobile-money providers and financial institutions may use location references to support customer registration, service access and location verification, subject to local rules and safeguards.",
      },
      {
        title: "Underserved settlements",
        body: "6D can support addressability in informal or underserved settlements where residents use local names and landmarks but formal property addressing is incomplete.",
      },
    ],
  },
];

const teamMembers = [
  {
    initials: "GL",
    image: "/images/team/gl-360.webp",
    name: "Graeme Lee",
    role: "Addressing and postal development",
    bio: "Graeme developed the original 6D Address concept from his experience in postal-sector development and addressing challenges in countries where conventional addressing is incomplete.",
  },
  {
    initials: "AG",
    image: "/images/team/ag-360.webp",
    name: "Abdiaziz Ga'al",
    role: "Software implementation and product development",
    bio: "Abdiaziz brought the 6D Address concept to life through software development, map-based demonstrations and practical testing of the user experience.",
  },
  {
    initials: "SH",
    image: "/images/team/sh-360.webp",
    name: "Said Hassan",
    role: "Postal operations and Somalia use case",
    bio: "Said supports the Somalia use case through his role in the Somali National Postal Service Department, helping connect the concept to practical postal and addressing needs.",
  },
];

const propositionPillars = [
  {
    title: "The method",
    body: "A clear 6D format based on coordinate-derived digits and locality context. The method is being documented so compatible tools can implement it consistently.",
  },
  {
    title: "The tools",
    body: "A working map-based demonstration allows users to generate a 6D address, understand the format and see how locality completes the address.",
  },
  {
    title: "Implementation support",
    body: "Governments, postal operators and service providers can pilot 6D in a defined area before wider rollout, with support for address format design, testing, training and integration.",
  },
];

const partnerDeliverables = [
  "6D method explanation and technical specification",
  "Pilot area design",
  "Address format guidance",
  "Map/demo configuration",
  "Staff and stakeholder training",
  "Integration planning for postal, delivery or civic services",
  "Data governance and operational recommendations",
];

function App() {
  const [route, setRoute] = useState(() => window.location.pathname);

  useEffect(() => {
    const onPop = () => setRoute(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState(null, "", path);
    setRoute(window.location.pathname);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return route === "/find" || route === "/map" ? (
    <Suspense fallback={<MapLoadingScreen />}>
      <FindPage />
    </Suspense>
  ) : (
    <HomePage onFind={(autoLocate = true) => navigate(autoLocate ? "/find?locate=1" : "/find")} />
  );
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const media = window.matchMedia(query);
    const handleChange = () => setMatches(media.matches);
    handleChange();
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [query]);

  return matches;
}

function usePrefersReducedMotion() {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}

function useHeavyVisualState() {
  const [state, setState] = useState<"waiting" | "enabled" | "disabled">("waiting");

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;

    if (reducedMotion || connection?.saveData) {
      setState("disabled");
      return;
    }

    const load = () => setState("enabled");

    if ("requestIdleCallback" in window && "cancelIdleCallback" in window) {
      const idleWindow = window as Window & {
        requestIdleCallback: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
        cancelIdleCallback: (handle: number) => void;
      };
      const id = idleWindow.requestIdleCallback(load, { timeout: 1400 });
      return () => idleWindow.cancelIdleCallback(id);
    }

    const id = globalThis.setTimeout(load, 650);
    return () => globalThis.clearTimeout(id);
  }, []);

  return state;
}

function HomePage({ onFind }: { onFind: (autoLocate?: boolean) => void }) {
  const [active, setActive] = useState("top");
  const [menuOpen, setMenuOpen] = useState(false);
  const heroRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const sections = observedSectionIds
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActive(visible.target.id);
      },
      { rootMargin: "-28% 0px -58% 0px", threshold: [0.08, 0.16, 0.28, 0.42] },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <main>
      <Navigation active={active} menuOpen={menuOpen} setMenuOpen={setMenuOpen} onFind={() => onFind(true)} onNavigate={closeMenu} />

      <section id="top" className="hero section-dark" ref={heroRef}>
        <div className="hero-grid-layer" aria-hidden="true">
          <CursorGrid
            cellSize={50}
            color="#38D5FF"
            radius={140}
            falloff="smooth"
            holdTime={400}
            fadeDuration={800}
            lineWidth={1.2}
            maxOpacity={0.95}
            fillOpacity={0}
            gridOpacity={0.075}
            cellRadius={0}
            clickPulse
            pulseSpeed={600}
            trackTargetRef={heroRef}
          />
        </div>
        <div className="hero-shell">
          <div className="hero-copy hero-content reveal">
            <h1 className="hero-title">
              <span className="hero-title-primary nowrap-6d">6D Address</span>
              <span className="hero-title-secondary">Addressing the world</span>
              <span className="hero-title-secondary">in six digits</span>
            </h1>
            <p className="hero-subtitle">
              A memorable six-digit code generated from latitude and longitude coordinates, combined with existing locality
              information, provides accuracy within 10 metres.
            </p>
            <div className="hero-code-rhythm" aria-label="As easy as 10-20-30">
              <span className="hero-code-rhythm__label">As easy as </span>
              <span className="hero-code-rhythm__code" aria-hidden="true">
                <span className="code-pair code-pair--red">10</span>
                <span className="code-separator">-</span>
                <span className="code-pair code-pair--green">20</span>
                <span className="code-separator">-</span>
                <span className="code-pair code-pair--blue">30</span>
              </span>
            </div>
            <div className="actions hero-actions">
              <LiteButton className="button hero-cta hero-cta--primary" onClick={() => onFind(true)}>Find my <NoWrap6D /></LiteButton>
              <LiteButton className="button hero-cta hero-cta--secondary" href="#how-it-works">See how it works</LiteButton>
            </div>
          </div>
          <GlobeHeroVisual />
        </div>
      </section>

      <AddressingProblemSection />

      <section className="craft-section craft-section--blueprint craft-grid-bg how-created-section" id="how-it-works">
        <div className="craft-container">
          <HowItWorksSection />
        </div>
      </section>

      <ExamplesSection />

      <LocalityMattersSection />

      <SomaliaUseCaseSection />

      <PracticalApplicationsSection />

      <PropositionSection />

      <TeamSection />

      <FAQSection />

      <section id="contact" className="craft-section craft-section--dark craft-grid-bg craft-grid-bg--dark contact-chapter">
        <div className="craft-container">
          <div className="contact-chapter__grid">
            <header className="contact-chapter__header craft-reveal">
              <h2 className="display-section">Start a <NoWrap6D /> conversation</h2>
              <p className="craft-lead">
                For postal operators, public-sector teams, developers or service providers interested in the method,
                pilot design or implementation support.
              </p>

              <div className="contact-chapter__meta">
                <span>Open method</span>
                <span>Practical pilots</span>
                <span>Implementation support</span>
              </div>
            </header>

            <ContactForm />
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

function Navigation({
  active,
  menuOpen,
  setMenuOpen,
  onFind,
  onNavigate,
}: {
  active: string;
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  onFind: () => void;
  onNavigate: () => void;
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const updateScrolled = () => setScrolled(window.scrollY > 12);
    updateScrolled();
    window.addEventListener("scroll", updateScrolled, { passive: true });
    return () => window.removeEventListener("scroll", updateScrolled);
  }, []);

  const activeNavItem = navItems.find((item) => item.activeFor.includes(active));

  const renderLinks = () =>
    navItems.map((item) => {
      const isActive = activeNavItem?.id === item.id;

      return (
        <a
          key={item.id}
          className={`nav-link ${isActive ? "is-active" : ""}`}
          href={item.href}
          onClick={onNavigate}
          aria-current={isActive ? "page" : undefined}
        >
          {item.label}
        </a>
      );
    });

  return (
    <header className={`nav ${scrolled ? "scrolled" : ""} ${menuOpen ? "menu-open" : ""}`}>
      <a className="brand" href="#top" onClick={onNavigate} aria-label="6D Address home">
        <img src="/navlogo-320.webp" alt="6D Address" />
      </a>
      <nav className="nav-pill" aria-label="Primary navigation">{renderLinks()}</nav>
      <div className="nav-actions">
        <span className="method-badge"><span /> Open method</span>
        <LiteButton className="button primary nav-cta" onClick={onFind}>Find my 6D</LiteButton>
        <button
          className="menu-button"
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-controls="site-navigation"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
        >
          <span />
          <span />
        </button>
      </div>
      <nav className={`mobile-menu ${menuOpen ? "open" : ""}`} id="site-navigation" aria-label="Mobile navigation">
        {renderLinks()}
        <LiteButton
          className="button primary"
          onClick={() => {
            onNavigate();
            onFind();
          }}
        >
          Find my <NoWrap6D />
        </LiteButton>
      </nav>
    </header>
  );
}


function GlobeHeroVisual() {
  const globeRef = useRef<HTMLDivElement>(null);
  const heavyVisualState = useHeavyVisualState();
  const [globeReady, setGlobeReady] = useState(false);

  useEffect(() => {
    setGlobeReady(false);
    if (heavyVisualState !== "enabled") return;
    if (!globeRef.current) return;
    let readyTimer = 0;
    let cancelled = false;
    let destroyGlobe: (() => void) | undefined;
    const markReady = () => {
      if (cancelled) return;
      window.clearTimeout(readyTimer);
      readyTimer = window.setTimeout(() => setGlobeReady(true), 180);
    };

    void import("./globe/createGlobe").then(({ createHeroGlobe }) => {
      if (cancelled || !globeRef.current) return;

      const globe = createHeroGlobe({
        container: globeRef.current,
        rotationDuration: 50,
        initialLongitude: -150,
        globeScale: 1,
        horizontalOffset: 0.62,
        pointerTiltDegrees: 0,
        onReady: markReady,
      });

      destroyGlobe = globe.destroy;
    });

    return () => {
      cancelled = true;
      window.clearTimeout(readyTimer);
      destroyGlobe?.();
    };
  }, [heavyVisualState]);

  return (
    <div className="hero-visual hero-content" aria-hidden="true">
      <div className={`hero-globe-root ${globeReady ? "is-ready" : ""}`} ref={globeRef} />
    </div>
  );
}

function HowItWorksSection() {
  return (
    <div className="how-created__layout">
      <div className="how-created__copy">
        <h2 className="display-section craft-reveal">
          How <NoWrap6D /> is created
        </h2>

        <p className="how-created__colour-note craft-reveal">
          The <span className="digit-red">red</span>, <span className="digit-green">green</span> and{" "}
          <span className="digit-blue">blue</span> coordinates are combined to create the <NoWrap6D />
        </p>

        <p className="how-created__standards-note craft-reveal">
          Once the <NoWrap6D /> is created it is integrated with all available address information to provide a comprehensive address based on national standards
        </p>
      </div>

      <div className="how-created__right craft-reveal" aria-label="How 6D Address is created">
        <p className="how-created__right-intro">
          <NoWrap6D /> uses the 2nd, 3rd and 4th decimal places of latitude and longitude.
        </p>

        <div className="how-created__coordinate-box" aria-label="Latitude and longitude selected decimal places">
          <div className="how-created__coordinate-row">
            <span className="how-created__coordinate-label">Latitude:</span>
            <span className="how-created__coordinate-value" aria-label="7.879227 N">
              <span>7.8</span>
              <span className="digit-red">7</span>
              <span className="digit-green">9</span>
              <span className="digit-blue">2</span>
              <span>27 N</span>
            </span>
          </div>

          <div className="how-created__coordinate-row">
            <span className="how-created__coordinate-label">Longitude:</span>
            <span className="how-created__coordinate-value" aria-label="11.343555 W">
              <span>11.3</span>
              <span className="digit-red">4</span>
              <span className="digit-green">3</span>
              <span className="digit-blue">5</span>
              <span>55 W</span>
            </span>
          </div>
        </div>

        <article className="how-created__address-box" aria-label="Completed 6D Address">
          <ColouredCode code="74-93-25" />
          <address>
            <span>Ghebenderu</span>
            <span>Kenema District</span>
            <span>Eastern Province</span>
            <span>Sierra Leone</span>
          </address>
        </article>
      </div>
    </div>
  );
}

function ColouredCode({ code, className = "" }: { code: string; className?: string }) {
  const [red, green, blue] = code.split("-");

  return (
    <span className={`coloured-code ${className}`} aria-label={code}>
      <span className="code-red">{red}</span>
      <span className="code-sep">-</span>
      <span className="code-green">{green}</span>
      <span className="code-sep">-</span>
      <span className="code-blue">{blue}</span>
    </span>
  );
}

function LocalityMattersSection() {
  const { city, code, places } = localityMattersExample;
  const mapBounds = { north: 51.57, south: 51.42, west: -0.39, east: -0.02 };
  const markerPosition = (latitude: number, longitude: number) => ({
    left: `${((longitude - mapBounds.west) / (mapBounds.east - mapBounds.west)) * 100}%`,
    top: `${((mapBounds.north - latitude) / (mapBounds.north - mapBounds.south)) * 100}%`,
  });

  return (
    <section id="locality" className="craft-section craft-section--dark craft-grid-bg craft-grid-bg--dark locality-proof">
      <div className="craft-container">
        <div className="locality-proof__grid">
          <header className="locality-proof__header craft-reveal">
            <h2 className="display-section">
              <span className="display-line">Same code.</span>
              <span className="display-line">Different localities.</span>
            </h2>
            <p className="craft-lead">
              A 6D code is a reference, not a complete address on its own. The same six digits can appear in different
              places. Locality is what makes the intended address clear.
            </p>
          </header>

          <figure className="locality-proof__visual craft-reveal">
            <div
              className="locality-map"
              role="group"
              aria-label={`London map showing ${places.map((place) => place.locality).join(", ")} sharing code ${code}`}
            >
              <div className="locality-map__header">
                <span>One shared reference across London</span>
                <ColouredCode code={code} />
              </div>

              <div className="locality-map__canvas">
                <svg className="locality-map__basemap" viewBox="0 0 1000 580" preserveAspectRatio="none" aria-hidden="true">
                  <path className="locality-map__boundary" d="M54 84 196 34 390 58 528 24 718 54 928 112 964 254 926 430 772 528 568 548 382 516 186 542 62 438 34 268Z" />
                  <g className="locality-map__roads">
                    <path d="M44 182C214 224 346 198 500 112S792 112 958 176" />
                    <path d="M22 384C190 306 344 314 496 390S776 486 980 414" />
                    <path d="M148 18C236 150 304 284 302 560" />
                    <path d="M510 8C486 150 520 306 566 572" />
                    <path d="M818 48C738 202 724 346 776 554" />
                    <path d="M92 506 902 74" />
                    <path d="M88 82 924 506" />
                  </g>
                  <path className="locality-map__ring-road" d="M174 286C174 144 326 78 496 82S826 158 828 292 688 500 504 498 174 426 174 286Z" />
                  <path className="locality-map__river" d="M-30 354C92 300 174 398 286 356S470 292 564 350 702 422 790 378 910 310 1030 354" />
                </svg>
                <span className="locality-map__city-label" aria-hidden="true">London</span>

                {places.map((place) => (
                  <div
                    className={`locality-map__marker is-${place.labelPosition} is-${place.labelAlign}`}
                    style={markerPosition(place.latitude, place.longitude)}
                    key={place.locality}
                  >
                    <span className="locality-map__pin" aria-hidden="true" />
                    <span className="locality-map__callout">
                      <strong>{place.locality}</strong>
                      <span aria-hidden="true">
                        <ColouredCode code={code} className="coloured-code--compact" />
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <figcaption>
              Example locations in {city} sharing the same reference.
            </figcaption>
          </figure>

        </div>
      </div>
    </section>
  );
}

function SomaliaUseCaseSection() {
  return (
    <section id="somalia-use-case" className="craft-section craft-section--warm somalia-case">
      <div className="craft-container">
        <div className="somalia-case__layout">
          <header className="somalia-case__copy craft-reveal">
            <h2 className="display-section">Somalia Use Case</h2>
            <div className="somalia-case__narrative">
              <p>
                Somalia provides a practical example of how <NoWrap6D /> can be incorporated into an address format as the
                second line of the address.
              </p>
              <p>
                With or without a property number and street name, <NoWrap6D /> can provide a precise last-mile location
                reference when combined with existing locality information.
              </p>
            </div>
          </header>

          <div className="somalia-case__right craft-reveal">
            <article className="somalia-case__format-panel" aria-labelledby="somalia-format-title">
              <h3 id="somalia-format-title">The <NoWrap6D /> code is incorporated into existing address details</h3>
              <ul className="somalia-case__format-list">
                <li><span>Property number and street name</span></li>
                <li><span><NoWrap6D /> and locality</span></li>
                <li><span>District / town / city</span></li>
                <li><span>Region</span></li>
                <li><span>Country</span></li>
              </ul>
            </article>

            <div className="somalia-case__example-grid" aria-label="Somalia address format examples">
              <article className="somalia-case__example-card">
                <h3>Example with street context</h3>
                <SomaliaAddressLines
                  lines={["24 Isbarbardhig Road", "35-12-12 Halane", "Mogadishu", "Banaadir", "Somalia"]}
                />
              </article>

              <article className="somalia-case__example-card">
                <h3>Example without street context</h3>
                <SomaliaAddressLines
                  lines={["Un-named street", "35-12-12 Halane", "Mogadishu", "Banaadir", "Somalia"]}
                />
              </article>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SomaliaAddressLines({ lines }: { lines: string[] }) {
  return (
    <address className="somalia-case__address">
      {lines.map((line) => {
        const match = line.match(/^(\d{2}-\d{2}-\d{2})\s+(.+)$/);
        return (
          <span className={match ? "somalia-case__code-line" : undefined} key={line}>
            {match ? (
              <>
                <ColouredCode code={match[1]} className="coloured-code--compact" />
                <strong>{match[2]}</strong>
              </>
            ) : line}
          </span>
        );
      })}
    </address>
  );
}

function PracticalApplicationsSection() {
  return (
    <section id="applications" className="craft-section craft-section--blueprint craft-grid-bg applications-index">
      <div className="craft-container">
        <div className="applications-index__grid">
          <header className="applications-index__header craft-reveal">
            <h2 className="display-section">Where 6D can help</h2>
            <p className="craft-lead">
            <NoWrap6D /> can support services that need a simple, shareable location reference where formal addressing is
            incomplete. The strongest applications are those that work with existing locality information rather than
            replacing it.
          </p>
          </header>

          <div className="applications-index__matrix craft-reveal">
            {applicationGroups.map((group, groupIndex) => (
              <section className="application-group" key={group.label} aria-labelledby={`application-group-${groupIndex}`}>
                <h3 id={`application-group-${groupIndex}`}>{group.label}</h3>

                <div className="application-group__items">
                  {group.items.map((item, itemIndex) => (
                    <article className="application-row" key={item.title}>
                      <span className="application-row__number">
                        {String(groupIndex + 1).padStart(2, "0")}.{String(itemIndex + 1).padStart(2, "0")}
                      </span>
                      <div className="application-row__content">
                        <h4>{item.title}</h4>
                        <p>{item.body}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <p className="applications-index__note craft-reveal">
          Each use case requires local validation, data governance and clear institutional ownership before operational
          deployment.
        </p>
        </div>
      </div>
    </section>
  );
}

function PropositionSection() {
  return (
    <section id="proposition" className="craft-section craft-section--dark craft-grid-bg craft-grid-bg--dark proposition-chapter">
      <div className="craft-container">
        <div className="proposition-chapter__grid">
          <header className="proposition-chapter__header craft-reveal">
            <h2 className="display-section">An open addressing method, supported by practical implementation tools.</h2>
            <p className="craft-lead">
            <NoWrap6D /> provides a simple way to create a short location reference from latitude and longitude, then
            combine it with the locality information people already use. The method can support postal, civic, delivery
            and digital services in places where formal property addressing is incomplete.
          </p>
          </header>

          <aside className="proposition-chapter__partner craft-panel craft-panel--dark craft-reveal" aria-labelledby="partner-receive-title">
            <span className="proposition-chapter__meta">Partner package</span>
            <h3 id="partner-receive-title">What partners can receive</h3>
            <ul>
              {partnerDeliverables.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </aside>

          <div className="proposition-chapter__pillars craft-reveal" aria-label="6D proposition pillars">
            {propositionPillars.map((pillar, index) => (
              <article className="proposition-pillar" key={pillar.title}>
                <span className="proposition-pillar__number">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{pillar.title}</h3>
                  <p>{pillar.body}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="proposition-chapter__close craft-reveal">
            <p>The aim is not to replace local addressing systems. It is to make them easier to complete, share and use.</p>
            <a className="craft-button craft-button--primary" href="#contact">Discuss a pilot</a>
          </div>
        </div>
      </div>
    </section>
  );
}

function TeamSection() {
  return (
    <section id="team" className="craft-section craft-section--warm team-editorial">
      <div className="craft-container">
        <div className="team-editorial__grid">
          <header className="team-editorial__header craft-reveal">
            <h2 className="display-section">Our <NoWrap6D /> team</h2>
            <p className="craft-lead">
            <NoWrap6D /> is being developed by a small founding team with experience in postal development, software
            implementation and addressing systems. The team is working to document the method, test practical use cases
            and engage partners who can help develop compatible implementations.
          </p>
          </header>

          <div className="team-editorial__list craft-reveal" aria-label="6D Address founding team">
          {teamMembers.map((member, index) => (
            <article className="team-editorial__member" key={member.name}>
              <div className="team-editorial__mark" aria-hidden="true">
                <img src={member.image} alt="" loading="lazy" />
              </div>
              <div className="team-editorial__content">
                <span className="team-editorial__index">{String(index + 1).padStart(2, "0")}</span>
                <h3>{member.name}</h3>
                <p className="team-editorial__role">{member.role}</p>
                <p className="team-editorial__bio">{renderNoWrap6D(member.bio)}</p>
              </div>
            </article>
          ))}
          </div>

          <p className="team-editorial__closing craft-reveal">
          The team is now focused on refining the method, preparing documentation and engaging partners for practical
          pilots.
        </p>
        </div>
      </div>
    </section>
  );
}

function FAQSection() {
  const [activeFaqGroup, setActiveFaqGroup] = useState(0);
  const [openFaqKey, setOpenFaqKey] = useState("0-0");

  const selectFaqGroup = (groupIndex: number) => {
    setActiveFaqGroup(groupIndex);
    setOpenFaqKey(`${groupIndex}-0`);
  };

  const toggleFaqItem = (groupIndex: number, itemIndex: number) => {
    const key = `${groupIndex}-${itemIndex}`;
    setOpenFaqKey((current) => (current === key ? "" : key));
  };

  const activeGroup = faqGroups[activeFaqGroup];

  return (
    <section id="faq" className="craft-section craft-section--warm faq-chapter">
      <div className="craft-container">
        <div className="faq-chapter__grid">
          <header className="faq-chapter__header craft-reveal">
            <h2 className="display-section">Frequently asked questions</h2>
            <p className="craft-lead">
              <NoWrap6D /> only becomes unique when the locality is present. <NoWrap6D /> is a reconfiguration of latitude
              and longitude coordinates and repeats many times across a territory. But it never repeats across a locality.
            </p>

            <div className="faq-chapter__groups" aria-label="FAQ categories">
              {faqGroups.map((group, groupIndex) => (
                <button
                  className="faq-chapter__group-button"
                  type="button"
                  key={group.label}
                  aria-pressed={activeFaqGroup === groupIndex}
                  onClick={() => selectFaqGroup(groupIndex)}
                >
                  <span>{String(groupIndex + 1).padStart(2, "0")}</span>
                  {group.label}
                </button>
              ))}
            </div>
          </header>

          <div className="faq-chapter__accordion craft-reveal">
            <p className="faq-chapter__active-label">{activeGroup.label}</p>

            {activeGroup.items.map((item, itemIndex) => {
              const key = `${activeFaqGroup}-${itemIndex}`;
              const isOpen = openFaqKey === key;
              const answerId = `faq-panel-${key}`;
              const buttonId = `faq-button-${key}`;

            return (
              <article className="faq-item" key={item.question}>
                <button
                  className="faq-item__button"
                  type="button"
                  id={buttonId}
                  aria-expanded={isOpen}
                  aria-controls={answerId}
                  onClick={() => toggleFaqItem(activeFaqGroup, itemIndex)}
                >
                  <span>{renderNoWrap6D(item.question)}</span>
                  <span className="faq-item__indicator" aria-hidden="true">{isOpen ? "-" : "+"}</span>
                </button>
                <div className="faq-item__answer" id={answerId} role="region" aria-labelledby={buttonId} hidden={!isOpen}>
                  <p>{renderNoWrap6D(item.answer)}</p>
                </div>
              </article>
            );
          })}
          </div>
        </div>
      </div>
    </section>
  );
}

function ContactForm() {
  return (
    <form
      className="contact-form craft-reveal"
      name="contact"
      method="POST"
      data-netlify="true"
      netlify-honeypot="bot-field"
      action="/contact-thanks"
    >
      <input type="hidden" name="form-name" value="contact" />
      <p className="contact-form__hidden">
        <label>
          Do not fill this out if you are human:
          <input name="bot-field" />
        </label>
      </p>
      <div className="contact-form__row">
        <label><span>Name</span><input name="name" type="text" autoComplete="name" required /></label>
        <label><span>Organisation</span><input name="organisation" type="text" autoComplete="organization" /></label>
      </div>
      <label><span>Email</span><input name="email" type="email" autoComplete="email" required /></label>
      <label><span>Interest area</span><select name="interest" defaultValue="" required>
        <option value="" disabled>Select one</option>
        <option value="Pilot discussion">Pilot discussion</option>
        <option value="Postal or public-sector use">Postal or public-sector use</option>
        <option value="Developer / compatible tools">Developer / compatible tools</option>
        <option value="General enquiry">General enquiry</option>
      </select></label>
      <label><span>Message</span><textarea name="message" rows={5} required /></label>
      <LiteButton className="craft-button craft-button--primary" type="submit">Send enquiry</LiteButton>
    </form>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="craft-container site-footer__inner">
        <div className="site-footer__brand">
          <a href="#" className="site-footer__logo" aria-label="6D Address home"><NoWrap6D /></a>
          <p><NoWrap6D /> is being documented as an open addressing method.</p>
        </div>

        <nav className="site-footer__nav" aria-label="Footer navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#examples">Examples</a>
          <a href="#locality">Locality</a>
          <a href="#proposition">Proposition</a>
          <a href="#faq">FAQ</a>
          <a href="#contact">Contact</a>
        </nav>

        <div className="site-footer__meta">
          <span>© {new Date().getFullYear()} <NoWrap6D /></span>
          <span>Open method under documentation</span>
        </div>
      </div>
    </footer>
  );
}

function LiteButton({
  children,
  className = "",
  href,
  type = "button",
  onClick,
}: {
  children: ReactNode;
  className?: string;
  href?: string;
  type?: "button" | "submit" | "reset";
  onClick?: (event: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void;
}) {
  const handlePointerMove = (event: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--mx", `${event.clientX - rect.left}px`);
    event.currentTarget.style.setProperty("--my", `${event.clientY - rect.top}px`);
  };
  const classes = `${className} specular-lite`.trim();

  if (href) {
    return <a className={classes} href={href} onClick={onClick} onPointerMove={handlePointerMove}>{children}</a>;
  }

  return <button className={classes} type={type} onClick={onClick} onPointerMove={handlePointerMove}>{children}</button>;
}

export default App;
