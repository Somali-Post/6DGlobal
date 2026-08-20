type MapLoadingScreenProps = {
  isExiting?: boolean;
};

export function MapLoadingScreen({ isExiting = false }: MapLoadingScreenProps) {
  return (
    <section
      className={`map-loading-screen ${isExiting ? "is-exiting" : ""}`}
      role="status"
      aria-live="polite"
      aria-label="Loading map"
    >
      <img
        className="map-loading-screen__background"
        src="/images/map-loader-background.webp"
        alt=""
        aria-hidden="true"
      />

      <div className="map-loading-screen__content">
        <img className="map-loading-screen__brand" src="/navlogo-dark-320.webp" alt="6D Address" />

        <div className="map-loading-screen__locator" aria-hidden="true">
          <span className="map-loading-screen__ring map-loading-screen__ring--1" />
          <span className="map-loading-screen__ring map-loading-screen__ring--2" />
          <span className="map-loading-screen__ring map-loading-screen__ring--3" />
          <span className="map-loading-screen__ring map-loading-screen__ring--4" />
          <svg className="map-loading-screen__pin" viewBox="0 0 96 132" focusable="false">
            <defs>
              <linearGradient id="map-loader-pin" x1="48" y1="0" x2="48" y2="132" gradientUnits="userSpaceOnUse">
                <stop stopColor="#118BF5" />
                <stop offset="1" stopColor="#0758EA" />
              </linearGradient>
              <filter id="map-loader-pin-shadow" x="-60%" y="-30%" width="220%" height="190%">
                <feDropShadow dx="0" dy="9" stdDeviation="8" floodColor="#087CF5" floodOpacity=".28" />
              </filter>
            </defs>
            <path
              d="M48 3C24.8 3 6 21.8 6 45c0 31.6 42 83 42 83s42-51.4 42-83C90 21.8 71.2 3 48 3Z"
              fill="url(#map-loader-pin)"
              filter="url(#map-loader-pin-shadow)"
            />
            <circle cx="48" cy="45" r="16" fill="#F8FCFF" />
          </svg>
          <span className="map-loading-screen__pin-glow" />
        </div>

        <div className="map-loading-screen__copy">
          <h1>Loading map</h1>
          <p>Preparing your 6D Address</p>
        </div>

        <div className="map-loading-screen__dots" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      </div>
    </section>
  );
}
