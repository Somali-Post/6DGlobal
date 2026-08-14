import { NoWrap6D } from "../NoWrap6D";

const availableLocalityItems = ["Halane", "Mogadishu", "Wajadir", "Somalia"];

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
          <header className="problem-chapter__header craft-reveal">
            <h2 className="display-section">Addressing the problem</h2>
            <p className="craft-lead">
              A large portion of the world lives without formal addressing, leaving them unable to access basic civic,
              financial and emergency services. Adding <NoWrap6D /> to existing locality information bridges the addressing gap.
            </p>
          </header>

          <div className="problem-bridge craft-reveal" aria-label="Addressing gap and 6D Address solution">
            <article className="problem-bridge__panel problem-bridge__panel--problem">
              <h3>The problem</h3>
              <ul className="problem-bridge__list">
                <ProblemItem status="missing">Property number</ProblemItem>
                <ProblemItem status="missing">Street name</ProblemItem>
                <ProblemItem status="available">Village/Neighborhood</ProblemItem>
                <ProblemItem status="available">Town or City</ProblemItem>
                <ProblemItem status="available">District or County</ProblemItem>
                <ProblemItem status="available">Region/Country</ProblemItem>
              </ul>
              <p className="problem-bridge__footer">
                All address elements exist except:
                <strong>property number and street name</strong>
              </p>
            </article>

            <article className="problem-bridge__panel problem-bridge__panel--current">
              <h3>Current situation</h3>
              <ul className="problem-bridge__list">
                <ProblemItem status="missing">No property number</ProblemItem>
                <ProblemItem status="missing">Un-named street</ProblemItem>
                {availableLocalityItems.map((item) => (
                  <ProblemItem status="available" key={item}>{item}</ProblemItem>
                ))}
              </ul>
              <p className="problem-bridge__footer">
                All countries in the world have defined villages and neighborhoods
              </p>
            </article>

            <article className="problem-bridge__panel problem-bridge__panel--solution">
              <h3>The solution</h3>
              <div className="problem-bridge__solution-code">
                <span className="problem-bridge__solution-code-mark" aria-hidden="true">✓</span>
                <ColouredCode code="35-12-12" />
              </div>
              <ul className="problem-bridge__list">
                {availableLocalityItems.map((item) => (
                  <ProblemItem status="available" key={item}>{item}</ProblemItem>
                ))}
              </ul>
              <div className="problem-bridge__solution-footer">
                <p className="problem-bridge__footer">
                  <NoWrap6D /> replaces the missing
                  <strong>property number and street name</strong>
                </p>
                <div className="problem-s42-block">
                  <img
                    src="/images/s42badge.png"
                    alt="S42 compatible badge"
                    loading="lazy"
                    decoding="async"
                  />
                  <p>6D as part of a complete address</p>
                </div>
              </div>
            </article>
          </div>

          <p className="problem-bridge__closing">
            <span>In developing countries like Somalia, it will take many years to adopt property numbers and street names</span>
            <span><NoWrap6D /> immediately fills the gap and is compatible with future address solutions</span>
          </p>
        </div>
      </div>
    </section>
  );
}
