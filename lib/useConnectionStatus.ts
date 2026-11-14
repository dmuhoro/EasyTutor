import { useEffect, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { useSettingsStore } from '../store/settingsStore';

/**
 * Slow-connection threshold (download Mbps). At or below this, we suggest
 * low-data mode to the learner so the app stays usable on constrained links.
 */
const SLOW_DOWNLOAD_MBPS = 0.5;

/**
 * Hook that watches NetInfo and auto-suggests low-data mode when the measured
 * download throughput stays below SLOW_DOWNLOAD_MBPS. Returns the current
 * connection state and whether low-data mode is suggested.
 *
 * The suggestion is one-shot per session: once the learner toggles low-data
 * mode off, we stop re-suggesting until the app restarts.
 */
export function useConnectionStatus() {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [connectionType, setConnectionType] = useState<string | null>(null);
  const [downloadMbps, setDownloadMbps] = useState<number | null>(null);
  const lowDataMode = useSettingsStore((s) => s.lowDataMode);
  const setLowDataMode = useSettingsStore((s) => s.setLowDataMode);
  const [suggested, setSuggested] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setIsConnected(!!state.isConnected);
      setConnectionType(state.type ?? null);
      const mbps = extractMbps(state);
      if (mbps !== null) setDownloadMbps(mbps);
    });

    // One-time snapshot for immediate suggestion.
    void (async () => {
      const state = await NetInfo.fetch();
      setIsConnected(!!state.isConnected);
      setConnectionType(state.type ?? null);
      const mbps = extractMbps(state);
      if (mbps !== null) setDownloadMbps(mbps);
    })();

    return unsubscribe;
  }, []);

  // Auto-suggest low-data mode on slow connections, once per session.
  useEffect(() => {
    if (suggested || lowDataMode || !downloadMbps) return;
    if (downloadMbps <= SLOW_DOWNLOAD_MBPS) {
      setLowDataMode(true);
      setSuggested(true);
    }
  }, [downloadMbps, lowDataMode, setLowDataMode, suggested]);

  return {
    isConnected,
    connectionType,
    downloadMbps,
    isSlow: downloadMbps ? downloadMbps <= SLOW_DOWNLOAD_MBPS : false,
    lowDataMode,
    setLowDataMode,
    suggested,
  };
}

/** Extract download Mbps from NetInfo state details when available. */
function extractMbps(state: NetInfoState): number | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const details: any = (state as any).details;
  if (!details) return null;
  const linkSpeed = details.linkSpeed; // Mbps on wifi
  if (typeof linkSpeed === 'number' && linkSpeed > 0) return linkSpeed;
  const rx = details.rxLinkSpeed;
  if (typeof rx === 'number' && rx > 0) return rx;
  const tx = details.txLinkSpeed;
  if (typeof tx === 'number' && tx > 0) return tx;
  return null;
}
