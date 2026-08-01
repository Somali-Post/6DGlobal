import { useState } from "react";

type AddressExample = {
  country: string;
  latitude: number;
  longitude: number;
  code: string;
  contextLines: string[];
  completeAddressLines: string[];
};

const missingItems = ["Property number", "Named street"];
const availableItems = ["Village or neighbourhood", "Town or city", "District or county", "Region"];

const addressExamples: AddressExample[] = [
  {
    country: "Somalia",
    latitude: 2.032189,
    longitude: 45.312983,
    code: "31-22-19",
    contextLines: ["Hodan, Mogadishu", "Somalia"],
    completeAddressLines: ["31-22-19 Hodan, Mogadishu", "Somalia"],
  },
  {
    country: "Pakistan",
    latitude: 26.932701,
    longitude: 64.078386,
    code: "37-28-73",
    contextLines: ["Panjgur District", "Balochistan", "Pakistan"],
    completeAddressLines: ["37-28-73 Panjgur District", "Balochistan", "Pakistan"],
  },
  {
    country: "India",
    latitude: 12.277211,
    longitude: 76.637814,
    code: "73-77-28",
    contextLines: ["JP Nagar", "Mysuru", "India"],
    completeAddressLines: ["73-77-28 JP Nagar", "Mysuru", "India"],
  },
  {
    country: "Sierra Leone",
    latitude: 7.879227,
    longitude: -11.343555,
    code: "74-93-25",
    contextLines: ["Blama", "Kenema District", "Sierra Leone"],
    completeAddressLines: ["74-93-25 Blama", "Kenema District", "Sierra Leone"],
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
  const [selectedCountry, setSelectedCountry] = useState("Somalia");
  const selectedExample = addressExamples.find((example) => example.country === selectedCountry) ?? addressExamples[0];
  const firstCompleteLine = selectedExample.completeAddressLines[0] ?? "";
  const completeLocality = firstCompleteLine.startsWith(selectedExample.code)
    ? firstCompleteLine.slice(selectedExample.code.length).trimStart()
    : firstCompleteLine;

  return (
    <section className="addressing-problem" id="addressing-problem">
      <div className="addressing-problem__inner">
        <div className="addressing-problem__top">
          <div className="addressing-problem__intro">
            <p className="section-eyebrow">THE ADDRESSING GAP</p>
            <h2>Addressing the problem</h2>
            <p>
              Many communities already use local place names such as villages, neighbourhoods, districts, towns, roads or
              landmarks. What is often missing is a property number, named street or precise delivery reference. 6D Address
              works with existing locality information to help bridge that gap.
            </p>
          </div>

          <div className="problem-selector">
            <span className="problem-selector__label">EXAMPLE FROM THE GLOBE</span>
            <div className="problem-selector__buttons" aria-label="Choose example country">
              {addressExamples.map((example) => (
                <button
                  key={example.country}
                  type="button"
                  className={`problem-selector__button ${selectedExample.country === example.country ? "is-active" : ""}`}
                  onClick={() => setSelectedCountry(example.country)}
                >
                  {example.country}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="addressing-problem__body">
          <aside className="address-gap-stack" aria-label="Address information availability">
            <article className="gap-mini-panel gap-mini-panel--missing">
              <span className="gap-mini-panel__label">Missing</span>
              <ul>
                {missingItems.map((item) => (
                  <li key={item}>
                    <span aria-hidden="true">x</span>
                    {item}
                  </li>
                ))}
              </ul>
            </article>

            <article className="gap-mini-panel gap-mini-panel--available">
              <span className="gap-mini-panel__label">Already available</span>
              <ul>
                {availableItems.map((item) => (
                  <li key={item}>
                    <span aria-hidden="true">{"\u2713"}</span>
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          </aside>

          <div className="address-transform" aria-label="Local context plus 6D reference creates a complete address">
            <article className="address-transform__card">
              <span className="address-transform__label">Current local context</span>
              <div className="address-transform__lines">
                {selectedExample.contextLines.map((line, index) =>
                  index === 0 ? (
                    <strong key={line}>{line}</strong>
                  ) : (
                    <span key={line}>{line}</span>
                  ),
                )}
              </div>
            </article>

            <div className="address-transform__operator" aria-hidden="true">
              +
            </div>

            <article className="address-transform__code">
              <span className="address-transform__label">Added 6D reference</span>
              <ColouredCode code={selectedExample.code} />
            </article>

            <div className="address-transform__operator" aria-hidden="true">
              =
            </div>

            <article className="address-transform__card address-transform__card--complete">
              <span className="address-transform__label">Complete 6D address</span>
              <div className="address-transform__complete-line">
                <ColouredCode code={selectedExample.code} />
                <strong>{completeLocality}</strong>
              </div>
              <div className="address-transform__lines">
                {selectedExample.completeAddressLines.slice(1).map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </div>
            </article>

            <p className="address-transform__note">
              These examples use locations already shown on the globe and are provided to illustrate the 6D address
              format.
            </p>

            <p className="addressing-problem__closing">Six digits do not replace locality. They complete it.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
