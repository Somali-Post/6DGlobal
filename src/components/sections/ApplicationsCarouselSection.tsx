import { CSSProperties, PointerEvent, useRef, useState } from "react";
import { NoWrap6D } from "../NoWrap6D";

type Application = {
  title: string;
  body: string;
  image: string;
  accent: string;
};

const applications: Application[] = [
  {
    title: "National Address",
    body: "A cost-effective, rapid way to provide last-mile addresses where property numbers and street names are missing.",
    image: "/images/applications/national-address.webp",
    accent: "var(--sixd-blue)",
  },
  {
    title: "Digital Address",
    body: "A reliable, guaranteed digital address for places where existing address information cannot be trusted.",
    image: "/images/applications/digital-address.webp",
    accent: "var(--sixd-green)",
  },
  {
    title: "Financial Inclusion",
    body: "Help financial institutions verify where customers live and extend access to essential services.",
    image: "/images/applications/financial-inclusion.webp",
    accent: "var(--sixd-red)",
  },
  {
    title: "Refugee Camps",
    body: "Give development agencies precise, practical addresses for people and services in refugee camps.",
    image: "/images/applications/refugee-camps.webp",
    accent: "var(--sixd-blue)",
  },
  {
    title: "Utility Addressing",
    body: "Identify utility points, meters and network assets that would otherwise have no usable address.",
    image: "/images/applications/utility-addressing.webp",
    accent: "var(--sixd-green)",
  },
  {
    title: "Disaster Relief",
    body: "Pinpoint aid drops, rescue points and critical locations so disaster relief reaches the right place faster.",
    image: "/images/applications/disaster-relief.webp",
    accent: "var(--sixd-red)",
  },
  {
    title: "ID Cards",
    body: "Add precise address data to identity cards and help connect each individual to a verified location.",
    image: "/images/applications/id-cards.webp",
    accent: "var(--sixd-blue)",
  },
  {
    title: "Informal Settlements",
    body: "Provide usable address data for communities that conventional systems cannot formally address.",
    image: "/images/applications/informal-settlements.webp",
    accent: "var(--sixd-green)",
  },
  {
    title: "Emergency Response",
    body: "Help emergency services locate incidents accurately and reduce the time it takes to respond.",
    image: "/images/applications/emergency-response.webp",
    accent: "var(--sixd-red)",
  },
  {
    title: "Marketing Areas",
    body: "Create precise geographic areas for planning campaigns, customer coverage and local outreach.",
    image: "/images/applications/marketing-areas.webp",
    accent: "var(--sixd-blue)",
  },
  {
    title: "Opt-in Database",
    body: "Build consent-led location records that make reliable last-mile services and deliveries possible.",
    image: "/images/applications/opt-in-database.webp",
    accent: "var(--sixd-green)",
  },
  {
    title: "Leisure Address",
    body: "Share exact meeting points for parks, festivals, events and outdoor leisure activities.",
    image: "/images/applications/leisure-address.webp",
    accent: "var(--sixd-red)",
  },
];

export function ApplicationsCarouselSection() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ active: false, x: 0, scrollLeft: 0 });
  const [activeIndex, setActiveIndex] = useState(0);
  const [dragging, setDragging] = useState(false);

  const scrollToIndex = (index: number) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const cards = Array.from(viewport.querySelectorAll<HTMLElement>(".applications-carousel__card"));
    const nextIndex = Math.max(0, Math.min(index, cards.length - 1));
    const card = cards[nextIndex];
    if (!card) return;
    viewport.scrollTo({ left: card.offsetLeft, behavior: "smooth" });
  };

  const updateActiveIndex = () => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const cards = Array.from(viewport.querySelectorAll<HTMLElement>(".applications-carousel__card"));
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;
    cards.forEach((card, index) => {
      const distance = Math.abs(card.offsetLeft - viewport.scrollLeft);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });
    setActiveIndex(closestIndex);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    dragRef.current = { active: true, x: event.clientX, scrollLeft: event.currentTarget.scrollLeft };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    event.currentTarget.scrollLeft = dragRef.current.scrollLeft - (event.clientX - dragRef.current.x);
  };

  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setDragging(false);
    updateActiveIndex();
  };

  return (
    <section id="applications" className="craft-section craft-section--blueprint craft-grid-bg applications-carousel">
      <div className="craft-container applications-carousel__container">
        <header className="applications-carousel__header craft-reveal">
          <h2 className="display-section">Where 6D can help</h2>
          <p className="craft-lead">
            <NoWrap6D /> can support a wide range of use cases where last-mile location information is incomplete,
            unreliable or missing.
          </p>
        </header>

        <div className="applications-carousel__stage craft-reveal">
          <div
            ref={viewportRef}
            className={`applications-carousel__viewport${dragging ? " is-dragging" : ""}`}
            onScroll={updateActiveIndex}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft") scrollToIndex(activeIndex - 1);
              if (event.key === "ArrowRight") scrollToIndex(activeIndex + 1);
            }}
            tabIndex={0}
            role="region"
            aria-roledescription="carousel"
            aria-label="6D Address applications"
          >
            <div className="applications-carousel__track">
              {applications.map((application, index) => (
                <article
                  className="applications-carousel__card"
                  style={{ "--application-accent": application.accent } as CSSProperties}
                  key={application.title}
                  aria-label={`${index + 1} of ${applications.length}: ${application.title}`}
                >
                  <div className="applications-carousel__illustration" aria-hidden="true">
                    <img
                      src={application.image}
                      alt=""
                      loading={index < 4 ? "eager" : "lazy"}
                      decoding="async"
                    />
                  </div>
                  <div className="applications-carousel__card-copy">
                    <span className="applications-carousel__card-index">{String(index + 1).padStart(2, "0")}</span>
                    <h3>{application.title}</h3>
                    <p>{application.body}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <button
            className="applications-carousel__arrow applications-carousel__arrow--previous"
            type="button"
            onClick={() => scrollToIndex(activeIndex - 1)}
            disabled={activeIndex === 0}
            aria-label="Previous application"
          >
            <ArrowIcon direction="previous" />
          </button>
          <button
            className="applications-carousel__arrow applications-carousel__arrow--next"
            type="button"
            onClick={() => scrollToIndex(activeIndex + 1)}
            disabled={activeIndex === applications.length - 1}
            aria-label="Next application"
          >
            <ArrowIcon direction="next" />
          </button>
        </div>

        <div className="applications-carousel__footer craft-reveal">
          <div className="applications-carousel__progress" aria-hidden="true">
            <span style={{ transform: `scaleX(${(activeIndex + 1) / applications.length})` }} />
          </div>
          <div className="applications-carousel__dots" aria-label="Choose an application">
            {applications.map((application, index) => (
              <button
                type="button"
                className={index === activeIndex ? "is-active" : ""}
                onClick={() => scrollToIndex(index)}
                aria-label={`Show ${application.title}`}
                aria-current={index === activeIndex ? "true" : undefined}
                key={application.title}
              />
            ))}
          </div>
          <p className="applications-carousel__count" aria-live="polite">
            <strong>{String(activeIndex + 1).padStart(2, "0")}</strong>
            <span>/ {String(applications.length).padStart(2, "0")}</span>
          </p>
        </div>
      </div>
    </section>
  );
}

function ArrowIcon({ direction }: { direction: "previous" | "next" }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={direction === "previous" ? "m14.5 5-7 7 7 7" : "m9.5 5 7 7-7 7"} />
    </svg>
  );
}
