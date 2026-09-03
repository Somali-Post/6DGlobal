import { NoWrap6D } from "../NoWrap6D";

const solutionLocalityItems = ["Halane", "Wadajir", "Mogadishu", "Somalia"];

function ColouredCode({ code }: { code: string }) {
  const [red, green, blue] = code.split("-");

  return (
    <span className="coloured-code" aria-label={code}>
      <span className="code-red">{red}</span>
      <span className="code-sep">-</span>
      <span className="code-green">{green}</span>
      <span className="code-sep">-</span>
      <span className="code-blue">{blue}</span>
    </span>
  );
}

function ProblemItem({ status, children }: { status: "missing" | "available"; children: string }) {
  return (
    <li className={`problem-bridge__item problem-bridge__item--${status}`}>
      <span aria-hidden="true">{status === "missing" ? "×" : "✓"}</span>
      <span>{children}</span>
    </li>
  );
}

export function AddressingProblemSection() {
  return (
    <section className="craft-section craft-section--dark craft-grid-bg craft-grid-bg--dark problem-chapter" id="problem">
      <div className="craft-container">
        <div className="problem-chapter__story">
          <div className="problem-chapter__top craft-reveal">
            <header className="problem-chapter__header">
              <h2 className="display-section">Addressing the problem</h2>
              <div className="problem-chapter__intro">
                <p>Conventional address elements exist everywhere in the world:</p>
                <p>
                  Except the <strong>property number</strong> and <strong>street name</strong>
                </p>
              </div>
            </header>
          </div>

          <div className="problem-bridge problem-bridge--two-panel craft-reveal" aria-label="Addressing gap and 6D Address solution">
            <article className="problem-bridge__panel problem-bridge__panel--problem">
              <h3>The problem</h3>
              <ul className="problem-bridge__list">
                <ProblemItem status="missing">Property number</ProblemItem>
                <ProblemItem status="missing">Street name</ProblemItem>
                <ProblemItem status="available">Village/Neighborhood</ProblemItem>
                <ProblemItem status="available">District or County</ProblemItem>
                <ProblemItem status="available">Town or City</ProblemItem>
                <ProblemItem status="available">Region/Country</ProblemItem>
              </ul>
              <p className="problem-bridge__footer">
                <span>Every country in the world has defined</span>
                <span>
                  <strong>localities</strong>, <strong>towns</strong>, <strong>cities</strong> and <strong>regions</strong>
                </span>
              </p>
            </article>

            <article className="problem-bridge__panel problem-bridge__panel--solution">
              <h3>The solution</h3>
              <ul className="problem-bridge__list">
                <li className="problem-bridge__item problem-bridge__item--available problem-bridge__item--code">
                  <span aria-hidden="true">✓</span>
                  <span className="problem-bridge__code-value">
                    <ColouredCode code="35-12-12" />
                  </span>
                </li>
                {solutionLocalityItems.map((item) => (
                  <ProblemItem status="available" key={item}>{item}</ProblemItem>
                ))}
              </ul>
              <p className="problem-bridge__footer">
                <span><NoWrap6D /> replaces the missing</span>
                <span>
                  <strong>property number</strong> and <strong>street name</strong>
                </span>
              </p>
            </article>
          </div>

          <p className="problem-bridge__closing">
            <span className="problem-bridge__closing-line">
              In developing countries like Somalia, it will take many years to adopt property numbers and street names
            </span>
            <span className="problem-bridge__closing-line">
              <NoWrap6D /> immediately fills the gap and is compatible with future address solutions
            </span>
          </p>

          <div className="problem-s42-block problem-s42-block--closing">
            <img
              src="/images/s42badge.png"
              alt="S42 compatible badge"
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
