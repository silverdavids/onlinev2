"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { usePrematchBetslip } from "@/src/betslip/usePrematchBetslip";
import ContentPage from "@/components/Shared/ContentPage";

export default function BookingCodePage() {
  const [code, setCode] = useState("");
  const { retrieveBooking, isRetrievingBooking, loadedBookingCode, serverMessage } = usePrematchBetslip();
  const submit = (event: FormEvent) => { event.preventDefault(); if (!isRetrievingBooking && code.trim()) void retrieveBooking(code); };
  return <ContentPage title="Load booking code" description="Retrieve saved selections using your booking code."><div className="smartbet-panel smartbet-form-panel"><form className="smartbet-form" onSubmit={submit}><label>Booking code<input inputMode="numeric" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} required /></label><button className="smartbet-button" disabled={isRetrievingBooking} type="submit">{isRetrievingBooking ? "Loading..." : "Load selections"}</button></form>{serverMessage && <p className="smartbet-feedback" role="status">{serverMessage}</p>}{loadedBookingCode && <Link href="/betslip">Review loaded selections</Link>}</div></ContentPage>;
}
