export class EventEmitter {
  addListener() {}
  removeAllListeners() {}
  emit() {}
}

export const NativeModules = {};

// Preserved from the removed importOriginal() mock (W1-4/T4): native view
// registration must be a no-op under test, not load the raw TS package.
export const requireNativeViewManager = () => () => null;

// Some Expo native modules request their native implementation at import time
// (e.g. expo-haptics via screens/tabs/study.tsx). Return an inert stub so the
// real screen module can be imported during route smoke mounting.
export const requireNativeModule = () => ({});

export default {
  EventEmitter,
  NativeModules,
  requireNativeViewManager,
  requireNativeModule,
};
