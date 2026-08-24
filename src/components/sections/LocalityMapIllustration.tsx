import { localityExample } from "../../data/localityExamples";
import "./LocalityMapIllustration.css";

const mapDescription = `OpenStreetMap of London showing ${localityExample.places
  .map((place) => place.name)
  .join(", ")}. Each plotted coordinate calculates to the shared 6D code ${localityExample.code}.`;

export function LocalityMapIllustration() {
  return (
    <figure className="locality-map-export craft-reveal">
      <div className="locality-map-export__viewport" tabIndex={0} aria-label="Scrollable map of verified London localities">
        <img
          src="/images/locality/london-shared-code-map.webp"
          alt={mapDescription}
          width="1400"
          height="900"
          loading="lazy"
          decoding="async"
        />
      </div>
    </figure>
  );
}
