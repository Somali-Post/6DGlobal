import { useId, useState } from "react";
import { addressExamples, splitCompleteAddress } from "../../data/addressExamples";

const missingItems = ["Property number", "Named street"];
const availableItems = ["Locality", "District / town / city", "Region", "Country"];

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
  const tablistId = useId();
  const [selectedCountry, setSelectedCountry] = useState("Somalia");
  const selectedExample = addressExamples.find((example) => example.country === selectedCountry) ?? addressExamples[0];
  const { displayLocality: completeLocality } = splitCompleteAddress(selectedExample);
  const addressLines = selectedExample.completeAddressLines.slice(1);

  return (
    <section className="craft-section craft-section--dark craft-grid-bg craft-grid-bg--dark problem-chapter" id="problem">
      <div className="craft-container problem-chapter__inner">
        <header className="problem-chapter__header craft-reveal">
          <p className="chapter-label">ADDRESSING THE PROBLEM</p>
          <h2 className="display-section">Where conventional addressing is incomplete, locality still exists.</h2>
          <p className="craft-lead">
            Many communities do not have consistent property numbers or named streets. But people often still use
            neighbourhoods, villages, districts, towns and regions to describe where they are. 6D Address adds a short
            coordinate-based reference to that existing local context.
          </p>
        </header>

        <div className="problem-chapter__control craft-panel craft-panel--dark craft-reveal">
          <p className="problem-chapter__control-label" id={`${tablistId}-label`}>Example context</p>
          <div className="problem-chapter__tabs" role="tablist" aria-labelledby={`${tablistId}-label`}>
              {addressExamples.map((example) => (
                <button
                  key={example.country}
                  type="button"
                  className="problem-chapter__tab"
                  role="tab"
                  aria-selected={selectedExample.country === example.country}
                  onClick={() => setSelectedCountry(example.country)}
                >
                  <span>{example.country}</span>
                  <span aria-hidden="true">{example.code}</span>
                </button>
              ))}
          </div>
        </div>

        <div className="problem-chapter__diagnostic craft-reveal">
          <div className="problem-chapter__column problem-chapter__column--missing">
            <span className="problem-chapter__kicker">Often missing</span>
            <ul>
              {missingItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="problem-chapter__column problem-chapter__column--available">
            <span className="problem-chapter__kicker">Usually available</span>
            <ul>
              {availableItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="problem-chapter__result">
            <span className="problem-chapter__kicker">Completed with 6D</span>
            <p className="problem-chapter__formula">
              <span>Local context</span>
              <span aria-hidden="true">+</span>
              <span>6D reference</span>
              <span aria-hidden="true">=</span>
              <strong>Complete address</strong>
            </p>

            <address className="problem-chapter__address">
              <span className="problem-chapter__address-label">{selectedExample.country} example</span>
              <span>
                <ColouredCode code={selectedExample.code} />
                <span className="problem-chapter__locality"> {completeLocality}</span>
              </span>
              {addressLines.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </address>

            <p className="problem-chapter__note">Six digits do not replace locality. They complete it.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
