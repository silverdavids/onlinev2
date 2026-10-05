"use client";

import Link from "next/link";
import React from "react";

type Action = {
  href: string;
  label: string;
  variant?: "primary" | "secondary";
};

type InfoItem = {
  label: string;
  value: React.ReactNode;
};

type LegacyInfoPageProps = {
  title: string;
  eyebrow?: string;
  description: string;
  actions?: Action[];
  items?: InfoItem[];
  children?: React.ReactNode;
};

export default function LegacyInfoPage({
  title,
  eyebrow,
  description,
  actions = [],
  items = [],
  children,
}: LegacyInfoPageProps) {
  return (
    <section className="top_matches pt-120 pb-120">
      <div className="container-fluid">
        <div className="row">
          <div className="col-12 col-xl-10">
            <div className="top_matches__main">
              <div className="p2-bg rounded-8 p-5 p-lg-8 mb-6">
                {eyebrow && (
                  <span className="fs-seven g1-color fw-bold d-block mb-3">
                    {eyebrow}
                  </span>
                )}
                <h3 className="n10-color mb-4">{title}</h3>
                <p className="text-white-50 mb-6">{description}</p>
                {actions.length > 0 && (
                  <div className="d-flex align-items-center flex-wrap gap-3">
                    {actions.map((action) => (
                      <Link
                        className={
                          action.variant === "secondary"
                            ? "cmn-btn second-alt px-5 py-2 rounded-2"
                            : "cmn-btn px-5 py-2"
                        }
                        href={action.href}
                        key={`${action.href}-${action.label}`}
                      >
                        {action.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {items.length > 0 && (
                <div className="row gy-4 mb-6">
                  {items.map((item) => (
                    <div className="col-md-6 col-xl-4" key={item.label}>
                      <div className="p2-bg rounded-8 p-5 h-100">
                        <span className="fs-seven text-white-50 d-block mb-2">
                          {item.label}
                        </span>
                        <div className="n10-color fw-bold text-break">
                          {item.value}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {children}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
