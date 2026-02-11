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
      { eventType: 'created' },
      { eventType: 'sent' },
    ])).toBe(true);
  });

  it('returns true when most recent event is "acknowledged"', () => {
    expect(shouldShowPendingStep([
      { eventType: 'created' },
      { eventType: 'sent' },
      { eventType: 'acknowledged' },
    ])).toBe(true);
  });

  it('returns true when most recent event is "awaiting_effectuation"', () => {
    expect(shouldShowPendingStep([
      { eventType: 'created' },
      { eventType: 'sent' },
      { eventType: 'acknowledged' },
      { eventType: 'awaiting_effectuation' },
    ])).toBe(true);
  });

  it('returns true when most recent event is "cancellation_sent"', () => {
    expect(shouldShowPendingStep([
      { eventType: 'created' },
      { eventType: 'sent' },
      { eventType: 'acknowledged' },
      { eventType: 'awaiting_effectuation' },
      { eventType: 'cancellation_sent' },
    ])).toBe(true);
  });

  // Terminal events — should NOT show pending

  it('returns false when most recent event is "completed"', () => {
    expect(shouldShowPendingStep([
      { eventType: 'created' },
      { eventType: 'awaiting_effectuation' },
      { eventType: 'completed' },
    ])).toBe(false);
  });

  it('returns false when most recent event is "rejected"', () => {
    expect(shouldShowPendingStep([
      { eventType: 'created' },
      { eventType: 'sent' },
      { eventType: 'rejected' },
    ])).toBe(false);
  });

  it('returns false when most recent event is "rejection_reason"', () => {
    expect(shouldShowPendingStep([
      { eventType: 'created' },
      { eventType: 'sent' },
      { eventType: 'rejection_reason' },
    ])).toBe(false);
  });

  it('returns false when most recent event is "cancelled"', () => {
    expect(shouldShowPendingStep([
      { eventType: 'created' },
      { eventType: 'sent' },
      { eventType: 'cancelled' },
    ])).toBe(false);
  });

  it('returns false when most recent event is "cancellation_reason"', () => {
    expect(shouldShowPendingStep([
      { eventType: 'created' },
      { eventType: 'sent' },
      { eventType: 'cancelled' },
      { eventType: 'cancellation_reason' },
    ])).toBe(false);
  });

  it('returns false when most recent event is "final_settled"', () => {
    expect(shouldShowPendingStep([
      { eventType: 'created' },
      { eventType: 'completed' },
      { eventType: 'final_settled' },
    ])).toBe(false);
  });

  it('returns true when most recent event is "offboarding_started"', () => {
    expect(shouldShowPendingStep([
      { eventType: 'created' },
      { eventType: 'completed' },
      { eventType: 'offboarding_started' },
    ])).toBe(true);
  });

  // Regression: must check newest event (last element), not oldest (index 0)

  it('checks the NEWEST event (last), not the oldest — regression test', () => {
    // Oldest is non-terminal ("created"), newest is terminal ("cancellation_reason")
    // The old buggy code checked events[0] which would see "created" and show pending
    const events = [
      { eventType: 'created' },
      { eventType: 'sent' },
      { eventType: 'acknowledged' },
      { eventType: 'awaiting_effectuation' },
      { eventType: 'cancelled' },
      { eventType: 'cancellation_reason' },
    ];
    expect(shouldShowPendingStep(events)).toBe(false);
  });

  it('shows pending when newest is non-terminal even if oldest would be terminal', () => {
    // Contrived scenario to validate array index logic
    const events = [
      { eventType: 'completed' },
      { eventType: 'sent' },
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

  it('returns the event type of the last (newest) event', () => {
    expect(getPendingEventType([
      { eventType: 'created' },
      { eventType: 'sent' },
      { eventType: 'acknowledged' },
    ])).toBe('acknowledged');
  });
});
