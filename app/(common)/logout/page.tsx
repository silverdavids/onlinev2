"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/auth/useAuth";

export default function LogoutPage() {
  const { logout } = useAuth();
  const router = useRouter();
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void logout().finally(() => router.replace("/login"));
  }, [logout, router]);
  return <p className="smartbet-panel" role="status">Signing out...</p>;
}
