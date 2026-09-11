const EVENT_NAME = "qulay:toast";

export function notify(message, tone = "success") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { message, tone, id: Date.now() } }));
}

export { EVENT_NAME as NOTIFY_EVENT_NAME };
