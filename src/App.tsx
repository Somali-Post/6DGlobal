import { lazy, MouseEvent, PointerEvent, ReactNode, Suspense, TouchEvent, useEffect, useRef, useState } from "react";
import CursorGrid from "./components/CursorGrid";
import { AddressingProblemSection } from "./components/sections/AddressingProblemSection";
import { AddressExample, addressExamples, splitCompleteAddress } from "./data/addressExamples";
import { localityMattersExample } from "./data/localityMattersExample";

const FindPage = lazy(() => import("./pages/FindPage"));

const navItems = [
  ["how-it-works", "How it works"],
  ["examples", "Examples"],
  ["locality", "Locality"],
  ["faq", "FAQ"],
  ["contact", "Contact"],
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
    image: "/images/team/GL.jpeg",
    name: "Graeme Lee",
    role: "Addressing and postal development",
    bio: "Graeme developed the original 6D Address concept from his experience in postal-sector development and addressing challenges in countries where conventional addressing is incomplete.",
  },
  {
    initials: "AG",
    image: "/images/team/AG.jpeg",
    name: "Abdiaziz Ga'al",
    role: "Software implementation and product development",
    bio: "Abdiaziz brought the 6D Address concept to life through software development, map-based demonstrations and practical testing of the user experience.",
  },
  {
    initials: "SH",
    image: "/images/team/SH.jpeg",
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
    <Suspense fallback={null}>
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
    const sections = ["top", ...navItems.map(([id]) => id)]
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActive(visible.target.id);
      },
      { rootMargin: "-28% 0px -58% 0px", threshold: [0.08, 0.2, 0.4] },
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
              <span className="hero-title-primary">6D Address</span>
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
              <LiteButton className="button hero-cta hero-cta--primary" onClick={() => onFind(true)}>Find my 6D Address</LiteButton>
              <LiteButton className="button hero-cta hero-cta--secondary" href="#how-it-works">See how it works</LiteButton>
            </div>
          </div>
          <GlobeHeroVisual />
        </div>
      </section>

      <AddressingProblemSection />

      <section className="craft-section craft-section--blueprint craft-grid-bg how-method" id="how-it-works">
        <div className="craft-container">
          <HowItWorksSection />
        </div>
      </section>

      <AddressExamplesCarousel />

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
              <p className="chapter-label">CONTACT</p>
              <h2 className="display-section">Start a 6D Address conversation</h2>
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

  const renderLinks = () =>
    navItems.map(([id, label]) => (
      <a
        key={id}
        className={`nav-link ${active === id ? "active" : ""}`}
        href={`#${id}`}
        onClick={onNavigate}
        aria-current={active === id ? "page" : undefined}
      >
        {label}
      </a>
    ));

  return (
    <nav className={`nav ${scrolled ? "scrolled" : ""} ${menuOpen ? "menu-open" : ""}`} aria-label="Primary navigation">
      <a className="brand" href="#top" onClick={onNavigate} aria-label="6D Address home">
        <img src="/navlogo-320.webp" alt="6D Address" />
      </a>
      <div className="nav-pill">{renderLinks()}</div>
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
      <div className={`mobile-menu ${menuOpen ? "open" : ""}`} id="site-navigation">
        {renderLinks()}
        <LiteButton className="button primary" onClick={onFind}>Find my 6D Address</LiteButton>
      </div>
    </nav>
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
    <>
      <div className="how-method__layout">
        <header className="how-method__intro craft-reveal">
          <p className="chapter-label">HOW IT WORKS</p>
          <h2 className="display-section">How 6D Address works</h2>
          <p className="craft-lead">
            Latitude and longitude provide the six digits. Locality turns those digits into a clear address people can use.
          </p>
          <p className="how-method__helper">
            6D Address uses the 2nd, 3rd and 4th decimal places of latitude and longitude.
          </p>
        </header>

        <article className="how-method__board craft-panel craft-panel--blueprint craft-reveal" aria-label="How the six-digit code is formed">
          <div className="how-method__coordinates">
            <h3>Coordinate source</h3>
            <div className="how-method__coordinate-row">
              <span>Latitude</span>
              <strong>7.8<span className="digit-pair--red">7</span><span className="digit-pair--green">9</span><span className="digit-pair--blue">2</span>27 N</strong>
            </div>
            <div className="how-method__coordinate-row">
              <span>Longitude</span>
              <strong>11.3<span className="digit-pair--red">4</span><span className="digit-pair--green">3</span><span className="digit-pair--blue">5</span>55 W</strong>
            </div>
          </div>

          <div className="how-method__extraction">
            <h3>Digit extraction</h3>
            <table>
              <thead>
                <tr>
                  <th scope="col">Decimal place</th>
                  <th scope="col">Latitude</th>
                  <th scope="col">Longitude</th>
                  <th scope="col">6D pair</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>2nd decimal place</td>
                  <td><span className="digit-pair--red">7</span></td>
                  <td><span className="digit-pair--red">4</span></td>
                  <td><span className="digit-pair--red">74</span></td>
                </tr>
                <tr>
                  <td>3rd decimal place</td>
                  <td><span className="digit-pair--green">9</span></td>
                  <td><span className="digit-pair--green">3</span></td>
                  <td><span className="digit-pair--green">93</span></td>
                </tr>
                <tr>
                  <td>4th decimal place</td>
                  <td><span className="digit-pair--blue">2</span></td>
                  <td><span className="digit-pair--blue">5</span></td>
                  <td><span className="digit-pair--blue">25</span></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="how-method__result">
            <span>Resulting 6D code</span>
            <ColouredCode code="74-93-25" />
          </div>
        </article>
      </div>

      <div className="how-method__address-strip craft-reveal">
        <ColouredCode code="74-93-25" />
        <address>
          <span>Blama</span>
          <span>Kenema District</span>
          <span>Sierra Leone</span>
        </address>
      </div>

      <p className="how-method__takeaway craft-reveal">
        The code gives the positional reference. Locality makes the address usable in the real world.
      </p>
    </>
  );
}

function AddressExamplesCarousel() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [userPaused, setUserPaused] = useState(false);
  const [interactionPaused, setInteractionPaused] = useState(false);
  const [documentHidden, setDocumentHidden] = useState(() => document.hidden);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const dragStartX = useRef<number | null>(null);
  const total = addressExamples.length;
  const [trackIndex, setTrackIndex] = useState(total);
  const [trackOffset, setTrackOffset] = useState(0);
  const [suppressTransition, setSuppressTransition] = useState(true);
  const activeIndex = ((trackIndex % total) + total) % total;
  const autoplayPaused = prefersReducedMotion || userPaused || interactionPaused || documentHidden;
  const carouselExamples = [...addressExamples, ...addressExamples, ...addressExamples];

  useEffect(() => {
    if (autoplayPaused || total < 2) return;
    const timer = window.setInterval(() => {
      setTrackIndex((index) => index + 1);
    }, 5200);

    return () => window.clearInterval(timer);
  }, [autoplayPaused, total]);

  useEffect(() => {
    const onVisibilityChange = () => setDocumentHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  const goPrevious = () => {
    setUserPaused(true);
    setTrackIndex((index) => index - 1);
  };
  const goNext = () => {
    setUserPaused(true);
    setTrackIndex((index) => index + 1);
  };

  useEffect(() => {
    if (trackIndex >= total && trackIndex < total * 2) return;

    const timer = window.setTimeout(() => {
      setSuppressTransition(true);
      setTrackIndex(activeIndex + total);
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setSuppressTransition(false));
      });
    }, prefersReducedMotion ? 0 : 760);

    return () => window.clearTimeout(timer);
  }, [activeIndex, prefersReducedMotion, total, trackIndex]);

  useEffect(() => {
    const updateOffset = () => {
      const track = trackRef.current;
      const firstCard = track?.querySelector<HTMLElement>(".address-example-card");
      if (!track || !firstCard) return;

      const trackStyles = window.getComputedStyle(track);
      const gap = Number.parseFloat(trackStyles.columnGap || trackStyles.gap || "0") || 0;
      setTrackOffset(trackIndex * (firstCard.getBoundingClientRect().width + gap));
    };

    updateOffset();

    const track = trackRef.current;
    if (!track) return;

    const observer = new ResizeObserver(updateOffset);
    observer.observe(track);
    window.addEventListener("resize", updateOffset);
    window.requestAnimationFrame(() => setSuppressTransition(false));

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateOffset);
    };
  }, [trackIndex]);

  const finishDrag = (clientX: number) => {
    if (dragStartX.current === null) return;
    const distance = clientX - dragStartX.current;
    dragStartX.current = null;

    if (Math.abs(distance) < 42) return;
    if (distance < 0) goNext();
    else goPrevious();
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse") return;
    dragStartX.current = event.clientX;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Some synthetic touch checks do not create an active pointer capture target.
    }
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    finishDrag(event.clientX);

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Capture may already be released if the browser handled the gesture natively.
    }
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    dragStartX.current = event.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.changedTouches[0];
    if (!touch) return;
    finishDrag(touch.clientX);
  };

  return (
    <section className="craft-section craft-section--light examples-chapter address-examples" id="examples">
      <div className="craft-container address-examples__inner">
        <div className="examples-chapter__header craft-grid address-examples__header">
          <div className="examples-chapter__title craft-reveal">
            <p className="chapter-label">EXAMPLES FROM AROUND THE WORLD</p>
            <h2 className="display-section">6D Address in action</h2>
          </div>
          <div className="examples-chapter__intro craft-reveal">
            <p className="craft-lead address-examples__lead">
              The same format can work with local place names in different countries. Each example combines a six-digit
              reference with locality information people already use.
            </p>
          </div>
        </div>

        <div
          className="address-examples__carousel"
          onMouseEnter={() => setInteractionPaused(true)}
          onMouseLeave={() => setInteractionPaused(false)}
          onFocusCapture={() => setInteractionPaused(true)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setInteractionPaused(false);
          }}
        >
          <div
            className="address-examples__viewport"
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerCancel={() => {
              dragStartX.current = null;
            }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div
              className={`address-examples__track ${suppressTransition ? "is-resetting" : ""}`}
              ref={trackRef}
              style={{ transform: `translate3d(-${trackOffset}px, 0, 0)` }}
            >
              {carouselExamples.map((example, index) => (
                <AddressExampleCard
                  example={example}
                  isActive={index === trackIndex}
                  isDuplicate={index < total || index >= total * 2}
                  key={`${example.country}-${index}`}
                />
              ))}
            </div>
          </div>

          <div className="examples-chapter__controls address-examples__controls" aria-label="Address example carousel controls">
            <button type="button" className="craft-button craft-button--light examples-chapter__control" onClick={goPrevious} aria-label="Show previous address example">
              Previous
            </button>
            <span className="examples-chapter__counter" aria-live="polite">
              {String(activeIndex + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
            </span>
            <button
              type="button"
              className="craft-button craft-button--light examples-chapter__control carousel-pause"
              onClick={() => setUserPaused((value) => !value)}
              aria-pressed={autoplayPaused}
            >
              {autoplayPaused ? "Play" : "Pause"}
            </button>
            <button type="button" className="craft-button craft-button--light examples-chapter__control" onClick={goNext} aria-label="Show next address example">
              Next
            </button>
          </div>
        </div>

        <div className="examples-chapter__progress" aria-hidden="true">
          <span style={{ transform: `scaleX(${(activeIndex + 1) / total})` }} />
        </div>
      </div>
    </section>
  );
}

function AddressExampleCard({
  example,
  isActive,
  isDuplicate = false,
}: {
  example: AddressExample;
  isActive: boolean;
  isDuplicate?: boolean;
}) {
  const { displayLocality, remainingLines } = splitCompleteAddress(example);
  const countryLine = remainingLines[remainingLines.length - 1] ?? example.country;
  const regionLines = remainingLines.slice(0, -1);

  return (
    <article className={`address-example-card ${isActive ? "is-active" : ""}`} aria-hidden={isDuplicate}>
      <div className="address-example-card__placeholder" aria-hidden="true">
        <span className="address-example-card__placeholder-logo">6D</span>
        <span className="address-example-card__road address-example-card__road--one" />
        <span className="address-example-card__road address-example-card__road--two" />
        <span className="address-example-card__placeholder-pin" />
      </div>

      <div className="address-example-card__label">
        <span className="address-example-card__label-kicker">Format example</span>
        <ColouredCode code={example.code} className="address-example-card__code" />
        <h3 className="address-example-card__locality">{displayLocality}</h3>
        <span className="address-example-card__support-lines">
          {regionLines.map((line) => (
            <span className="address-example-card__region" key={line}>{line}</span>
          ))}
          <span className="address-example-card__country">{countryLine}</span>
        </span>
      </div>
    </article>
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
  const { city, code, image, mobileImage, places } = localityMattersExample;

  return (
    <section id="locality" className="craft-section craft-section--dark craft-grid-bg craft-grid-bg--dark locality-proof">
      <div className="craft-container">
        <div className="locality-proof__grid">
          <header className="locality-proof__header craft-reveal">
            <p className="chapter-label">WHY LOCALITY MATTERS</p>
            <h2 className="display-section">Same code. Different localities.</h2>
            <p className="craft-lead">
              A 6D code is a reference, not a complete address on its own. The same six digits can appear in different
              places. Locality is what makes the intended address clear.
            </p>
          </header>

          <figure className="locality-proof__visual craft-reveal">
            <div className="locality-proof__map">
              <picture>
                <source media="(max-width: 560px)" srcSet={mobileImage} />
                <img
                  src={image}
                  alt={`Map-style illustration showing the same 6D code appearing in ${places.map((place) => place.locality).join(", ")}.`}
                />
              </picture>
            </div>
            <figcaption>
              Example locations in {city} sharing the same reference.
            </figcaption>
          </figure>

          <div className="locality-proof__rows craft-reveal">
            <div className="locality-proof__shared-code">
              <span>One shared 6D reference</span>
              <ColouredCode code={code} />
              <small>Every locality below uses this same code.</small>
            </div>

            <div className="locality-proof__rows-header">
              <span>No.</span>
              <span>Same code</span>
              <span>Locality</span>
              <span>City</span>
            </div>

            {places.map((place, index) => (
              <article className="locality-proof__row" key={place.locality}>
                <span className="locality-proof__index">{String(index + 1).padStart(2, "0")}</span>
                <ColouredCode code={code} className="locality-proof__code coloured-code--inline" />
                <span className="locality-proof__place">{place.locality}</span>
                <span className="locality-proof__city">{place.city}</span>
              </article>
            ))}
          </div>

          <p className="locality-proof__note craft-reveal">
            The code repeats across the wider area. The locality tells you which matching place is intended.
          </p>
        </div>
      </div>
    </section>
  );
}

function SomaliaUseCaseSection() {
  return (
    <section id="somalia-use-case" className="craft-section craft-section--warm somalia-case">
      <div className="craft-container">
        <div className="somalia-case__grid">
          <header className="somalia-case__header craft-reveal">
            <p className="chapter-label">SOMALIA USE CASE</p>
            <h2 className="display-section">Somalia use case</h2>
            <p className="craft-lead">
            Somalia provides a practical example of how 6D Address can work with existing locality information. In areas
            where property numbers or named streets are incomplete, a 6D reference can help provide a clearer last-mile
            location when combined with district, town, city and regional information.
          </p>
          </header>

          <article className="somalia-case__format craft-panel craft-reveal" aria-labelledby="somalia-format-title">
            <span className="somalia-case__meta">Address format</span>
            <h3 id="somalia-format-title">A complete address can combine local context and 6D</h3>
            <ol className="somalia-case__format-list">
              <li>Property number and street name</li>
              <li>6D Address and locality</li>
              <li>District / town / city</li>
              <li>Region</li>
              <li>Country</li>
            </ol>
          </article>

          <div className="somalia-case__examples craft-reveal" aria-label="Somalia address format examples">
            <article className="somalia-address-slip somalia-address-slip--street">
              <span className="somalia-address-slip__label">Example with street context</span>
              <SomaliaAddressLines
                lines={["Isbarbardhig Road", "35-12-12 Halane", "Mogadishu", "Wadajir", "Banaadir", "Somalia"]}
              />
            </article>

            <article className="somalia-address-slip somalia-address-slip--local">
              <span className="somalia-address-slip__label">Example without full street context</span>
              <SomaliaAddressLines
                lines={["Unnamed local road", "87-67-21 Bargaal", "Bargaal", "Bari", "Puntland", "Somalia"]}
              />
            </article>
          </div>

          <div className="somalia-case__note craft-reveal">
            <p>
              Where full property and street addressing is not yet available, 6D Address can provide a practical location
              reference that works with existing locality information.
            </p>
            <small>
              Examples are provided to illustrate the address format and should be verified against the selected coordinate
              before operational use.
            </small>
          </div>
        </div>
      </div>
    </section>
  );
}

function SomaliaAddressLines({ lines }: { lines: string[] }) {
  return (
    <address className="somalia-address-lines">
      {lines.map((line) => {
        const match = line.match(/^(\d{2}-\d{2}-\d{2})\s+(.+)$/);
        return (
          <span className={match ? "somalia-address-lines__code" : undefined} key={line}>
            {match ? (
              <>
                <ColouredCode code={match[1]} className="coloured-code--inline somalia-address-lines__inline-code" />
                <span className="somalia-address-lines__locality">{match[2]}</span>
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
            <p className="chapter-label">PRACTICAL APPLICATIONS</p>
            <h2 className="display-section">Where 6D can help</h2>
            <p className="craft-lead">
            6D Address can support services that need a simple, shareable location reference where formal addressing is
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
            <p className="chapter-label">OUR PROPOSITION</p>
            <h2 className="display-section">An open addressing method, supported by practical implementation tools.</h2>
            <p className="craft-lead">
            6D Address provides a simple way to create a short location reference from latitude and longitude, then
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
            <p className="chapter-label">THE TEAM</p>
            <h2 className="display-section">Our 6D Address team</h2>
            <p className="craft-lead">
            6D Address is being developed by a small founding team with experience in postal development, software
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
                <p className="team-editorial__bio">{member.bio}</p>
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
            <p className="chapter-label">FAQ</p>
            <h2 className="display-section">Frequently asked questions</h2>
            <p className="craft-lead">
              6D Address only becomes unique when the locality is present. 6D Address is a reconfiguration of latitude
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
                  <span>{item.question}</span>
                  <span className="faq-item__indicator" aria-hidden="true">{isOpen ? "-" : "+"}</span>
                </button>
                <div className="faq-item__answer" id={answerId} role="region" aria-labelledby={buttonId} hidden={!isOpen}>
                  <p>{item.answer}</p>
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
          <a href="#" className="site-footer__logo" aria-label="6D Address home">6D Address</a>
          <p>6D Address is being documented as an open addressing method.</p>
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
          <span>© {new Date().getFullYear()} 6D Address</span>
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
