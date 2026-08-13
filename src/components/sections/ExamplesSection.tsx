import { PointerEvent, TouchEvent, useEffect, useLayoutEffect, useRef, useState } from "react";
import { LandmarkExampleWithCode, landmarkExamples, withCalculatedCode } from "../../data/landmarkExamples";

const LANDMARK_AUTOPLAY_DELAY = 4200;

function usePrefersReducedMotion() {
  const getInitialValue = () =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(getInitialValue);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReducedMotion(mediaQuery.matches);

    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return prefersReducedMotion;
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

function MapPinIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 21s6-5.23 6-11a6 6 0 0 0-12 0c0 5.77 6 11 6 11Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 12.35a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GlobeIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.6 9h16.8M3.6 15h16.8M12 3c2.2 2.36 3.26 5.36 3.26 9S14.2 18.64 12 21c-2.2-2.36-3.26-5.36-3.26-9S9.8 5.36 12 3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronIcon({ direction }: { direction: "previous" | "next" }) {
  const path = direction === "previous" ? "M15 18 9 12 15 6" : "M9 18 15 12 9 6";

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path
        d={path}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AddressExampleCard({
  example,
  isActive,
  isEdge,
  isDuplicate = false,
}: {
  example: LandmarkExampleWithCode;
  isActive: boolean;
  isEdge: boolean;
  isDuplicate?: boolean;
}) {
  return (
    <article
      className={`address-example-card ${isActive ? "is-active" : ""} ${isEdge ? "is-edge" : ""}`}
      aria-hidden={isDuplicate}
    >
      <div className="address-example-card__body">
        <ColouredCode code={example.code} className="address-example-card__code" />
        <h3 className="address-example-card__title">{example.name}</h3>
        <div className="address-example-card__meta" aria-label={`${example.name} locality details`}>
          <div className="address-example-card__meta-row">
            <MapPinIcon className="address-example-card__meta-icon" />
            <span>{example.siteLine}</span>
          </div>
          <div className="address-example-card__meta-row">
            <GlobeIcon className="address-example-card__meta-icon" />
            <span>{example.cityCountryLine}</span>
          </div>
        </div>
      </div>

      <div className="address-example-card__media">
        <img src={example.imagePath} alt={`${example.name} landmark`} loading="lazy" decoding="async" />
        <span className="address-example-card__photo-ring" aria-hidden="true" />
        <span className="address-example-card__photo-pin" aria-hidden="true">
          <span className="address-example-card__photo-pin-dot" />
        </span>
      </div>
    </article>
  );
}

export function ExamplesSection() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [interactionPaused, setInteractionPaused] = useState(false);
  const [manualPaused, setManualPaused] = useState(false);
  const [documentHidden, setDocumentHidden] = useState(() => document.hidden);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const dragStartX = useRef<number | null>(null);
  const manualPauseTimer = useRef<number | null>(null);
  const examples = landmarkExamples.map(withCalculatedCode);
  const total = examples.length;
  const loopStartIndex = total * 2;
  const [trackIndex, setTrackIndex] = useState(loopStartIndex);
  const [slideMetrics, setSlideMetrics] = useState({ cardWidth: 0, step: 0, viewportWidth: 0, rightEdgeOffset: 3 });
  const [suppressTransition, setSuppressTransition] = useState(true);
  const activeIndex = ((trackIndex % total) + total) % total;
  const autoplayPaused = prefersReducedMotion || interactionPaused || manualPaused || documentHidden;
  const carouselExamples = Array.from({ length: 5 }, () => examples).flat();
  const trackOffset = slideMetrics.step > 0
    ? trackIndex * slideMetrics.step - Math.max(0, (slideMetrics.viewportWidth - slideMetrics.cardWidth) / 2)
    : 0;

  useEffect(() => {
    if (autoplayPaused || total < 2) return;
    const timer = window.setInterval(() => {
      setTrackIndex((index) => index + 1);
    }, LANDMARK_AUTOPLAY_DELAY);

    return () => window.clearInterval(timer);
  }, [autoplayPaused, total]);

  useEffect(() => {
    return () => {
      if (manualPauseTimer.current !== null) window.clearTimeout(manualPauseTimer.current);
    };
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => setDocumentHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  const pauseAfterManualAction = () => {
    setManualPaused(true);
    if (manualPauseTimer.current !== null) window.clearTimeout(manualPauseTimer.current);
    manualPauseTimer.current = window.setTimeout(() => setManualPaused(false), LANDMARK_AUTOPLAY_DELAY);
  };

  const goPrevious = () => {
    pauseAfterManualAction();
    setTrackIndex((index) => index - 1);
  };

  const goNext = () => {
    pauseAfterManualAction();
    setTrackIndex((index) => index + 1);
  };

  const resetLoopPosition = () => {
    if (trackIndex >= total * 2 && trackIndex < total * 3) return;

    setSuppressTransition(true);
    setTrackIndex(activeIndex + loopStartIndex);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setSuppressTransition(false));
    });
  };

  useEffect(() => {
    if (prefersReducedMotion) resetLoopPosition();
  });

  useLayoutEffect(() => {
    const updateOffset = () => {
      const track = trackRef.current;
      const firstCard = track?.querySelector<HTMLElement>(".address-example-card");
      if (!track || !firstCard) return;

      const trackStyles = window.getComputedStyle(track);
      const gap = Number.parseFloat(trackStyles.columnGap || trackStyles.gap || "0") || 0;
      const cardWidth = firstCard.getBoundingClientRect().width;
      const viewportWidth = track.parentElement?.getBoundingClientRect().width ?? cardWidth;
      const visibleAfterActive = Math.floor((viewportWidth - cardWidth / 2) / (cardWidth + gap));

      setSlideMetrics({
        cardWidth,
        step: cardWidth + gap,
        viewportWidth,
        rightEdgeOffset: Math.max(1, visibleAfterActive),
      });
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
            <h2 className="display-section">6D Address in action</h2>
          </div>
          <div className="examples-chapter__intro craft-reveal">
            <p className="craft-lead address-examples__lead">
              The same format can identify familiar places around the world. Each example combines a six-digit reference
              with locality information people already recognise.
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
          <button
            type="button"
            className="examples-carousel__arrow examples-carousel__arrow--prev"
            onClick={goPrevious}
            aria-label="Previous example"
          >
            <ChevronIcon direction="previous" />
          </button>

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
              onTransitionEnd={(event) => {
                if (event.propertyName === "transform") resetLoopPosition();
              }}
              style={{ transform: `translate3d(-${trackOffset}px, 0, 0)` }}
            >
              {carouselExamples.map((example, index) => (
                <AddressExampleCard
                  example={example}
                  isActive={index === trackIndex}
                  isEdge={index === trackIndex - 1 || index === trackIndex + slideMetrics.rightEdgeOffset}
                  isDuplicate={index < total * 2 || index >= total * 3}
                  key={`${example.id}-${index}`}
                />
              ))}
            </div>
          </div>

          <button
            type="button"
            className="examples-carousel__arrow examples-carousel__arrow--next"
            onClick={goNext}
            aria-label="Next example"
          >
            <ChevronIcon direction="next" />
          </button>
        </div>
      </div>
    </section>
  );
}
