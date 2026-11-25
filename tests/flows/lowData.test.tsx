import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useConnectionStatus } from '../../lib/useConnectionStatus';
import { useSettingsStore } from '../../store/settingsStore';

const net = vi.hoisted(() => ({
  state: { isConnected: true, type: 'wifi', details: { linkSpeed: 8 } } as Record<string, unknown>,
  listeners: [] as Array<(state: Record<string, unknown>) => void>,
}));

vi.mock('@react-native-community/netinfo', () => ({
  default: {
    fetch: async () => net.state,
    addEventListener: (listener: (state: Record<string, unknown>) => void) => {
      net.listeners.push(listener);
      return () => {
        net.listeners = net.listeners.filter((candidate) => candidate !== listener);
      };
    },
  },
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function Probe({ onValue }: { onValue: (value: ReturnType<typeof useConnectionStatus>) => void }) {
  onValue(useConnectionStatus());
  return null;
}

describe('C32 — low-data mode behaviour', () => {
  let tree: TestRenderer.ReactTestRenderer | undefined;
  afterEach(() => {
    if (tree) act(() => tree?.unmount());
    tree = undefined;
  });
  beforeEach(() => {
    net.state = { isConnected: true, type: 'wifi', details: { linkSpeed: 8 } };
    net.listeners = [];
    useSettingsStore.getState().setLowDataMode(false);
  });

  it('auto-enables low-data mode once on a measured slow link', async () => {
    net.state = { isConnected: true, type: 'cellular', details: { linkSpeed: 0.3 } };
    let latest: ReturnType<typeof useConnectionStatus> | undefined;
    await act(async () => {
      tree = TestRenderer.create(<Probe onValue={(value) => { latest = value; }} />);
    });
    expect(latest?.isSlow).toBe(true);
    expect(useSettingsStore.getState().lowDataMode).toBe(true);
    expect(latest?.suggested).toBe(true);
  });

  it('does not re-suggest after the learner turns low-data mode off', async () => {
    useSettingsStore.getState().setLowDataMode(true);
    net.state = { isConnected: true, type: 'cellular', details: { linkSpeed: 0.2 } };
    let latest: ReturnType<typeof useConnectionStatus> | undefined;
    await act(async () => {
      tree = TestRenderer.create(<Probe onValue={(value) => { latest = value; }} />);
    });
    expect(useSettingsStore.getState().lowDataMode).toBe(true);
    expect(latest?.suggested).toBe(false);
  });

  it('leaves low-data mode off on a fast link', async () => {
    let latest: ReturnType<typeof useConnectionStatus> | undefined;
    await act(async () => {
      tree = TestRenderer.create(<Probe onValue={(value) => { latest = value; }} />);
    });
    expect(latest?.isSlow).toBe(false);
    expect(useSettingsStore.getState().lowDataMode).toBe(false);
  });
});
