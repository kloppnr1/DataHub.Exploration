import { describe, it, expect } from 'vitest';
import { shouldShowPendingStep, getPendingEventType } from '../pendingStep';

describe('shouldShowPendingStep', () => {
  it('returns false when events array is empty', () => {
    expect(shouldShowPendingStep([])).toBe(false);
  });

  it('returns false when events is null or undefined', () => {
    expect(shouldShowPendingStep(null)).toBe(false);
    expect(shouldShowPendingStep(undefined)).toBe(false);
  });

  // Non-terminal events — should show pending

  it('returns true when most recent event is "created"', () => {
    expect(shouldShowPendingStep([{ eventType: 'created' }])).toBe(true);
  });

  it('returns true when most recent event is "sent"', () => {
    expect(shouldShowPendingStep([
      { eventType: 'sent' },
      { eventType: 'created' },
    ])).toBe(true);
  });

  it('returns true when most recent event is "acknowledged"', () => {
    expect(shouldShowPendingStep([
      { eventType: 'acknowledged' },
      { eventType: 'sent' },
      { eventType: 'created' },
    ])).toBe(true);
  });

  it('returns true when most recent event is "awaiting_effectuation"', () => {
    expect(shouldShowPendingStep([
      { eventType: 'awaiting_effectuation' },
      { eventType: 'acknowledged' },
      { eventType: 'sent' },
      { eventType: 'created' },
    ])).toBe(true);
  });

  // Terminal events — should NOT show pending

  it('returns false when most recent event is "completed"', () => {
    expect(shouldShowPendingStep([
      { eventType: 'completed' },
      { eventType: 'awaiting_effectuation' },
      { eventType: 'created' },
    ])).toBe(false);
  });

  it('returns false when most recent event is "rejected"', () => {
    expect(shouldShowPendingStep([
      { eventType: 'rejected' },
      { eventType: 'sent' },
      { eventType: 'created' },
    ])).toBe(false);
  });

  it('returns false when most recent event is "rejection_reason"', () => {
    expect(shouldShowPendingStep([
      { eventType: 'rejection_reason' },
      { eventType: 'sent' },
      { eventType: 'created' },
    ])).toBe(false);
  });

  it('returns false when most recent event is "cancelled"', () => {
    expect(shouldShowPendingStep([
      { eventType: 'cancelled' },
      { eventType: 'sent' },
      { eventType: 'created' },
    ])).toBe(false);
  });

  it('returns false when most recent event is "cancellation_reason"', () => {
    expect(shouldShowPendingStep([
      { eventType: 'cancellation_reason' },
      { eventType: 'cancelled' },
      { eventType: 'sent' },
      { eventType: 'created' },
    ])).toBe(false);
  });

  it('returns false when most recent event is "final_settled"', () => {
    expect(shouldShowPendingStep([
      { eventType: 'final_settled' },
      { eventType: 'completed' },
      { eventType: 'created' },
    ])).toBe(false);
  });

  it('returns true when most recent event is "offboarding_started"', () => {
    expect(shouldShowPendingStep([
      { eventType: 'offboarding_started' },
      { eventType: 'completed' },
      { eventType: 'created' },
    ])).toBe(true);
  });

  // Regression: must check newest event (index 0), not oldest (index length-1)

  it('checks the NEWEST event, not the oldest — regression test', () => {
    // Newest is terminal ("cancellation_reason"), oldest is non-terminal ("created")
    // The old buggy code checked events[length-1] which would see "created" and show pending
    const events = [
      { eventType: 'cancellation_reason' },
      { eventType: 'cancelled' },
      { eventType: 'awaiting_effectuation' },
      { eventType: 'acknowledged' },
      { eventType: 'sent' },
      { eventType: 'created' },
    ];
    expect(shouldShowPendingStep(events)).toBe(false);
  });

  it('shows pending when newest is non-terminal even if oldest would be terminal', () => {
    // Contrived scenario to validate array index logic
    const events = [
      { eventType: 'sent' },
      { eventType: 'completed' },
    ];
    expect(shouldShowPendingStep(events)).toBe(true);
  });
});

describe('getPendingEventType', () => {
  it('returns null for empty events', () => {
    expect(getPendingEventType([])).toBeNull();
  });

  it('returns null for null/undefined', () => {
    expect(getPendingEventType(null)).toBeNull();
    expect(getPendingEventType(undefined)).toBeNull();
  });

  it('returns the event type of the first (newest) event', () => {
    expect(getPendingEventType([
      { eventType: 'acknowledged' },
      { eventType: 'sent' },
      { eventType: 'created' },
    ])).toBe('acknowledged');
  });
});
