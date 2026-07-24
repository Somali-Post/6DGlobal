import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import CursorGrid from "./components/CursorGrid";
import SpecularButton from "./components/SpecularButton";
import { Coordinate, generate6DCode } from "./lib/sixd";
import { createGoogleMapsAdapter, MapAdapter, MapAddress } from "./map/googleMapsAdapter";
import { createHeroGlobe } from "./globe/createGlobe";

const MOGADISHU: Coordinate = { lat: 2.0469, lng: 45.3182 };

const navItems = [
  ["method", "How it works"],
  ["examples", "Examples"],
  ["open-system", "Open system"],
  ["locality", "Locality"],
  ["postal", "Postal authorities"],
  ["developers", "Developers"],
];

const examples = [
  ["Airport Road", "35-12-12 Halane", "Mogadishu, Banaadir, Somalia", "calculated from the Mogadishu sample"],
  ["Market entrance", "71-58-42 Kariakoo", "Dar es Salaam, Tanzania", "illustrative example"],
  ["Village clinic", "28-09-63 Aweil Centre", "Aweil, South Sudan", "illustrative example"],
  ["Old ferry road", "44-73-10 Likoni", "Mombasa, Kenya", "illustrative example"],
];

const principles = [
  "Published method",
  "Compatible apps can implement independently",
  "Addresses remain portable",
  "No mandatory central supplier",
  "People can choose the app they trust",
];

const faqs = [
  ["Is a 6D code globally unique?", "No. The six digits are a reference. A complete 6D address also includes locality information."],
  ["Why is locality required?", "The same six digits can appear in many places. Locality tells a compatible app which matching position you mean."],
  ["How precise is it?", "The code is derived from latitude and longitude decimal digits after snapping to a small coordinate cell. Practical precision depends on GPS and map quality."],
  ["Do I need GPS?", "GPS, survey coordinates, or another coordinate source is needed to create the reference. A user can still place a pin manually."],
  ["Do I need an app?", "No single app should be compulsory. Websites, mobile apps, delivery tools, and government systems can implement the method."],
  ["Can it work offline?", "The code can be calculated offline from coordinates. Search, maps, and locality datasets may need cached or local data."],
  ["Does 6D operate a central database?", "The method does not require one central database to create addresses. Organisations may maintain their own registers for pilots or operations."],
  ["Can another company build a compatible app?", "Yes. The system is intended for independent compatible implementations."],
  ["Where does 6D not work well?", "It is weaker in uninhabited places, areas with no meaningful locality, or situations requiring a globally unique standalone code."],
  ["Who governs the method or system?", "Governance should be clear, documented, and practical enough for public-sector, developer, and community use."],
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
    <FindPage onClose={() => navigate("/")} />
  ) : (
    <HomePage onFind={(autoLocate = true) => navigate(autoLocate ? "/find?locate=1" : "/find")} />
  );
}

function HomePage({ onFind }: { onFind: (autoLocate?: boolean) => void }) {
  const [active, setActive] = useState("top");
  const [menuOpen, setMenuOpen] = useState(false);
  const heroRef = useRef<HTMLElement | null>(null);
  const openRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const sections = ["top", ...navItems.map(([id]) => id), "faq", "contact"]
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
            <h1>
              <span className="hero-line">6D Address.</span>
              <span className="hero-line">Addressing the world</span>
              <span className="hero-line">in 6 digits</span>
            </h1>
            <p>
              A memorable six-digit code generated from latitude and longitude coordinates. Working with existing address
              information it provides accuracy within 10 metres.
            </p>
            <div className="actions">
              <SpecularButton className="button primary" onClick={() => onFind(true)}>Find my 6D Address</SpecularButton>
              <SpecularButton className="button secondary" href="#method" intensity="subtle">See how it works</SpecularButton>
            </div>
          </div>
          <GlobeHeroVisual />
        </div>
      </section>

      <section id="method" className="section method-section">
        <div className="section-heading">
          <p className="eyebrow">How it works</p>
          <h2>How 6D works</h2>
          <p>Latitude and longitude provide the six digits. Locality makes the code clear.</p>
        </div>
        <MethodLabIllustration />
      </section>

      <section id="examples" className="section examples-section">
        <div className="section-heading compact">
          <p className="eyebrow">Examples</p>
          <h2>Address labels people can read aloud.</h2>
          <p>A complete 6D address carries the reference and the place context together.</p>
        </div>
        <div className="address-grid">
          {examples.map(([line1, code, city, note]) => (
            <article className="address-label" key={code}>
              <span className="label-grid" />
              <small>{note}</small>
              <b>{line1}</b>
              <strong>{code}</strong>
              <span>{city}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="section section-dark share-section">
        <div className="section-heading compact">
          <p className="eyebrow">Share. Scan. Find.</p>
          <h2>Create a position people can communicate.</h2>
        </div>
        <div className="process-grid">
          <ProcessCard icon={<GpsPhoneIcon />} title="Create it with GPS" text="A phone or survey device supplies the coordinate." />
          <ProcessCard icon={<QrMessageIcon />} title="Share or scan it" text="Copy it, print it, send it, or encode it as QR text." />
          <ProcessCard icon={<RouteIcon />} title="Resolve the place" text="A compatible app combines the code and locality." />
        </div>
      </section>

      <section className="section product-doorway">
        <div>
          <p className="eyebrow">Try it now</p>
          <h2>Create your 6D address now.</h2>
          <p>The product screen opens full-screen, asks for location, and still works when a user prefers to drop a pin manually.</p>
          <div className="launch-chip">
            <span>Live sample</span>
            <strong>{generate6DCode(MOGADISHU).code} Halane</strong>
          </div>
        </div>
        <div className="doorway-actions">
          <SpecularButton className="button primary" onClick={() => onFind(true)}>Find my 6D Address</SpecularButton>
          <SpecularButton className="button secondary dark" onClick={() => onFind(false)} intensity="subtle">Drop a pin manually</SpecularButton>
        </div>
      </section>

      <section id="open-system" className="section section-ink open-system" ref={openRef}>
        <div className="section-grid-layer subtle" aria-hidden="true">
          <CursorGrid
            cellSize={70}
            color="#00B8FF"
            radius={140}
            falloff="smooth"
            holdTime={400}
            fadeDuration={800}
            lineWidth={1.2}
            maxOpacity={0.5}
            fillOpacity={0}
            gridOpacity={0.025}
            cellRadius={0}
            clickPulse
            pulseSpeed={600}
            trackTargetRef={openRef}
          />
        </div>
        <div className="section-heading compact section-content">
          <p className="eyebrow">A system, not a dependency</p>
          <h2>Open infrastructure should not depend on one supplier.</h2>
          <p>The method can be documented, implemented, tested and improved by compatible tools without a mandatory central supplier.</p>
        </div>
        <OpenSystemIllustration />
        <div className="principle-list section-content">
          {principles.map((principle, index) => (
            <article key={principle}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <b>{principle}</b>
            </article>
          ))}
        </div>
      </section>

      <section id="locality" className="section locality-section">
        <div className="section-heading compact">
          <p className="eyebrow">Why locality matters</p>
          <h2>The six digits are a reference, not the whole address.</h2>
          <p>Locality tells a compatible app which matching position you mean.</p>
        </div>
        <LocalityResolverIllustration />
      </section>

      <section className="section works-best">
        <div className="section-heading compact">
          <p className="eyebrow">Where 6D works best</p>
          <h2>Designed for settled communities with local place knowledge.</h2>
        </div>
        <div className="two-column-brief">
          <BriefList title="Works best" items={["settled communities", "known neighbourhoods, roads, villages, landmarks or districts", "incomplete property addressing"]} />
          <BriefList title="Works less well" items={["uninhabited places", "areas with no meaningful locality", "situations where a globally unique standalone code is required"]} />
        </div>
      </section>

      <section className="section section-dark mogadishu">
        <div className="mogadishu-copy">
          <p className="eyebrow">Mogadishu use case</p>
          <h2>Making homes, offices and service points easier to reach.</h2>
          <p>
            6D is being explored through the Mogadishu use case as a practical way to make homes, offices and service
            points easier to reach.
          </p>
        </div>
        <MogadishuFlow />
      </section>

      <section id="postal" className="section postal-section">
        <div className="section-heading compact">
          <p className="eyebrow">For postal authorities</p>
          <h2>Extend the reach of the national address.</h2>
          <p>Pilot in one delivery zone, learn with real operations, then decide how to scale.</p>
        </div>
        <PostalPilotIllustration />
        <div className="postal-ops">
          {["delivery zones", "address education", "field testing", "data governance", "postal integration"].map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
          <SpecularButton className="button secondary dark" href="#contact" intensity="subtle">Discuss a postal pilot</SpecularButton>
      </section>

      <section id="developers" className="section developers-section">
        <div className="section-heading compact">
          <p className="eyebrow">Developer ecosystem</p>
          <h2>Build compatible tools around an open method.</h2>
          <p>6D becomes more useful when address creation, scanning, checkout and local-language tools can work together.</p>
        </div>
        <DeveloperTilesIllustration />
        <SpecularButton className="button primary" href="#contact">Join the ecosystem</SpecularButton>
      </section>

      <section id="faq" className="section faq-section">
        <div className="section-heading compact">
          <p className="eyebrow">FAQ</p>
          <h2>Clear answers for pilots and implementation.</h2>
        </div>
        <div className="faq-list">
          {faqs.map(([q, a]) => (
            <details key={q}>
              <summary>{q}<span>+</span></summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section id="contact" className="section contact-section">
        <div className="contact-copy">
          <p className="eyebrow">Contact</p>
          <h2>Start a practical conversation.</h2>
          <p>Useful for postal authorities, government teams, developers, and delivery or logistics partners evaluating a real pilot.</p>
          <div className="trust-list">
            <span>Postal pilots</span>
            <span>Developer compatibility</span>
            <span>Delivery operations</span>
          </div>
        </div>
        <ContactForm />
      </section>

      <Footer onFind={() => onFind(true)} />
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
      <a key={id} className={`nav-link ${active === id ? "active" : ""}`} href={`#${id}`} onClick={onNavigate}>
        {label}
      </a>
    ));

  return (
    <nav className={`nav ${scrolled ? "scrolled" : ""} ${menuOpen ? "menu-open" : ""}`}>
      <a className="brand" href="#top" onClick={onNavigate} aria-label="6D Address home">
        <img src="/navlogo.png" alt="6D Address" />
      </a>
      <div className="nav-pill">{renderLinks()}</div>
      <div className="nav-actions">
        <span className="method-badge"><span /> Open method</span>
        <SpecularButton className="button primary nav-cta" onClick={onFind}>Find my 6D</SpecularButton>
        <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-label="Open navigation menu">
          <span />
          <span />
        </button>
      </div>
      <div className={`mobile-menu ${menuOpen ? "open" : ""}`}>
        {renderLinks()}
        <SpecularButton className="button primary" onClick={onFind}>Find my 6D Address</SpecularButton>
      </div>
    </nav>
  );
}

function FindPage({ onClose }: { onClose: () => void }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const adapter = useRef<MapAdapter | null>(null);
  const requestedLocation = useRef(false);
  const [coordinate, setCoordinate] = useState<Coordinate | null>(null);
  const [address, setAddress] = useState<MapAddress | null>(null);
  const [notice, setNotice] = useState("Choose a location to create a 6D address.");
  const [mapStatus, setMapStatus] = useState<"loading" | "ready" | "missing-key" | "error">("loading");
  const [locating, setLocating] = useState(false);
  const [denied, setDenied] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState("");
  const [showQr, setShowQr] = useState(false);
  const [showLocality, setShowLocality] = useState(false);
  const autoLocate = new URLSearchParams(window.location.search).get("locate") === "1";
  const sixd = useMemo(() => coordinate ? generate6DCode(coordinate) : null, [coordinate]);
  const fallbackPinStyle = useMemo(() => {
    if (!coordinate) return undefined;
    const x = 50 + ((coordinate.lng - MOGADISHU.lng) / 0.08) * 100;
    const y = 50 - ((coordinate.lat - MOGADISHU.lat) / 0.08) * 100;
    return { left: `${Math.max(4, Math.min(96, x))}%`, top: `${Math.max(4, Math.min(96, y))}%` };
  }, [coordinate]);
  const complete = useMemo(
    () => sixd && address
      ? [
        `${sixd.code} ${address.locality}`,
        address.city,
        [address.region, address.country].filter(Boolean).join(", ") || address.cityLine,
      ].filter(Boolean).join("\n")
      : "",
    [address, sixd],
  );

  useEffect(() => {
    if (!complete) {
      setQr("");
      return;
    }
    QRCode.toDataURL(complete, { margin: 1, width: 144, color: { dark: "#05070A", light: "#F7F5EF" } })
      .then(setQr)
      .catch(() => setQr(""));
  }, [complete]);

  useEffect(() => {
    let cancelled = false;
    if (!mapRef.current) return;
    const startedAt = performance.now();
    let readyTimer = 0;
    let readyFallbackTimer = 0;
    const markReady = () => {
      const elapsed = performance.now() - startedAt;
      const wait = Math.max(0, 2200 - elapsed);
      window.clearTimeout(readyTimer);
      readyTimer = window.setTimeout(() => {
        if (!cancelled) setMapStatus("ready");
      }, wait);
    };

    createGoogleMapsAdapter({
      element: mapRef.current,
      initial: MOGADISHU,
      onPick: (picked) => {
        setCoordinate(picked);
        setDenied(false);
        setNotice("Selected location. Move the pin if the entrance or delivery point is different.");
      },
      onAddress: (resolved) => setAddress(resolved),
      onNotice: setNotice,
      onReady: markReady,
    }).then((created) => {
      if (cancelled) {
        created?.destroy();
        return;
      }
      adapter.current = created;
      if (!created) {
        setMapStatus("missing-key");
        setNotice("Map key missing. Add VITE_GOOGLE_MAPS_API_KEY to .env.local.");
      } else {
        readyFallbackTimer = window.setTimeout(markReady, 8000);
      }
      if (autoLocate && !requestedLocation.current) requestLocation(created);
    }).catch((error) => {
      console.error("[find] Google Maps failed to initialise:", error);
      if (!cancelled) {
        setMapStatus("error");
        setNotice("The map could not load. Check the Google Maps API key and browser restrictions.");
      }
    });

    return () => {
      cancelled = true;
      window.clearTimeout(readyTimer);
      window.clearTimeout(readyFallbackTimer);
      adapter.current?.destroy();
    };
  }, []);

  const selectFallbackCoordinate = (picked: Coordinate) => {
    setCoordinate(picked);
    setAddress({
      locality: "Unknown locality",
      city: "Manual pin",
      cityLine: "Manual pin",
    });
    setDenied(false);
  };

  const requestLocation = (mapAdapter = adapter.current) => {
    requestedLocation.current = true;
    setLocating(true);
    setDenied(false);
    setNotice("Waiting for location permission...");
    if (!navigator.geolocation) {
      setLocating(false);
      setDenied(true);
        setNotice("This browser does not support location lookup. Click the map to choose a location manually.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const picked = { lat: position.coords.latitude, lng: position.coords.longitude };
        setLocating(false);
        if (mapAdapter) mapAdapter.setPin(picked, 18);
        else selectFallbackCoordinate(picked);
        setNotice("Location found. Move the pin if the entrance or delivery point is different.");
      },
      () => {
        setLocating(false);
        setDenied(true);
        setNotice("Location access was not allowed. Click the map to choose a location manually.");
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };

  const copy = async () => {
    if (!complete) return;
    await navigator.clipboard?.writeText(complete);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const share = async () => {
    if (!complete) return;
    if (navigator.share) await navigator.share({ title: "6D Address", text: complete });
    else await copy();
  };

  const canUseFallbackPin = mapStatus === "missing-key";
  const panelMode = locating || mapStatus === "loading" ? "loading" : coordinate && sixd && address ? "result" : denied ? "denied" : mapStatus === "error" ? "map-error" : "empty";
  const isMapLoadingScreen = panelMode === "loading";

  return (
    <main className="finder">
      <div
        className="map-stage"
        onClick={(event) => {
          if (adapter.current || !canUseFallbackPin) return;
          const rect = event.currentTarget.getBoundingClientRect();
          const x = (event.clientX - rect.left) / rect.width - 0.5;
          const y = (event.clientY - rect.top) / rect.height - 0.5;
          selectFallbackCoordinate({ lat: MOGADISHU.lat - y * 0.08, lng: MOGADISHU.lng + x * 0.08 });
          setNotice("Preview pin selected. Add a Google Maps key for live reverse geocoding.");
        }}
      >
        <div className="map-canvas" ref={mapRef} />
        {mapStatus !== "ready" && (
        <div className={`fallback-map ${mapStatus === "error" ? "error" : ""}`}>
          {mapStatus !== "loading" && <span className="fallback-route" />}
          {mapStatus !== "loading" && coordinate && <span className="fallback-pin" style={fallbackPinStyle} />}
          <div className="map-message">
            {mapStatus === "loading" && <MapLoader />}
            {mapStatus === "missing-key" && "Map key missing. Add VITE_GOOGLE_MAPS_API_KEY to .env.local."}
            {mapStatus === "error" && "The map could not load. Check the Google Maps API key and browser restrictions."}
          </div>
        </div>
        )}
      </div>

      <header className={`finder-top ${isMapLoadingScreen ? "loading-only" : ""}`}>
        <button className="icon-button" onClick={onClose} aria-label="Return to homepage">x</button>
        {!isMapLoadingScreen && <img src="/logo.png" alt="6D Address" />}
        {!isMapLoadingScreen && (
          <button className="location-control" onClick={() => requestLocation()} aria-label="Use my location">
            <LocationIcon /> <span>Use my location</span>
          </button>
        )}
      </header>

      {!isMapLoadingScreen && <aside className="finder-sheet">
        {panelMode === "result" ? (
          <>
            <div className="sheet-kicker"><span className="status-dot" /> Selected location</div>
            <h1>{sixd?.code}</h1>
            <p className="sheet-locality">{address?.locality}</p>
            <pre>{complete}</pre>
          </>
        ) : (
          <div className="empty-panel">
            <p className="sheet-kicker muted">Create a 6D address</p>
            <h2>
              {panelMode === "denied" && "Choose a location manually"}
              {panelMode === "map-error" && "Map unavailable"}
              {panelMode === "empty" && "Create your 6D address"}
            </h2>
            <p>
              {panelMode === "denied" && "Location access was not allowed. Click the map to choose a location manually."}
              {panelMode === "map-error" && "The map could not load. Check the Google Maps API key and browser restrictions."}
              {panelMode === "empty" && "Click the map or use your current location to create a 6D address."}
            </p>
          </div>
        )}
        <p className="notice">{notice}</p>
        {complete && <div className="finder-actions">
          {complete && <button onClick={copy}>{copied ? "Copied" : "Copy"}</button>}
          {complete && <button onClick={share}>Share</button>}
          {complete && <button onClick={() => setShowQr(!showQr)}>QR</button>}
        </div>}
        {showQr && complete && <div className="qr-row">
          {qr ? <img alt="QR code for the complete 6D address" src={qr} /> : <span className="qr-placeholder" />}
          <p>A complete 6D address is the six-digit reference plus locality. The digits alone are not globally unique.</p>
        </div>}
        <button className="locality-link" onClick={() => setShowLocality(true)}>Why locality matters</button>
        {complete && <p className="result-note">A complete 6D address is the six-digit reference plus locality. The digits alone are not globally unique.</p>}
      </aside>}
      {showLocality && (
        <div className="modal-backdrop" onClick={() => setShowLocality(false)}>
          <section className="locality-modal" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowLocality(false)} aria-label="Close locality explanation">x</button>
            <h2>Why locality matters</h2>
            <p>The six digits are a reference, not the whole address. The same digits can appear in more than one place. Locality tells a compatible app which matching position you mean.</p>
          </section>
        </div>
      )}
    </main>
  );
}

function GlobeHeroVisual() {
  const globeRef = useRef<HTMLDivElement>(null);
  const fallbackRef = useRef<HTMLDivElement>(null);
  const [globeReady, setGlobeReady] = useState(false);
  const [globeProgress, setGlobeProgress] = useState(0.08);

  useEffect(() => {
    if (!globeRef.current) return;
    let readyTimer = 0;
    const markReady = () => {
      setGlobeProgress(1);
      window.clearTimeout(readyTimer);
      readyTimer = window.setTimeout(() => setGlobeReady(true), 180);
    };

    const globe = createHeroGlobe({
      container: globeRef.current,
      fallbackElement: fallbackRef.current ?? undefined,
      rotationDuration: 50,
      initialLongitude: -150,
      globeScale: 1,
      horizontalOffset: 0.62,
      pointerTiltDegrees: 0,
      onProgress: (loaded, total) => {
        setGlobeProgress(Math.max(0.08, Math.min(0.96, loaded / total)));
      },
      onReady: markReady,
    });

    return () => {
      window.clearTimeout(readyTimer);
      globe.destroy();
    };
  }, []);

  return (
    <div className="hero-visual hero-content" aria-hidden="true">
      <div className={`hero-globe-root ${globeReady ? "is-ready" : ""}`} ref={globeRef} />
      <div className="hero-globe-fallback" ref={fallbackRef} />
      <div className={`hero-globe-loader ${globeReady ? "is-hidden" : ""}`}>
        <span className="hero-globe-loader-label">Loading globe</span>
        <span className="hero-globe-loader-bar">
          <span style={{ transform: `scaleX(${globeProgress})` }} />
        </span>
      </div>
    </div>
  );
}

function MapLoader() {
  return (
    <div className="map-loader" role="status" aria-live="polite" aria-label="Loading Global Map">
      <img className="map-loader-brand" src="/navlogo-dark.png" alt="6D Address" />
      <span className="map-loader-mark" aria-hidden="true">
        <span className="map-loader-square red" />
        <span className="map-loader-square green" />
        <span className="map-loader-square blue" />
      </span>
      <span className="map-loader-copy">
        <strong>Loading Global Map</strong>
        <small>Preparing map tiles, grid references, and location tools.</small>
      </span>
      <span className="map-loader-progress" aria-hidden="true">
        <span className="map-loader-progress-track"><span /></span>
        <span className="map-loader-progress-meta">
          <span>Syncing</span>
          <span>Global map</span>
        </span>
      </span>
    </div>
  );
}

function MethodLabIllustration() {
  const digitColumns = [
    { lat: "7", lng: "4", tone: "red" },
    { lat: "9", lng: "3", tone: "green" },
    { lat: "2", lng: "5", tone: "blue" },
  ];

  return (
    <div className="method-shell">
      <div className="method-lab">
        <article className="method-card coordinate-source">
          <div className="method-card-title"><span>1</span><b>Coordinate source</b></div>
          <div className="coordinate-stack">
            <div>
              <small>Latitude</small>
              <strong>
                7.
                <em>8</em>
                <mark className="tone-red">7</mark>
                <mark className="tone-green">9</mark>
                <mark className="tone-blue">2</mark>
                27 N
              </strong>
            </div>
            <div>
              <small>Longitude</small>
              <strong>
                11.
                <em>3</em>
                <mark className="tone-red">4</mark>
                <mark className="tone-green">3</mark>
                <mark className="tone-blue">5</mark>
                55 W
              </strong>
            </div>
          </div>
        </article>
        <div className="lab-arrow" />
        <article className="method-card extraction-stage">
          <div className="method-card-title"><span>2</span><b>Digit extraction</b></div>
          <div className="digit-matrix" aria-label="Latitude digits 7 9 2, longitude digits 4 3 5">
            {digitColumns.map((column) => (
              <div className={`digit-column ${column.tone}`} key={`${column.lat}${column.lng}`}>
                <i>{column.lat}</i>
                <i>{column.lng}</i>
              </div>
            ))}
          </div>
          <small>2nd, 3rd, and 4th decimal digits</small>
          <strong>74-93-25</strong>
        </article>
        <div className="lab-arrow" />
        <article className="method-card locality-stage">
          <div className="method-card-title"><span>3</span><b>Locality added</b></div>
          <div className="locality-pin" aria-hidden="true" />
          <b>Blama</b>
          <p>Local place context selects the intended matching position.</p>
        </article>
        <div className="lab-arrow" />
        <article className="method-card lab-final">
          <div className="method-card-title"><span>4</span><b>Complete address</b></div>
          <div className="complete-address-list">
            <strong>74-93-25</strong>
            <b>Blama</b>
            <span>Kenema District</span>
            <span>Sierra Leone</span>
          </div>
        </article>
      </div>
      <div className="method-proof">
        <b>Why it works</b>
        <span>Each coloured column contributes one latitude digit and one longitude digit, creating three readable pairs.</span>
      </div>
    </div>
  );
}

function CoordinateGridIllustration() {
  return (
    <div className="coordinate-visual">
      <div className="coord-source">
        <span>Coordinate</span>
        <b>02.0469 N</b>
        <b>45.3182 E</b>
      </div>
      <div className="digit-rail">
        {["3", "5", "1", "2", "1", "2"].map((digit, index) => (
          <span style={{ animationDelay: `${index * 120}ms` }} key={`${digit}-${index}`}>{digit}</span>
        ))}
      </div>
      <AddressCardIllustration />
    </div>
  );
}

function AddressCardIllustration() {
  return (
    <article className="final-address-card">
      <small>Complete address</small>
      <b>Airport Road</b>
      <strong>35-12-12 Halane</strong>
      <span>Mogadishu, Banaadir, Somalia</span>
    </article>
  );
}

function LocalityResolverIllustration() {
  const cells = [
    ["35-12-12", "Kariakoo", "Dar es Salaam"],
    ["35-12-12", "Halane", "Mogadishu"],
    ["35-12-12", "Likoni", "Mombasa"],
    ["35-12-12", "Aweil Centre", "Aweil"],
    ["35-12-12", "Old Town", "Hargeisa"],
    ["35-12-12", "Port Road", "Berbera"],
  ];

  return (
    <div className="resolver-visual">
      <div className="resolver-map">
        {cells.map(([code, place, city]) => (
          <article className={place === "Halane" ? "resolved" : ""} key={`${place}-${city}`}>
            <span>{code}</span>
            <b>{place}</b>
            <small>{city}</small>
          </article>
        ))}
      </div>
      <div className="resolver-result">
        <span>Locality match</span>
        <strong>35-12-12 Halane</strong>
        <p>Mogadishu, Banaadir, Somalia</p>
      </div>
      <p>
        The same six digits can appear in multiple grid positions. Adding locality selects the intended result.
      </p>
    </div>
  );
}

function OpenSystemIllustration() {
  const actors = [
    ["apps", 146, 66],
    ["postal authority", 252, 192],
    ["developer", 450, 210],
    ["delivery company", 642, 192],
    ["resident", 752, 66],
  ] as const;

  return (
    <svg className="open-illustration section-content" viewBox="0 0 900 320" aria-hidden="true">
      <defs>
        <radialGradient id="openCore">
          <stop offset="0%" stopColor="#00b8ff" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#006ce3" stopOpacity="0.05" />
        </radialGradient>
      </defs>
      <circle className="core-halo" cx="450" cy="132" r="92" />
      <g className="open-core">
        <circle cx="450" cy="132" r="62" />
        <text x="450" y="126">open 6D</text>
        <text x="450" y="148">method</text>
      </g>
      {actors.map(([label, x, y]) => (
        <g className="open-actor" key={label}>
          <path d={`M450 132 C${(450 + x) / 2} ${y < 132 ? y + 70 : y - 44} ${(450 + x) / 2} ${y} ${x} ${y}`} />
          <rect x={x - 78} y={y - 24} width="156" height="48" rx="24" />
          <text x={x} y={y + 5}>{label}</text>
        </g>
      ))}
    </svg>
  );
}

function PostalPilotIllustration() {
  return (
    <div className="pilot-flow">
      {["Pilot", "Learn", "Scale"].map((step, index) => (
        <article key={step}>
          <span>{index + 1}</span>
          <b>{step}</b>
          <p>{index === 0 ? "Choose one district or delivery zone." : index === 1 ? "Measure creation, resolution and trust." : "Expand only when the operating model works."}</p>
        </article>
      ))}
    </div>
  );
}

function DeveloperTilesIllustration() {
  const tiles = ["API / resolver", "QR tools", "Local-language apps", "Checkout integrations", "Offline resolvers", "Government tools"];
  return (
    <div className="developer-tiles">
      {tiles.map((tile, index) => (
        <article key={tile}>
          <span>{String(index + 1).padStart(2, "0")}</span>
          <b>{tile}</b>
        </article>
      ))}
    </div>
  );
}

function ProcessCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <article className="process-card">
      {icon}
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}

function BriefList({ title, items }: { title: string; items: string[] }) {
  return (
    <article className="brief-list">
      <h3>{title}</h3>
      <ul>
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </article>
  );
}

function MogadishuFlow() {
  return (
    <div className="mogadishu-panel">
      <div className="mini-map">
        <span className="destination-marker" />
        <AddressCardIllustration />
      </div>
      <div className="flow-steps">
        {["Local names", "6D reference", "Driver resolves", "Service point reached"].map((step) => <span key={step}>{step}</span>)}
      </div>
    </div>
  );
}

function ContactForm() {
  return (
    <form className="contact-form" name="contact" method="POST" data-netlify="true" action="/contact-thanks">
      <input type="hidden" name="form-name" value="contact" />
      <label>Name<input name="name" required /></label>
      <label>Organisation<input name="organisation" /></label>
      <label>Work email<input name="email" type="email" required /></label>
      <label>Country / region<input name="country" /></label>
      <label>Enquiry type<select name="type" defaultValue="Postal authority / government">
        <option>Postal authority / government</option>
        <option>Humanitarian / development</option>
        <option>Developer / API</option>
        <option>Delivery / logistics</option>
        <option>Commercial partnership</option>
        <option>Other</option>
      </select></label>
      <label>Message<textarea name="message" rows={5} required /></label>
      <SpecularButton className="button primary" type="submit">Send enquiry</SpecularButton>
      <p>Prefer email? Contact us at <a href="mailto:contact@6daddress.com">contact@6daddress.com</a></p>
    </form>
  );
}

function Footer({ onFind }: { onFind: () => void }) {
  return (
    <footer className="footer">
      <div className="footer-brand">
        <img src="/logo.png" alt="6D Address" />
        <p>An open addressing method for places formal addressing systems have missed.</p>
      </div>
      <FooterColumn title="Product" links={[["Find my 6D", onFind], ["How it works", "#method"], ["Why locality matters", "#locality"]]} />
      <FooterColumn title="Audiences" links={[["Postal authorities", "#postal"], ["Developers", "#developers"], ["Delivery partners", "#contact"]]} />
      <FooterColumn title="Method" links={[["Open system", "#open-system"], ["Examples", "#examples"], ["FAQ", "#faq"]]} />
      <div className="footer-column">
        <h3>Contact</h3>
        <a href="mailto:contact@6daddress.com">contact@6daddress.com</a>
      </div>
      <div className="footer-bottom">
        <span>© 2026 6D Address</span>
        <span>Six digits plus locality.</span>
        <span>Privacy</span>
        <span>Terms</span>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: Array<[string, string | (() => void)]> }) {
  return (
    <div className="footer-column">
      <h3>{title}</h3>
      {links.map(([label, href]) => typeof href === "function" ? (
        <button key={label} onClick={href}>{label}</button>
      ) : (
        <a key={label} href={href}>{label}</a>
      ))}
    </div>
  );
}

function GpsPhoneIcon() {
  return (
    <svg viewBox="0 0 96 96" aria-hidden="true">
      <rect x="30" y="12" width="36" height="72" rx="8" />
      <path d="M40 68h16M48 28v28M34 42h28" />
      <circle cx="48" cy="42" r="10" />
    </svg>
  );
}

function QrMessageIcon() {
  return (
    <svg viewBox="0 0 96 96" aria-hidden="true">
      <path d="M18 22h60v42H42L26 78V64h-8V22Z" />
      <path d="M32 34h10v10H32zM54 34h10v10H54zM32 50h10v10H32zM54 50h4M64 50h2M54 58h12" />
    </svg>
  );
}

function RouteIcon() {
  return (
    <svg viewBox="0 0 96 96" aria-hidden="true">
      <path d="M20 74C32 44 52 58 58 34c4-17 18-18 24-12" />
      <circle cx="20" cy="74" r="7" />
      <path d="M78 22c-8 12-12 18-12 18S54 30 54 22a12 12 0 0 1 24 0Z" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.8" />
    </svg>
  );
}

export default App;
