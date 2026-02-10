const TERMINAL_EVENT_TYPES = [
  'completed',
  'rejected',
  'rejection_reason',
  'cancelled',
  'cancellation_reason',
  'final_settled',
];

/**
 * Whether the pending step indicator should be visible.
 * Events must be sorted newest-first (events[0] is the most recent).
 */
export function shouldShowPendingStep(events) {
  if (!events || events.length === 0) return false;
  return !TERMINAL_EVENT_TYPES.includes(events[0].eventType);
}

/**
 * Returns the event type of the most recent event,
 * used to derive the pending label via i18n key `event.pending.<type>`.
 */
export function getPendingEventType(events) {
  if (!events || events.length === 0) return null;
  return events[0].eventType;
}
