import { ReactNode } from "react";

const brandPhrase = "6D Address";

export function NoWrap6D() {
  return <span className="nowrap-6d">{brandPhrase}</span>;
}

export function renderNoWrap6D(text: string): ReactNode {
  const parts = text.split(brandPhrase);

  if (parts.length === 1) return text;

  return parts.map((part, index) => (
    <span key={`${part}-${index}`}>
      {index > 0 ? <NoWrap6D /> : null}
      {part}
    </span>
  ));
}
