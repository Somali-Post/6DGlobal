import { FormEvent, lazy, MouseEvent, ReactNode, Suspense, useEffect, useRef, useState } from "react";
import CursorGrid from "./components/CursorGrid";
import { MapLoadingScreen } from "./components/MapLoadingScreen";
import { GlobeLoader } from "./components/GlobeLoader";
import { NoWrap6D, renderNoWrap6D } from "./components/NoWrap6D";
import { AddressingProblemSection } from "./components/sections/AddressingProblemSection";
import { ApplicationsCarouselSection } from "./components/sections/ApplicationsCarouselSection";
import { ExamplesSection } from "./components/sections/ExamplesSection";
import LocalityLondonMap from "./components/sections/LocalityLondonMap";
import { PropositionSection } from "./components/sections/PropositionSection";

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
        answer: "Locality is key to determining the address. The 6D Address code effectively replaces the property number and street name of a conventional address – the components typically missing in developing countries.",
      },
      {
        question: "Do I need an app?",
        answer: "No. 6D Address is designed to sit within existing address structures, which would enable it to be a search function in any mapping tool.",
      },
      {
        question: "What are latitude and longitude?",
        answer: "Latitude and longitude have existed for thousands of years as a means of determining a location. 6D Address is simply a reconfiguration of their coordinates, making it far less complex than other digital address systems.",
      },
      {
        question: "Do I need GPS?",
        answer: "The Greek astronomer Hipparchus was using latitude and longitude coordinates over 2,100 years ago to determine location so GPS is only a practical requirement for determining a 6D Address.",
      },
    ],
  },
  {
    label: "Accuracy and Format",
    items: [
      {
        question: "How precise is 6D Address?",
        answer: "The 6D Address is accurate to an approximate 10m by 10m box. In the 6D Address 20-30-40, the 20 is an approximate 1km by 1km box, the 30 is an approximate 100m by 100m box and the 40 is an approximate 10m by 10m box.",
      },
      {
        question: "How does 6D Address manage vertical addresses?",
        answer: "In the same way conventional addresses manage vertical addressing. In a ten-storey block of 40 apartments, each apartment would be recognised by its apartment number before the 6D Address and locality line.",
      },
      {
        question: "Can 6D Address be used in uninhabited areas?",
        answer: "Yes it can, 6D Address can be used anywhere on earth. However, it needs a locality to provide a unique address, which may be an issue in truly uninhabited areas.",
      },
      {
        question: "Why didn't you use the 1st and 5th decimals to create a 10D Address?",
        answer: "They are simply not required. The 6D Address and locality provide sufficient information to reach any given point. That said, the 5th decimal could be used for specific solutions such as locating utility access points such as gas and electricity points, fire hydrants and other street and non-street furniture.",
      },
    ],
  },
  {
    label: "Technical",
    items: [
      {
        question: "Where does 6D not work well?",
        answer: "It is weaker in uninhabited regions without meaningful locality names.",
      },
      {
        question: "Can it be used in countries with sophisticated addressing systems?",
        answer: "Yes it can. It can act as an additional digital code within the existing address, and it can address any location without an official street address.",
      },
      {
        question: "Can it work offline?",
        answer: "The code can be calculated offline from coordinates. Search, maps and locality datasets need to be stored or cached in advance.",
      },
      {
        question: "Does 6D Address operate from a central database?",
        answer: "No it does not. Organisations are encouraged to develop their own registers suited to their requirements.",
      },
      {
        question: "Can another company build a compatible app?",
        answer: "Yes. The system is intended for independent compatible implementations.",
      },
      {
        question: "Who governs 6D Address?",
        answer: "6D Address is a registered trademark, for which we request a nominal annual licence fee to use.",
      },
    ],
  },
];

const teamMembers = [
  {
    initials: "GL",
    image: "/images/team/gl-360.webp",
    name: "Graeme Lee",
    role: "INTERNATIONAL DEVELOPMENT",
    bio: "Graeme developed the 6D Address concept from his experience working in countries where conventional addressing is incomplete.",
  },
  {
    initials: "AG",
    image: "/images/team/ag-360.webp",
    name: "Abdiaziz Ga'al",
    role: "SOFTWARE DEVELOPMENT",
    bio: "Abdiaziz brought the 6D Address concept to life through software development, map-based demonstrations and practical testing of the user experience.",
  },
  {
    initials: "SH",
    image: "/images/team/sh-360.webp",
    name: "Said Hassan",
    role: "SOMALIA USE CASE",
    bio: "Said is responsible for implementing a national address system for the Government of Somalia and has incorporated 6D Address as a core component of the address format",
  },
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

    const isNarrowViewport = window.matchMedia("(max-width: 760px)").matches;
    const load = () => setState("enabled");

    // Give text, navigation and the lightweight hero shell priority on phones.
    // Desktop still starts the globe quickly, while narrow devices wait for an
    // idle slot (or a bounded timeout) before loading Three.js and textures.
    if ("requestIdleCallback" in window && "cancelIdleCallback" in window) {
      const idleWindow = window as Window & {
        requestIdleCallback: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
        cancelIdleCallback: (handle: number) => void;
      };
      const id = idleWindow.requestIdleCallback(load, { timeout: isNarrowViewport ? 1900 : 1100 });
      return () => idleWindow.cancelIdleCallback(id);
    }

    const id = globalThis.setTimeout(load, isNarrowViewport ? 900 : 450);
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

  useEffect(() => {
    let frame = 0;

    const navigateToHashTarget = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const rawId = window.location.hash.slice(1);
        if (!rawId) return;

        let id = rawId;
        try {
          id = decodeURIComponent(rawId);
        } catch {
          // Keep the raw fragment when it is not valid URI-encoded text.
        }

        const target = document.getElementById(id);
        if (!target) return;

        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
        target.focus({ preventScroll: true });
      });
    };

    navigateToHashTarget();
    window.addEventListener("hashchange", navigateToHashTarget);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", navigateToHashTarget);
    };
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <main>
      <Navigation active={active} menuOpen={menuOpen} setMenuOpen={setMenuOpen} onFind={() => onFind(true)} onNavigate={closeMenu} />

      <section id="top" className="hero section-dark" ref={heroRef} tabIndex={-1}>
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
              <LiteButton className="button hero-cta hero-cta--primary" href="#how-it-works">How it works</LiteButton>
            </div>
          </div>
          <GlobeHeroVisual />
        </div>
      </section>

      <AddressingProblemSection />

      <section className="craft-section craft-section--blueprint craft-grid-bg how-created-section" id="how-it-works" tabIndex={-1}>
        <div className="craft-container">
          <HowItWorksSection />
        </div>
      </section>

      <ExamplesSection />

      <LocalityMattersSection />

      <SomaliaUseCaseSection />

      <ApplicationsCarouselSection />

      <PropositionSection />

      <TeamSection />

      <FAQSection />

      <section id="contact" className="craft-section craft-section--dark craft-grid-bg craft-grid-bg--dark contact-chapter" tabIndex={-1}>
        <div className="craft-container">
          <div className="contact-chapter__grid">
            <header className="contact-chapter__header craft-reveal">
              <h2 className="display-section">Start a <NoWrap6D /> conversation</h2>
              <div className="contact-chapter__subtitle">
                <p>To see how <NoWrap6D /> can assist in:</p>
                <ul>
                  <li>Addressing the unaddressed</li>
                  <li>Connecting the disconnected</li>
                  <li>Facilitating social and economic development</li>
                </ul>
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
        <LiteButton className="button primary nav-cta" href="#contact" onClick={onNavigate}>Contact us</LiteButton>
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
        <LiteButton className="button primary" href="#contact" onClick={onNavigate}>Contact us</LiteButton>
      </nav>
    </header>
  );
}


function GlobeHeroVisual() {
  const globeRef = useRef<HTMLDivElement>(null);
  const heavyVisualState = useHeavyVisualState();
  const [globeReady, setGlobeReady] = useState(false);
  const [globeProgress, setGlobeProgress] = useState(0);
  const [globeFailed, setGlobeFailed] = useState(false);

  useEffect(() => {
    setGlobeReady(false);
    setGlobeProgress(0);
    setGlobeFailed(false);
    if (heavyVisualState !== "enabled") return;
    if (!globeRef.current) return;
    let cancelled = false;
    let destroyGlobe: (() => void) | undefined;
    const markReady = () => {
      if (cancelled) return;
      setGlobeProgress(100);
      setGlobeReady(true);
    };
    const markFailed = () => { if (!cancelled) setGlobeFailed(true); };

    void import("./globe/createGlobe").then(({ createHeroGlobe }) => {
      if (cancelled || !globeRef.current) return;

      const globe = createHeroGlobe({
        container: globeRef.current,
        rotationDuration: 160,
        initialLongitude: -150,
        globeScale: 1,
        horizontalOffset: 0.62,
        pointerTiltDegrees: 0,
        onProgress: (loaded, total) => {
          if (!cancelled) setGlobeProgress(Math.round((loaded / total) * 95));
        },
        onReady: markReady,
        onError: markFailed,
      });

      destroyGlobe = globe.destroy;
    }).catch(markFailed);

    return () => {
      cancelled = true;
      destroyGlobe?.();
    };
  }, [heavyVisualState]);

  return (
    <div className="hero-visual hero-content">
      {heavyVisualState === "disabled" && <div className="hero-globe-placeholder" aria-hidden="true" />}
      <div className={`hero-globe-root ${globeReady ? "is-ready" : ""}`} ref={globeRef} aria-hidden="true" />
      {!globeReady && heavyVisualState !== "disabled" && (
        <GlobeLoader className="hero-globe-loading" progress={globeProgress} failed={globeFailed} />
      )}
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
            <span className="how-created__coordinate-value" aria-label="11.275278 N">
              <span>11.2</span>
              <span className="digit-red">7</span>
              <span className="digit-green">5</span>
              <span className="digit-blue">2</span>
              <span>78 N</span>
            </span>
          </div>

          <div className="how-created__coordinate-row">
            <span className="how-created__coordinate-label">Longitude:</span>
            <span className="how-created__coordinate-value" aria-label="49.141389 E">
              <span>49.1</span>
              <span className="digit-red">4</span>
              <span className="digit-green">1</span>
              <span className="digit-blue">3</span>
              <span>89 E</span>
            </span>
          </div>
        </div>

        <article className="how-created__address-box" aria-label="Completed 6D Address">
          <ColouredCode code="74-51-23" />
          <address>
            <span>Bender Qassim International Airport</span>
            <span>Bosaso</span>
            <span>Bari</span>
            <span>Puntland</span>
            <span>Somalia</span>
          </address>
        </article>
        <aside className="how-created__action" aria-labelledby="try-sixd-heading">
          <div className="how-created__action-heading">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <circle cx="12" cy="12" r="7" />
              <circle cx="12" cy="12" r="2" />
              <path d="M12 1v5m0 12v5M1 12h5m12 0h5" />
            </svg>
            <h3 id="try-sixd-heading">What’s your 6D Address?</h3>
          </div>
          <p>Choose a location on the map to discover your 6D Address.</p>
          <a className="cta-action cta-action--blue" href="/find?locate=1">
            <span>Find my <NoWrap6D /></span><span className="cta-arrow" aria-hidden="true">→</span>
          </a>
        </aside>
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
  return (
    <section id="locality" className="craft-section craft-section--dark craft-grid-bg craft-grid-bg--dark locality-proof" tabIndex={-1}>
      <div className="craft-container">
        <div className="locality-proof__grid">
          <header className="locality-proof__header craft-reveal">
            <h2 className="display-section">
              <span className="display-line">Same code</span>
              <span className="display-line">Different</span>
              <span className="display-line">localities</span>
            </h2>
            <div className="locality-proof__message">
              <p>A 6D code is not a complete address</p>
              <p>The same 6D code appears multiple times</p>
              <p>Locality makes the <NoWrap6D /> unique</p>
            </div>
            <div className="locality-proof__cta">
              <p>Find out how <NoWrap6D /> can support your work.</p>
              <a className="cta-action cta-action--blue" href="#contact">
                <span>Get in touch</span><span className="cta-arrow" aria-hidden="true">→</span>
              </a>
            </div>
          </header>

          <LocalityLondonMap />

        </div>
      </div>
    </section>
  );
}

function SomaliaUseCaseSection() {
  return (
    <section id="somalia-use-case" className="craft-section craft-section--warm somalia-case" tabIndex={-1}>
      <div className="craft-container">
        <div className="somalia-case__layout">
          <header className="somalia-case__copy craft-reveal">
            <h2 className="display-section">Somalia Use Case</h2>
            <p>
              Somalia provides a practical example of how <NoWrap6D /> can be incorporated into an address format as the
              second line of the address.
            </p>
          </header>

          <article className="somalia-case__format-panel craft-reveal" aria-labelledby="somalia-format-title">
            <h3 id="somalia-format-title">The <NoWrap6D /> code is incorporated into existing address details</h3>
            <ul className="somalia-case__format-list">
              <li><span>Property number and street name</span></li>
              <li><span><NoWrap6D /> and locality</span></li>
              <li><span>District / town / city</span></li>
              <li><span>Region</span></li>
              <li><span>Country</span></li>
            </ul>
          </article>

          <div className="somalia-case__support craft-reveal">
            <p>
              With or without a property number and street name, <NoWrap6D /> can provide a precise last-mile location
              reference when combined with existing locality information.
            </p>
          </div>

          <div className="somalia-case__example-grid craft-reveal" aria-label="Somalia address format examples">
            <article className="somalia-case__example-card">
              <h3>Example with street context</h3>
              <SomaliaAddressLines
                lines={["24 Isbarbardhig Road", "35-12-12 Halane", "Mogadishu", "Banaadir", "Somalia"]}
              />
            </article>

            <article className="somalia-case__example-card">
              <h3>Example without street context</h3>
              <SomaliaAddressLines
                lines={["Un-named local road", "36-46-98 Gendershe", "Lower Shabeelle", "Somalia"]}
              />
            </article>
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

function TeamSection() {
  return (
    <section id="team" className="craft-section craft-section--warm team-editorial">
      <div className="craft-container">
        <div className="team-editorial__grid">
          <header className="team-editorial__header craft-reveal">
            <h2 className="display-section">Our <NoWrap6D /> team</h2>
            <p className="craft-lead">6D Address is being developed by a small team with experience in international development, software implementation and addressing systems. The team is working to document the method, test practical use cases and engage partners who can develop real world solutions.</p>
          </header>

          <div className="team-editorial__list craft-reveal" aria-label="6D Address founding team">
          {teamMembers.map((member) => (
            <article className="team-editorial__member" key={member.name}>
              <div className="team-editorial__mark" aria-hidden="true">
                <img src={member.image} alt="" loading="lazy" />
              </div>
              <div className="team-editorial__content">
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
    <section id="faq" className="craft-section craft-section--warm faq-chapter" tabIndex={-1}>
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
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const submissionId = useRef<string | null>(null);
  const isSubmitting = useRef(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting.current) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    submissionId.current ??= crypto.randomUUID();
    isSubmitting.current = true;
    setStatus("submitting");
    setErrorMessage("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          message: formData.get("message"),
          website: formData.get("website"),
          submissionId: submissionId.current,
        }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null) as { message?: string } | null;
        throw new Error(result?.message || "We couldn't send your message. Please try again.");
      }

      form.reset();
      submissionId.current = null;
      setStatus("success");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "We couldn't send your message. Please try again.");
      setStatus("error");
    } finally {
      isSubmitting.current = false;
    }
  };

  return (
    <form
      className="contact-form craft-reveal"
      name="contact"
      method="POST"
      action="/api/contact"
      onSubmit={handleSubmit}
      aria-describedby={status !== "idle" ? "contact-form-status" : undefined}
    >
      <p className="contact-form__hidden">
        <label>
          Do not fill this out if you are human:
          <input name="website" autoComplete="off" tabIndex={-1} />
        </label>
      </p>
      <label><span>Name</span><input name="name" type="text" autoComplete="name" maxLength={120} required /></label>
      <label><span>Email</span><input name="email" type="email" autoComplete="email" maxLength={254} required /></label>
      <label><span>Message</span><textarea name="message" rows={5} maxLength={5000} required /></label>
      <LiteButton className="craft-button craft-button--primary" type="submit" disabled={status === "submitting"}>
        {status === "submitting" ? "Sending…" : "Send enquiry"}
      </LiteButton>
      <p
        id="contact-form-status"
        className={`contact-form__status contact-form__status--${status}`}
        role={status === "error" ? "alert" : "status"}
        aria-live={status === "error" ? "assertive" : "polite"}
        aria-atomic="true"
      >
        {status === "success" && "Thank you. Your message has been sent to the 6D Address team."}
        {status === "error" && errorMessage}
      </p>
    </form>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="craft-container site-footer__inner">
        <div className="site-footer__brand">
          <a href="#top" className="site-footer__logo" aria-label="6D Address home"><NoWrap6D /></a>
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
  disabled = false,
}: {
  children: ReactNode;
  className?: string;
  href?: string;
  type?: "button" | "submit" | "reset";
  onClick?: (event: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void;
  disabled?: boolean;
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

  return <button className={classes} type={type} onClick={onClick} onPointerMove={handlePointerMove} disabled={disabled}>{children}</button>;
}

export default App;
