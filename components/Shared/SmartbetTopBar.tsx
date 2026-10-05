"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  IconDeviceGamepad2,
  IconDice5,
  IconHome,
  IconMenu2,
  IconPlane,
  IconRocket,
  IconSearch,
  IconSpade,
  IconTrophy,
  IconUserCircle,
  IconWifi,
  IconX,
} from "@tabler/icons-react";
import { useState } from "react";
import { useAuth } from "@/src/auth/useAuth";

const products = [
  { name: "Home", href: "/", icon: IconHome, exact: true },
  { name: "Sports", href: "/soccer", icon: IconTrophy },
  { name: "Live", href: "/live-betting", icon: IconWifi },
  { name: "Casino", href: "/ecricket", icon: IconSpade },
  { name: "Aviator", href: "/promotions", icon: IconPlane },
  { name: "Crash", href: "/promotions", icon: IconRocket },
  { name: "Slots", href: null, icon: IconDice5, soon: true },
  { name: "Virtuals", href: null, icon: IconDeviceGamepad2, soon: true },
];

const menuLinks = [
  { label: "Sports", href: "/soccer" },
  { label: "Live Betting", href: "/live-betting" },
  { label: "Tickets", href: "/tickets" },
  { label: "Deposit Guide", href: "/deposit-guide" },
  { label: "Terms", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Contact", href: "/contact" },
];

export default function SmartbetTopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <>
      <header className="smartbet-topbar">
        <div className="smartbet-topbar__inner">
          <button
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="smartbet-icon-button"
            onClick={() => setMenuOpen((open) => !open)}
            type="button"
          >
            {menuOpen ? <IconX /> : <IconMenu2 />}
          </button>

          <Link className="smartbet-wordmark" href="/">
            SMARTBET
          </Link>

          <div className="smartbet-topbar__actions">
            <button aria-label="Search" className="smartbet-icon-button" type="button">
              <IconSearch />
            </button>
            {isAuthenticated ? (
              <>
                <Link className="smartbet-login" href="/dashboard">
                  Account
                </Link>
                <button className="smartbet-join" onClick={handleLogout} type="button">
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link className="smartbet-login" href="/login">
                  Log in
                </Link>
                <Link className="smartbet-join" href="/create-acount">
                  Join now
                </Link>
              </>
            )}
            <Link aria-label="Account" className="smartbet-icon-button" href="/dashboard">
              <IconUserCircle />
            </Link>
          </div>
        </div>
      </header>

      <nav className="smartbet-product-strip" aria-label="Products">
        <div className="smartbet-product-strip__inner">
          {products.map((product) => {
            const active = product.href
              ? product.exact
                ? pathname === product.href
                : pathname.startsWith(product.href)
              : false;
            const Icon = product.icon;

            if (!product.href) {
              return (
                <button className="smartbet-product-link is-disabled" key={product.name} type="button">
                  <Icon />
                  <span>{product.name}</span>
                  {product.soon && <em>Soon</em>}
                </button>
              );
            }

            return (
              <Link
                className={`smartbet-product-link ${active ? "is-active" : ""}`}
                href={product.href}
                key={product.name}
              >
                <Icon />
                <span>{product.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {menuOpen && (
        <div className="smartbet-menu-panel">
          <div className="smartbet-menu-panel__inner">
            <strong>SMARTBET</strong>
            {menuLinks.map((link) => (
              <Link href={link.href} key={link.href} onClick={() => setMenuOpen(false)}>
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
