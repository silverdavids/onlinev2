"use client";

import { IconCircleCheck, IconAlertTriangle, IconX } from "@tabler/icons-react";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export type BetslipNotice = {
  title: string;
  className: string;
  role: "alert" | "status";
};

export const getBetslipNotice = (message: string): BetslipNotice => {
  const normalized = message.toLowerCase();
  // Check rejections before success: "could not be placed" is not a success.
  if (/fail|unsuccess|expired|invalid|missing|sign in|log in|session|insufficient|not enough|not found|cannot|could not|unable|rejected|declined|not placed|not saved/.test(normalized)) {
    return { title: "Request failed", className: "alert alert-danger", role: "alert" };
  }
  if (/odds changed|review|suspended|enter a|minimum|maximum|exceed/.test(normalized)) {
    return { title: "Action needed", className: "alert alert-warning", role: "alert" };
  }
  if (/successfully|^booking saved\b|^booking loaded\b/.test(normalized)) {
    return { title: "Success", className: "alert alert-success", role: "status" };
  }
  return { title: "Ticket response", className: "alert alert-info", role: "alert" };
};

type Props = {
  notice: BetslipNotice;
  message: string;
  onDismiss: () => void;
  children?: ReactNode;
};

export default function BetslipNotification({ notice, message, onDismiss, children }: Props) {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    // Errors and decisions stay visible until dismissed or resolved.
    if (notice.role === "alert" || paused) return;
    const timeout = window.setTimeout(onDismiss, 12000);
    return () => window.clearTimeout(timeout);
  }, [notice.role, paused, onDismiss]);

  return createPortal(
    <section
      className={`betslip-response betslip-response--floating ${notice.className}`}
      role={notice.role}
      aria-atomic="true"
      aria-label={notice.title}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false);
      }}
    >
      <div className="betslip-response__heading">
        {notice.role === "status" ? <IconCircleCheck size={22} aria-hidden="true" /> : <IconAlertTriangle size={22} aria-hidden="true" />}
        <strong>{notice.title}</strong>
        <button className="betslip-response__close" type="button" aria-label="Dismiss notification" onClick={onDismiss}>
          <IconX size={20} aria-hidden="true" />
        </button>
      </div>
      <p>{message}</p>
      {children}
    </section>,
    document.body
  );
}
