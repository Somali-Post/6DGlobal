import { MouseEvent, PointerEvent, TouchEvent, useEffect, useLayoutEffect, useRef, useState } from "react";
import { NoWrap6D } from "../NoWrap6D";
import { LandmarkExample, landmarkExamples } from "../../data/landmarkExamples";

const LANDMARK_AUTOPLAY_DELAY = 5400;
const CARD_CLICK_DRAG_THRESHOLD = 6;
const SLIDE_DRAG_THRESHOLD = 42;

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
  onCardClick,
}: {
  example: LandmarkExample;
  isActive: boolean;
  isEdge: boolean;
  isDuplicate?: boolean;
  onCardClick: (event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  const href = `/find?lat=${example.lat}&lng=${example.lng}&label=${encodeURIComponent(example.name)}`;

  return (
    <a
      className={`address-example-card ${isActive ? "is-active" : ""} ${isEdge ? "is-edge" : ""}`}
      href={href}
      aria-label={`Open ${example.name} on the 6D map`}
      aria-hidden={isDuplicate}
      tabIndex={isDuplicate ? -1 : 0}
      onClick={onCardClick}
    >
      <div className="address-example-card__body">
        <h3 className="address-example-card__title">{example.name}</h3>
        <address className="address-example-card__address" aria-label={`${example.name} address`}>
          <span>{example.addressLine1}</span>
          <span className="address-example-card__code-line">
            <ColouredCode code={example.code} className="address-example-card__inline-code" />
            <span>{example.locality}</span>
          </span>
          {example.addressLine3 ? <span>{example.addressLine3}</span> : null}
          <span>{example.country}</span>
        </address>
      </div>

      <div className="address-example-card__media">
        <img
          src={example.imagePath}
          alt={`${example.name} landmark`}
          loading={isActive ? "eager" : "lazy"}
          decoding="async"
          style={example.imagePosition ? { objectPosition: example.imagePosition } : undefined}
        />
        <span className="address-example-card__photo-ring" aria-hidden="true" />
        <span className="address-example-card__photo-pin" aria-hidden="true">
          <span className="address-example-card__photo-pin-dot" />
        </span>
      </div>
    </a>
  );
}

export function ExamplesSection() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [interactionPaused, setInteractionPaused] = useState(false);
  const [temporaryPaused, setTemporaryPaused] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [documentHidden, setDocumentHidden] = useState(() => document.hidden);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const dragStartX = useRef<number | null>(null);
  const suppressCardClickRef = useRef(false);
  const manualPauseTimer = useRef<number | null>(null);
  const examples = landmarkExamples;
  const total = examples.length;
  const loopStartIndex = total * 3;
  const [trackIndex, setTrackIndex] = useState(loopStartIndex);
  const [slideMetrics, setSlideMetrics] = useState({ cardWidth: 0, step: 0, viewportWidth: 0, rightEdgeOffset: 3 });
  const [suppressTransition, setSuppressTransition] = useState(true);
  const activeIndex = ((trackIndex % total) + total) % total;
  const autoplayPaused = prefersReducedMotion || interactionPaused || temporaryPaused || userPaused || documentHidden;
  const carouselExamples = Array.from({ length: 7 }, () => examples).flat();
  const trackOffset = slideMetrics.step > 0
    ? trackIndex * slideMetrics.step - Math.max(0, (slideMetrics.viewportWidth - slideMetrics.cardWidth * 2 - (slideMetrics.step - slideMetrics.cardWidth)) / 2)
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
    setTemporaryPaused(true);
    if (manualPauseTimer.current !== null) window.clearTimeout(manualPauseTimer.current);
    manualPauseTimer.current = window.setTimeout(() => setTemporaryPaused(false), LANDMARK_AUTOPLAY_DELAY);
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
    if (trackIndex >= total * 2 && trackIndex < total * 5) return;

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
      const visibleAfterActive = Math.ceil((viewportWidth - cardWidth) / (cardWidth + gap));

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
  }, []);

  const markDragDistance = (clientX: number) => {
    if (dragStartX.current === null) return;
    const distance = clientX - dragStartX.current;
    if (Math.abs(distance) > CARD_CLICK_DRAG_THRESHOLD) suppressCardClickRef.current = true;
  };

  const finishDrag = (clientX: number) => {
    if (dragStartX.current === null) return;
    const distance = clientX - dragStartX.current;
    dragStartX.current = null;

    if (Math.abs(distance) <= CARD_CLICK_DRAG_THRESHOLD) {
      suppressCardClickRef.current = false;
      return;
    }

    suppressCardClickRef.current = true;
    if (Math.abs(distance) < SLIDE_DRAG_THRESHOLD) return;
    if (distance < 0) goNext();
    else goPrevious();
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    dragStartX.current = event.clientX;
    suppressCardClickRef.current = false;
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    markDragDistance(event.clientX);
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    finishDrag(event.clientX);
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    dragStartX.current = event.touches[0]?.clientX ?? null;
    suppressCardClickRef.current = false;
  };

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    if (!touch) return;
    markDragDistance(touch.clientX);
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.changedTouches[0];
    if (!touch) return;
    finishDrag(touch.clientX);
  };

  const handleCardClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!suppressCardClickRef.current) return;
    event.preventDefault();
    window.setTimeout(() => {
      suppressCardClickRef.current = false;
    }, 0);
  };

  return (
    <section className="craft-section craft-section--light examples-chapter address-examples" id="examples">
      <div className="craft-container address-examples__inner">
        <div className="examples-chapter__header craft-grid address-examples__header">
          <div className="examples-chapter__title craft-reveal">
            <h2 className="display-section"><NoWrap6D /> in action</h2>
          </div>
          <div className="examples-chapter__intro craft-reveal">
            <p className="craft-lead address-examples__lead">
              <NoWrap6D /> can address existing landmarks using existing locality information people already recognise
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
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={() => {
              dragStartX.current = null;
              suppressCardClickRef.current = false;
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
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
                  isDuplicate={index < trackIndex - 1 || index > trackIndex + slideMetrics.rightEdgeOffset}
                  onCardClick={handleCardClick}
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

          <div className="examples-carousel__controls" aria-label="Carousel controls">
            <button type="button" className="examples-carousel__control" onClick={goPrevious}>
              <ChevronIcon direction="previous" />
              <span>Previous</span>
            </button>
            <span className="examples-carousel__status" aria-live="polite">
              {String(activeIndex + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
            </span>
            <button
              type="button"
              className="examples-carousel__control"
              onClick={() => setUserPaused((paused) => !paused)}
              aria-pressed={userPaused}
            >
              {userPaused ? "Play" : "Pause"}
            </button>
            <button type="button" className="examples-carousel__control" onClick={goNext}>
              <span>Next</span>
              <ChevronIcon direction="next" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
