import Link from "next/link";
import type { ReactNode } from "react";

export default function ContentPage({ title, description, children }: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="smartbet-content-page">
      <header className="smartbet-content-page__header">
        <Link href="/" className="smartbet-content-page__back">Home</Link>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </header>
      {children}
    </section>
  );
}
