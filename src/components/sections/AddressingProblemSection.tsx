const problemStoryPanels = [
  {
    number: "01",
    title: "The problem",
    body: "The final delivery point is often the weakest part of an address.",
    items: [
      "Property number missing",
      "Street name absent or informal",
      "Postcode identifies an area, not the exact point",
    ],
  },
  {
    number: "02",
    title: "The current situation",
    body: "People still know places through local context.",
    items: [
      "Locality or neighbourhood",
      "District, town or region",
      "Landmarks and directions",
    ],
  },
];

function ColouredCode({ code }: { code: string }) {
  const [red, green, blue] = code.split("-");

  return (
    <span className="coloured-code">
      <span className="code-red">{red}</span>
      <span className="code-sep">-</span>
      <span className="code-green">{green}</span>
      <span className="code-sep">-</span>
      <span className="code-blue">{blue}</span>
    </span>
  );
}

export function AddressingProblemSection() {
  return (
    <section className="craft-section craft-section--dark craft-grid-bg craft-grid-bg--dark problem-chapter" id="problem">
      <div className="craft-container">
        <div className="problem-chapter__story">
          <header className="problem-chapter__header craft-reveal">
            <p className="chapter-label">ADDRESSING THE PROBLEM</p>
            <h2 className="display-section">The last mile often depends on local knowledge.</h2>
            <p className="craft-lead">
              Locality, districts, towns and postcodes may exist - but the exact delivery point can still be difficult
              to describe when property numbers or street names are missing.
            </p>
            <p className="problem-chapter__support-line">
              People often rely on landmarks and directions: near the market, opposite the school, behind the mosque,
              beside the clinic.
            </p>
            <div className="problem-s42-badge">
              <img
                src="/images/s42badge.png"
                alt="S42 address structure badge"
                loading="lazy"
                decoding="async"
              />
              <span>6D as part of a complete address</span>
            </div>
          </header>

          <div className="problem-storyline craft-reveal">
            {problemStoryPanels.map((panel, index) => (
              <article className="problem-storyline__panel" key={panel.number}>
                <span className="problem-storyline__number">{panel.number} - {panel.title}</span>
                <h3>{panel.title}</h3>
                <p>{panel.body}</p>
                <ul>
                  {panel.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>

                {index === 1 ? (
                  <div className="problem-storyline__country-example">
                    <span>Costa Rica example:</span>
                    <p>
                      A postcode and locality may exist, but the final description can still depend on directions such
                      as "near the church" or "200 metres from the main road."
                    </p>
                  </div>
                ) : null}
              </article>
            ))}

            <article className="problem-storyline__panel problem-storyline__panel--solution">
              <span className="problem-storyline__number">03 - The solution</span>
              <h3>The solution</h3>
              <p>
                6D adds a short final-location reference while keeping the existing address context.
              </p>

              <div className="problem-address-specimen">
                <span>Complete address structure</span>
                <ColouredCode code="74-93-25" />
                <address>
                  <span>Barrio / locality</span>
                  <span>Canton or district</span>
                  <span>Province</span>
                  <span>Postal code</span>
                  <span>Costa Rica</span>
                </address>
              </div>

              <p className="problem-storyline__note">
                The code identifies the final location. The rest of the address keeps the local and postal context.
              </p>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
