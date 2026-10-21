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
import { useEffect, useState } from "react";
import { menuGroups } from "@/src/navigation/siteNavigation";
import { useAuth } from "@/src/auth/useAuth";
import ThemeToggle from "./ThemeToggle";

const products = [
  { name: "Home", href: "/", icon: IconHome, exact: true },
  { name: "Sports", href: "/soccer", icon: IconTrophy },
  { name: "Live", href: "/live-betting", icon: IconWifi },
  { name: "Casino", href: "/casino", icon: IconSpade },
  { name: "Aviator", href: "/aviator", icon: IconPlane },
  { name: "Crash", href: "/crash", icon: IconRocket },
  { name: "Slots", href: "/slots", icon: IconDice5, soon: true },
  { name: "Virtuals", href: "/virtuals", icon: IconDeviceGamepad2, soon: true },
];

export default function SmartbetTopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setMenuOpen(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [menuOpen]);

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
            aria-expanded={menuOpen}
            aria-controls="smartbet-menu"
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
            <ThemeToggle />
            <Link aria-label="Search" className="smartbet-icon-button" href="/search">
              <IconSearch />
            </Link>
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
                aria-current={active ? "page" : undefined}
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
        <div className="smartbet-menu-panel" id="smartbet-menu">
          <div className="smartbet-menu-panel__inner">
            <strong>SMARTBET</strong>
            {menuGroups.map((group) => <nav key={group.title} aria-label={group.title} className="smartbet-menu-group"><h2>{group.title}</h2>{group.links.map((link) => <Link href={link.href} key={link.href} aria-current={pathname === link.href ? "page" : undefined} onClick={() => setMenuOpen(false)}>{link.label}</Link>)}</nav>)}
          </div>
        </div>
      )}
    </>
  );
}
