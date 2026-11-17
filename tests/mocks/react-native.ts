import React from 'react';

export const Platform = { OS: 'web' };

export const Dimensions = {
  get: (_: string) => ({ width: 1024, height: 768, scale: 1 }),
};

export const PixelRatio = {
  get: () => 1,
};

export const NativeModules = {
  BlobModule: {
    BLOB_URI_SCHEME: 'file',
  },
};

// ── Host components for real route rendering (W1-4/T3) ───────────────────────
// Additive only: the original four exports above are unchanged, so every
// existing test that consumes this mock keeps its previous behaviour.
const host = (tag: string) =>
  React.forwardRef((props: Record<string, unknown>, ref: unknown) =>
    React.createElement(tag, { ...props, ref } as Record<string, unknown>),
  );

export const View = host('View');
export const SafeAreaView = host('SafeAreaView');
export const StatusBar = host('StatusBar');
export const Text = host('Text');
export const ScrollView = host('ScrollView');
export const RefreshControl = host('RefreshControl');
export const TouchableOpacity = host('TouchableOpacity');
export const TouchableHighlight = host('TouchableHighlight');
export const TouchableWithoutFeedback = host('TouchableWithoutFeedback');
export const Pressable = host('Pressable');
export const TextInput = host('TextInput');
export const Image = host('Image');
export const ImageBackground = host('ImageBackground');
export const ActivityIndicator = host('ActivityIndicator');
export const FlatList = host('FlatList');
export const SectionList = host('SectionList');
export const Modal = host('Modal');
export const Switch = host('Switch');
export const KeyboardAvoidingView = host('KeyboardAvoidingView');

export const StyleSheet = {
  create: (s: Record<string, unknown>) => s,
  flatten: (s: unknown) => s,
  absoluteFill: {},
  absoluteFillObject: {},
  hairlineWidth: 1,
};

export const useWindowDimensions = () => ({
  width: 390,
  height: 736,
  scale: 1,
  fontScale: 1,
});
export const useColorScheme = () => 'dark';
export const Appearance = { getColorScheme: () => 'dark', addChangeListener: () => ({ remove() {} }) };
export const AccessibilityInfo = {
  isScreenReaderEnabled: async () => false,
  addEventListener: () => ({ remove() {} }),
};
export const Keyboard = {
  addListener: () => ({ remove() {} }),
  dismiss: () => {},
};
export const DeviceEventEmitter = { addListener: () => ({ remove() {} }), emit: () => {} };
export const Share = { share: async () => ({ action: 'dismissed' }) };

export const Alert = { alert: () => {} };
export const Linking = {
  openURL: async () => {},
  canOpenURL: async () => true,
  getInitialURL: async () => null,
  addEventListener: () => ({ remove() {} }),
};
export const AppState = {
  currentState: 'active',
  addEventListener: () => ({ remove() {} }),
};
export const Animated = {
  View: host('AnimatedView'),
  Text: host('AnimatedText'),
  ScrollView: host('AnimatedScrollView'),
  createAnimatedComponent: (c: unknown) => c,
  timing: () => ({ start: () => {} }),
  spring: () => ({ start: () => {} }),
  Value: class {
    setValue() {}
  },
};
export const Easing = {
  inOut: (x: unknown) => x,
  ease: (x: unknown) => x,
  linear: (x: unknown) => x,
  out: (x: unknown) => x,
};

export default {
  Platform,
  Dimensions,
  PixelRatio,
  NativeModules,
  View,
  SafeAreaView,
  StatusBar,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TouchableHighlight,
  TouchableWithoutFeedback,
  Pressable,
  TextInput,
  Image,
  ImageBackground,
  ActivityIndicator,
  FlatList,
  SectionList,
  Modal,
  Switch,
  KeyboardAvoidingView,
  StyleSheet,
  useWindowDimensions,
  Alert,
  Linking,
  AppState,
  Animated,
  Easing,
};
