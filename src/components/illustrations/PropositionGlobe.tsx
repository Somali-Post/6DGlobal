export function PropositionGlobe() {
  return (
    <svg className="proposition-globe" viewBox="0 0 520 700" role="img" aria-labelledby="proposition-globe-title proposition-globe-description">
      <title id="proposition-globe-title">A global 6D Address implementation network</title>
      <desc id="proposition-globe-description">A technical wireframe globe focused on Europe, Africa and the Middle East, connected to implementation, development and partnership nodes.</desc>
      <defs>
        <radialGradient id="globeHalo" cx="50%" cy="48%" r="54%"><stop offset="0" stopColor="#188be9" stopOpacity=".18"/><stop offset=".66" stopColor="#0a65bb" stopOpacity=".06"/><stop offset="1" stopColor="#07111e" stopOpacity="0"/></radialGradient>
        <linearGradient id="globeStroke" x1="110" y1="120" x2="420" y2="520" gradientUnits="userSpaceOnUse"><stop stopColor="#91d8ff"/><stop offset=".55" stopColor="#328fd8"/><stop offset="1" stopColor="#1b5e9d"/></linearGradient>
        <filter id="nodeGlow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <clipPath id="sphereClip"><circle cx="260" cy="320" r="174"/></clipPath>
      </defs>
      <circle className="proposition-globe__halo" cx="260" cy="320" r="245" fill="url(#globeHalo)"/>
      <circle className="proposition-globe__orbit proposition-globe__orbit--outer" cx="260" cy="320" r="224"/>
      <circle className="proposition-globe__orbit proposition-globe__orbit--inner" cx="260" cy="320" r="197"/>
      <g className="proposition-globe__connectors"><path d="M92 170Q180 205 218 270"/><path d="M430 160Q356 208 314 267"/><path d="M55 400Q151 394 205 366"/><path d="M462 412Q365 405 318 366"/><path d="M125 535Q183 450 229 399"/><path d="M397 535Q337 451 299 399"/></g>
      <g className="proposition-globe__satellites">
        <g transform="translate(70 145)"><circle r="25"/><path d="M-8 8V-7H8V8M-3 8V2h6v6M-10 8h20"/></g>
        <g transform="translate(446 147)"><circle r="25"/><path d="m-9 5 6-6 4 4 8-9M4-6h5v5"/></g>
        <g transform="translate(43 417)"><circle r="25"/><circle cx="-6" cy="0" r="4"/><circle cx="7" cy="-7" r="4"/><circle cx="7" cy="8" r="4"/><path d="m-2-2 5-3m-5 7 5 4"/></g>
        <g transform="translate(478 426)"><circle r="25"/><path d="M-9-8h7v7h-7zm11 10h7v7H2zM-2-5h4a4 4 0 0 1 4 4v3M-6-1v4a4 4 0 0 0 4 4h4"/></g>
        <g transform="translate(113 551)"><circle r="25"/><path d="m-8 7 7-7m3-3 6-6a8 8 0 0 1-10 10l-6 6 7 7 6-6"/></g>
        <g transform="translate(406 553)"><circle r="25"/><circle cx="-6" cy="-3" r="5"/><circle cx="7" cy="-3" r="5"/><path d="M-14 11c1-6 4-9 8-9s7 3 8 9m0 0c.5-4 2-7 6-7 3 0 5 2 6 7"/></g>
      </g>
      <circle className="proposition-globe__sphere" cx="260" cy="320" r="174" fill="#061425" fillOpacity=".76" stroke="url(#globeStroke)"/>
      <g clipPath="url(#sphereClip)" className="proposition-globe__grid"><ellipse cx="260" cy="320" rx="128" ry="174"/><ellipse cx="260" cy="320" rx="68" ry="174"/><path d="M86 320h348M103 249h314M104 391h312M142 190h236M142 450h236"/><path d="M91 305Q260 230 429 305M91 339Q260 414 429 339"/></g>
      <g clipPath="url(#sphereClip)" className="proposition-globe__land"><path d="M212 167l-13 22-20 10-7 22 17 17 27-5 14 16 20-6 9-27 22-12 7-24-18-18-29 8-14-9-15 6Z"/><path d="M219 249l-20 29 8 22-17 31 14 28 12 43 25 49 25-17 15-43 26-35-4-32 21-31-22-18-12-29-25 6-26-3Z"/><path d="M284 227l20-2 21 15 28 8 8 24-15 22-32-4-17-22-27-18 14-23Z"/><path d="M330 204l25-11 31 8 23 18-15 18-34 3-20-17-10-19Z"/><path d="M343 306l29 8 24 25-7 19-31-10-19-24 4-18Z"/></g>
      <g className="proposition-globe__routes"><path d="M211 282Q269 204 340 256"/><path d="M219 354Q275 283 356 334"/><path d="M235 401Q316 406 356 334"/></g>
      <g className="proposition-globe__nodes" filter="url(#nodeGlow)"><circle cx="211" cy="282" r="3"/><circle cx="340" cy="256" r="3"/><circle cx="219" cy="354" r="3"/><circle cx="356" cy="334" r="3"/><circle cx="235" cy="401" r="3"/></g>
      <g className="proposition-globe__badge" transform="translate(260 320)"><path d="M0-49 42-25v50L0 49l-42-24v-50Z"/><path d="M0-40 34-20v40L0 40l-34-20v-40Z"/><text x="0" y="6">6D</text><path className="proposition-globe__badge-axis" d="M-17 17h34M0-27v10"/></g>
      <g className="proposition-globe__legend" transform="translate(260 631)"><path d="M-105 0h210"/><circle cx="-105" r="3"/><circle cx="105" r="3"/><text x="0" y="-13">GLOBAL ADDRESS INFRASTRUCTURE</text><text x="0" y="22">06° · 6D NETWORK · ACTIVE</text></g>
    </svg>
  );
}
