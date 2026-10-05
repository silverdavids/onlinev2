/* eslint-disable react/no-unescaped-entities */
"use client";

import { useMemo, useState } from "react";
import LegacyInfoPage from "@/components/Pages/Legacy/LegacyInfoPage";

const company = "SmartBet";
const phoneDisplay = "+256 771 650 405";
const phoneRaw = "+256771650405";
const whatsappDisplay = "+256 771 650 353";
const whatsappRaw = "+256771650353";
const email = "support@smartbet.ug";
const addressShort = "P.O. Box 5162, Kampala";
const addressLong =
  "P.O. BOX 5162, KAMPALA (UGANDA, CENTRAL, KAMPALA, MAKINDYE DIVISION, LUKULI, KALULE)";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", phone: "", message: "" });
  const whatsappHref = useMemo(() => {
    const msg = encodeURIComponent(
      `Hello ${company}, I need help with my account / deposit / bet.`
    );
    return `https://wa.me/${whatsappRaw.replace(/\D/g, "")}?text=${msg}`;
  }, []);
  const mailHref = `mailto:${email}?subject=${encodeURIComponent(
    `${company} Support`
  )}`;

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = encodeURIComponent(
      `Name: ${form.name}\nPhone: ${form.phone}\n\nMessage:\n${form.message}`
    );
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(
      `${company} Contact Request`
    )}&body=${body}`;
  };

  return (
    <LegacyInfoPage
      title={`${company} Contact`}
      eyebrow="Support - Payments - Betting Help"
      description="Need help with deposits, withdrawals, account access, or a ticket? We're here for you."
      actions={[
        { href: `tel:${phoneRaw}`, label: "Call Support" },
        { href: whatsappHref, label: "WhatsApp", variant: "secondary" },
        { href: mailHref, label: "Email", variant: "secondary" },
      ]}
    >
      <div className="row gy-4">
        <div className="col-md-6">
          <div className="p2-bg rounded-8 p-5 h-100 text-white-50">
            <h5 className="n10-color mb-4">Contact Details</h5>
            <p>
              <strong>Phone</strong>
              <br />
              <a className="g1-color" href={`tel:${phoneRaw}`}>
                {phoneDisplay}
              </a>
            </p>
            <p>
              <strong>WhatsApp</strong>
              <br />
              <a className="g1-color" href={whatsappHref} rel="noreferrer" target="_blank">
                Chat with Support
              </a>
            </p>
            <p>
              <strong>Email</strong>
              <br />
              <a className="g1-color" href={mailHref}>
                {email}
              </a>
            </p>
            <p className="mb-0">
              Tip: For faster help, include your phone number and ticket/receipt
              ID (if any).
            </p>
          </div>
        </div>
        <div className="col-md-6">
          <div className="p2-bg rounded-8 p-5 h-100 text-white-50">
            <h5 className="n10-color mb-4">Office Address</h5>
            <p>
              <strong>{addressShort}</strong>
              <br />
              {addressLong}
            </p>
            <p className="mb-0">
              <strong>Hours</strong>
              <br />
              Mon-Sun: 8:00 AM - 10:00 PM
              <br />
              (Online support available 24/7)
            </p>
          </div>
        </div>
        <div className="col-md-6">
          <div className="p2-bg rounded-8 p-5 h-100 text-white-50">
            <h5 className="n10-color mb-4">Quick Help</h5>
            <ul>
              <li>Deposits not reflecting? Share the transaction ID + time.</li>
              <li>Withdrawal delays? Confirm your phone number is correct.</li>
              <li>Can't log in? Request password reset or contact support.</li>
              <li>Ticket issues? Send receipt/ticket ID + screenshot if possible.</li>
            </ul>
            <div className="n11-bg rounded-8 p-4 mt-4">
              <strong className="n10-color d-block mb-2">Responsible Gaming</strong>
              Bet responsibly. If you need assistance, contact support for guidance.
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="p2-bg rounded-8 p-5 h-100 text-white-50">
            <h5 className="n10-color mb-4">Send a Message</h5>
            <form className="d-grid gap-4" onSubmit={onSubmit}>
              <label>
                Your Name
                <input
                  className="n11-bg rounded-8 mt-2"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="e.g., Denis"
                  value={form.name}
                />
              </label>
              <label>
                Phone Number
                <input
                  className="n11-bg rounded-8 mt-2"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, phone: event.target.value }))
                  }
                  placeholder="e.g., +256 7xx xxx xxx"
                  value={form.phone}
                />
              </label>
              <label>
                Message
                <textarea
                  className="n11-bg rounded-8 mt-2"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, message: event.target.value }))
                  }
                  placeholder="Tell us what you need help with..."
                  rows={5}
                  value={form.message}
                />
              </label>
              <button className="cmn-btn px-5 py-2" type="submit">
                Send via Email
              </button>
              <span className="fs-eight">
                This will open your email app with the message pre-filled.
              </span>
            </form>
          </div>
        </div>
      </div>
      <div className="p2-bg rounded-8 p-5 mt-4 text-white-50 text-center">
        <strong className="n10-color d-block mb-2">{company}</strong>
        Join. Bet. Win smarter. Uganda
      </div>
    </LegacyInfoPage>
  );
}
