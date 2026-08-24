import { ReactNode } from "react";
import { renderNoWrap6D } from "../NoWrap6D";
import { PropositionGlobe } from "../illustrations/PropositionGlobe";
import "./PropositionSection.css";

type IconName = "location" | "access" | "connect" | "growth" | "tools" | "partner" | "network" | "license";

const dreams: { copy: string; icon: IconName }[] = [
  { copy: "We want 6D Address to become the number one digital address system in the world", icon: "location" },
  { copy: "We want 6D Address to address the unaddressed", icon: "access" },
  { copy: "We want 6D Address to connect the disconnected", icon: "connect" },
  { copy: "We want 6D Address to facilitate social and economic development", icon: "growth" },
];

const propositions: { copy: string; icon: IconName }[] = [
  { copy: "We want you to use 6D Address to develop suitable tools that deliver our dreams", icon: "tools" },
  { copy: "We want to partner with you to develop solutions for the unaddressed", icon: "partner" },
  { copy: "We want to partner with you to connect the disconnected", icon: "network" },
  { copy: "In return we ask for a small license fee to use the 6D Address brand", icon: "license" },
];

function TechnicalIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    location: <><path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z"/><circle cx="12" cy="10" r="2"/></>,
    access: <><path d="M4 19V5h16v14M8 19v-5h8v5M7 9h2m2 0h2m2 0h2"/><path d="M2 19h20"/></>,
    connect: <><circle cx="6" cy="12" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><path d="m8.7 10.7 6.6-3.4m-6.6 6 6.6 3.4"/></>,
    growth: <><path d="M4 20V10m6 10V6m6 14V3m4 17H2"/><path d="m4 7 5-3 5 1 6-4"/></>,
    tools: <><path d="m14.5 6.5 3-3a4 4 0 0 1-5 5L5 16l3 3 7.5-7.5a4 4 0 0 1 5-5l-3 3"/><path d="m4 4 4 4"/></>,
    partner: <><circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2.5 20c.4-4 2.2-6 5.5-6s5.1 2 5.5 6m0-5.2c3.8-.9 6.7.9 7 5.2"/></>,
    network: <><rect x="3" y="3" width="6" height="6"/><rect x="15" y="15" width="6" height="6"/><path d="M9 6h6a3 3 0 0 1 3 3v6M6 9v6a3 3 0 0 0 3 3h6"/></>,
    license: <><path d="M5 3h11l3 3v15H5z"/><path d="M16 3v4h4M8 11h8m-8 4h5"/><circle cx="16" cy="16" r="2.5"/></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

function PropositionColumn({ title, items, side }: { title: string; items: { copy: string; icon: IconName }[]; side: "left" | "right" }) {
  return (
    <div className={`proposition-column proposition-column--${side}`}>
      <div className="proposition-column__heading">
        <span aria-hidden="true">0{side === "left" ? "1" : "2"}</span>
        <h2>{title}</h2>
      </div>
      <div className="proposition-column__cards">
        {items.map((item, index) => (
          <article className="proposition-card" key={item.copy}>
            <span className="proposition-card__icon"><TechnicalIcon name={item.icon} /></span>
            <p>{renderNoWrap6D(item.copy)}</p>
            <span className="proposition-card__number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
          </article>
        ))}
      </div>
    </div>
  );
}

export function PropositionSection() {
  return (
    <section id="proposition" className="craft-section craft-section--dark craft-grid-bg craft-grid-bg--dark proposition-section">
      <div className="craft-container proposition-section__inner">
        <p className="proposition-section__eyebrow"><span>Global vision</span><span>Practical rollout</span></p>
        <div className="proposition-section__composition">
          <PropositionColumn title="Our Dreams" items={dreams} side="left" />
          <div className="proposition-section__artwork" aria-label="Global 6D addressing and partnership network"><PropositionGlobe /></div>
          <PropositionColumn title="Our Proposition" items={propositions} side="right" />
        </div>
        <a className="proposition-section__cta" href="#contact">
          <span className="proposition-section__cta-icon" aria-hidden="true"><TechnicalIcon name="partner" /></span>
          <span>Contact us today to see how we can work together</span>
          <span className="proposition-section__cta-arrow" aria-hidden="true">↗</span>
        </a>
      </div>
    </section>
  );
}
