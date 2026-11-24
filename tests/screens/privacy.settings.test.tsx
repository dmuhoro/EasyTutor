import React from 'react';
import TestRenderer, { act, type ReactTestInstance } from 'react-test-renderer';
import { Switch, Text, TouchableOpacity } from 'react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The privacy actions must be reachable from the real /settings route and must
// never delete data without an explicit destructive confirmation.
const ui = vi.hoisted(() => ({
  delete: vi.fn(async () => ({ ok: true, deletedTables: [], failedTables: [], auditId: 'audit-test' })),
  download: vi.fn(async () => true),
  withdraw: vi.fn(async () => undefined),
  grant: vi.fn(async () => undefined),
  consent: { consented: true, dataProcessing: true, analytics: false, marketing: false },
  alert: vi.fn(),
}));

vi.mock('react-native', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-native')>();
  return { ...actual, Alert: { alert: ui.alert } };
});

vi.mock('expo-router', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useLocalSearchParams: () => ({}),
  usePathname: () => '/settings',
}));

vi.mock('../../lib/privacy/dataDeletion', () => ({
  deleteUserData: ui.delete,
  exportUserData: vi.fn(async () => null),
  downloadUserData: ui.download,
}));

vi.mock('../../lib/privacy/dataExport', () => ({
  downloadUserData: ui.download,
  exportUserData: vi.fn(async () => null),
}));

vi.mock('../../lib/privacy/consent', () => ({
  getConsent: async () => ui.consent,
  grantConsent: ui.grant,
  withdrawConsent: ui.withdraw,
  isConsented: async () => ui.consent.consented,
  recordAgeVerification: vi.fn(async () => undefined),
  saveConsent: vi.fn(async () => undefined),
}));

vi.mock('../../store/authStore', () => ({
  useAuthStore: () => ({ user: { email: 'learner@example.test' }, signOut: vi.fn() }),
}));
vi.mock('../../store/progressStore', () => ({
  useProgressStore: () => ({ studyStreak: 3, xpTotal: 120, getLevel: () => 'Beginner' }),
}));
vi.mock('../../store/settingsStore', () => ({
  useSettingsStore: () => ({
    theme: 'dark', lowDataMode: false, setTheme: vi.fn(), setLowDataMode: vi.fn(),
    useLocalLLM: false, setUseLocalLLM: vi.fn(), ollamaUrl: 'http://localhost:11434',
    setOllamaUrl: vi.fn(), ollamaChatModel: 'qwen2.5:1.5b', setOllamaChatModel: vi.fn(),
    ollamaEmbeddingModel: 'nomic-embed-text', setOllamaEmbeddingModel: vi.fn(),
  }),
}));
vi.mock('../../store/roadmapStore', () => ({
  useRoadmapStore: () => ({ learningMode: 'high_school', setLearningMode: vi.fn() }),
}));
vi.mock('../../lib/ollamaModels', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/ollamaModels')>();
  return { ...actual, checkOllamaModelAvailability: vi.fn(async () => ({
    reasoning: 'available', agent: 'unknown', coding: 'unknown', embedding: 'unknown',
  })) };
});
vi.mock('../../components/ui/PortalSwitcher', () => ({
  PortalSwitcher: () => React.createElement('PortalSwitcherMarker'),
}));

const preloaded = await import('../../screens/settings/index');
void preloaded;
import SettingsRoute from '../../app/settings';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function textOf(node: ReactTestInstance): string {
  return node.findAll((child) => child.type === Text)
    .map((child) => child.props.children)
    .map((children) => (Array.isArray(children) ? children.join('') : String(children ?? '')))
    .join(' ');
}

function button(tree: TestRenderer.ReactTestRenderer, label: string): ReactTestInstance {
  const found = tree.root.findAll((node) => node.type === TouchableOpacity)
    .find((node) => textOf(node).includes(label));
  if (!found) throw new Error(`Button not found: ${label}`);
  return found;
}

async function mount(): Promise<TestRenderer.ReactTestRenderer> {
  let tree!: TestRenderer.ReactTestRenderer;
  await act(async () => { tree = TestRenderer.create(React.createElement(SettingsRoute)); });
  return tree;
}

describe('Settings route — privacy surface', () => {
  beforeEach(() => {
    ui.delete.mockClear();
    ui.download.mockClear();
    ui.withdraw.mockClear();
    ui.alert.mockClear();
    ui.consent.consented = true;
    ui.consent.dataProcessing = true;
  });

  it('exposes consent, export and deletion actions on the real route', async () => {
    const tree = await mount();
    const text = JSON.stringify(tree.toJSON());
    expect(text).toContain('Privacy & data');
    expect(text).toContain('Export my data');
    expect(text).toContain('Delete all my data');
    expect(text).toContain('Data processing consent');
    expect(tree.root.findAllByType(Switch).length).toBeGreaterThan(0);
  });

  it('requires a destructive confirmation before any deletion runs', async () => {
    const tree = await mount();
    await act(async () => { button(tree, 'Delete all my data').props.onPress(); });
    expect(ui.delete).not.toHaveBeenCalled();
    expect(ui.alert).toHaveBeenCalled();
    expect(String(ui.alert.mock.calls[0][0])).toContain('Delete all your data?');

    const buttons = ui.alert.mock.calls[0][2] as Array<{ text: string; onPress?: () => void }>;
    const confirm = buttons.find((item) => item.text === 'Delete');
    expect(confirm).toBeTruthy();
    await act(async () => { confirm?.onPress?.(); });
    expect(ui.delete).toHaveBeenCalledTimes(1);
  });

  it('starts export without a destructive confirmation', async () => {
    const tree = await mount();
    await act(async () => { button(tree, 'Export my data').props.onPress(); });
    expect(ui.download).toHaveBeenCalledTimes(1);
  });
});
