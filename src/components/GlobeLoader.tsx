import "./GlobeLoader.css";

export function GlobeLoader({ progress, failed = false, className = "" }: { progress: number; failed?: boolean; className?: string }) {
  return (
    <div className={`globe-loader ${failed ? "is-failed" : ""} ${className}`} role="status">
      <span className="globe-loader__orbit" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c3 2.5 4.5 5.5 4.5 9S15 18.5 12 21c-3-2.5-4.5-5.5-4.5-9S9 5.5 12 3Z" />
        </svg>
      </span>
      <span>{failed ? "Globe unavailable" : "Loading globe"}</span>
      {!failed && <span className="globe-loader__progress" aria-hidden="true">{progress}%</span>}
    </div>
  );
}
