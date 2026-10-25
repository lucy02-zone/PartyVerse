import { useState } from "react";
import { Share2 } from "lucide-react";

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.append(field);
  field.select();
  const copied = document.execCommand("copy");
  field.remove();
  if (!copied) throw new Error("Copy is unavailable");
}

export default function ShareResultsButton({ summary, className = "secondary-button" }) {
  const [status, setStatus] = useState("");

  async function shareResults() {
    try {
      if (navigator.share) {
        await navigator.share({ title: "PartyVerse game results", text: summary });
        setStatus("Ready to share");
      } else {
        await copyText(summary);
        setStatus("Results copied");
      }
    } catch (error) {
      if (error?.name === "AbortError") return;
      try {
        await copyText(summary);
        setStatus("Results copied");
      } catch {
        setStatus("Sharing is unavailable on this device");
      }
    }
  }

  return <span className="share-results-wrap">
    <button type="button" className={className} onClick={shareResults}>
      <Share2 size={17} /> Share results
    </button>
    <span className="share-results-status" role="status" aria-live="polite">{status}</span>
  </span>;
}
