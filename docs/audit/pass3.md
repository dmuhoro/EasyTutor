# Pass 3 – Runtime truth (partial, build pending)

## typecheck
## lint
  3:25  warning  'callGroq' is defined but never used. Allowed unused vars must match /^_/u    @typescript-eslint/no-unused-vars

/home/daniel-muhoro/workspace/projects/easytutor/tests/setupTests.ts
  33:3  warning  Unused eslint-disable directive (no problems were reported from 'no-console')

✖ 129 problems (0 errors, 129 warnings)
  0 errors and 1 warning potentially fixable with the `--fix` option.

## tests
 RUN  v4.1.5 /home/daniel-muhoro/workspace/projects/easytutor


 Test Files  50 passed (50)
      Tests  239 passed (239)
   Start at  11:11:38
   Duration  43.77s (transform 23.85s, setup 23.55s, import 91.59s, tests 11.38s, environment 124ms)


## suspicious patterns
src/runtime/runtimeScheduler.ts:202:    // TODO: Implement actual memory monitoring
src/runtime/runtimeScheduler.ts:207:    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
src/runtime/executionBudgetManager.ts:214:    // TODO: Implement actual resource monitoring
src/runtime/cognitiveExecutionGraph.ts:150:    // TODO: Implement cloud execution
src/runtime/inferencePolicyEngine.ts:192:    // TODO: Implement actual network detection
lib/learningPlanEngine.ts:111:  // 5️⃣ Recovery & reinforcement – placeholder based on weakness severity
lib/analytics.ts:49:  provider: 'hosted_claude' | 'hosted_groq' | 'local_ollama' | 'cache' | 'placeholder';
lib/analytics.ts:86:  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
lib/weaknessPredictionEngine.ts:145:    const confidence = 90; // placeholder confidence
lib/adaptiveDifficulty.ts:42:    const j = Math.floor(Math.random() * (i + 1));
lib/api.ts:289:      ? ['local_ollama', 'cache', 'placeholder']
lib/api.ts:290:      : ['hosted_claude', 'hosted_groq', 'local_ollama', 'cache', 'placeholder'];
lib/api.ts:389:      ? ['local_ollama', 'placeholder']
lib/api.ts:390:      : ['hosted_claude', 'hosted_groq', 'local_ollama', 'placeholder'];
lib/api.ts:408:    // If successful and it is not a fallback placeholder, write to our local array cache for subsequent offline runs
lib/api.ts:409:    if (result.success && result.provider !== 'placeholder' && result.data) {
lib/api.ts:421:    // If result was placeholder/failed, try loading from local offline array cache
lib/api.ts:426:        const pick = cachedArray[Math.floor(Math.random() * cachedArray.length)];
lib/api.ts:434:    // Serve deterministic fallback placeholder if everything fails
lib/api.ts:443:        const pick = cachedArray[Math.floor(Math.random() * cachedArray.length)];
lib/recommendations.ts:186:  const shuffled = questions.sort(() => Math.random() - 0.5);
lib/questionBank.ts:127:    const j = Math.floor(Math.random() * (i + 1));
lib/ai/reliability.ts:10:export type AIProvider = 'hosted_claude' | 'hosted_groq' | 'local_ollama' | 'cache' | 'placeholder';
lib/ai/reliability.ts:54:  const providers = config.providers || ['hosted_claude', 'hosted_groq', 'local_ollama', 'cache', 'placeholder'];
lib/ai/reliability.ts:134:    if (provider === 'placeholder') {
lib/ai/reliability.ts:136:      void logEvent('WARN', `[RELIABILITY] Hard fallback to placeholder for ${config.context.feature}`, {
lib/ai/reliability.ts:140:      // Persist placeholder fallback to ai_call_logs (fire-and-forget)
lib/ai/reliability.ts:145:        provider: 'placeholder',
lib/ai/reliability.ts:146:        model: 'placeholder',
lib/ai/reliability.ts:165:        provider: 'placeholder',
lib/ai/reliability.ts:334:        const jitter = Math.random() * 200 + 100;
lib/ai/reliability.ts:351:    provider: 'placeholder',
lib/ai/reliability.ts:352:    model: 'placeholder',
lib/ai/reliability.ts:366:    provider: 'placeholder',
lib/logEvent.ts:18:let sessionId = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
lib/logEvent.ts:22:  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
lib/ai.ts:53:      ? ['local_ollama', 'cache', 'placeholder']
lib/ai.ts:54:      : ['hosted_claude', 'hosted_groq', 'local_ollama', 'cache', 'placeholder'];
lib/interventionEngine.ts:73:/** Estimate learning impact – placeholder linear scaling */
app/(tabs)/quiz.tsx:57:    const randomSubject = SUBJECTS[Math.floor(Math.random() * SUBJECTS.length)];
app/(tabs)/quiz.tsx:58:    const randomTopic = randomSubject.topics[Math.floor(Math.random() * randomSubject.topics.length)];
app/(tabs)/study.tsx:449:              placeholder="Ask a question..."
app/(tabs)/study.tsx:450:              placeholderTextColor="#8a8fa3"
app/explore.tsx:70:            placeholder="Search math, physics, engines..."
app/explore.tsx:71:            placeholderTextColor="#5a5f73"
app/roadmaps/create.tsx:80:                 placeholder="e.g. Master React Native, Quantum Physics basics, Mediterranean Cooking..."
app/roadmaps/create.tsx:81:                 placeholderTextColor="#5a5f73"
app/(auth)/login.tsx:108:                    placeholder="Email Address"
app/(auth)/login.tsx:109:                    placeholderTextColor="#4b5563"
app/(auth)/login.tsx:120:                    placeholder="Password"
app/(auth)/login.tsx:121:                    placeholderTextColor="#4b5563"
app/(self_directed)/index.tsx:113:              placeholder="Paste your source text here…"
app/(self_directed)/index.tsx:114:              placeholderTextColor="#8a8fa3"
app/(self_directed)/roadmap.tsx:70:        } else if (res.provider === 'placeholder') {
app/(self_directed)/roadmap.tsx:102:        // Celebratory feedback only for a real (non-placeholder) generation —
app/settings.tsx:95:            placeholder="http://192.168.1.x:11434"
app/settings.tsx:96:            placeholderTextColor="#8a8fa3"

> easytutor@1.0.0 build
> npx expo export --platform web

Starting Metro Bundler

Web Bundled 188060ms node_modules/expo-router/entry.js (1750 modules)

› Assets (61):
assets/auth_background.172ac501e099d1535b5917e013edc5a5.png (1.4MB)
node_modules/@expo-google-fonts/dm-sans/100Thin_Italic/DMSans_100Thin_Italic.bcb8399c1cd3b407c9403b6738c0279f.ttf (61KB)
node_modules/@expo-google-fonts/dm-sans/100Thin/DMSans_100Thin.aa895105c99cdda4f82dc9b5b1e26d87.ttf (56KB)
node_modules/@expo-google-fonts/dm-sans/200ExtraLight_Italic/DMSans_200ExtraLight_Italic.783b88f315f5e0d18b356e4c7f24ab49.ttf (61KB)
node_modules/@expo-google-fonts/dm-sans/200ExtraLight/DMSans_200ExtraLight.3e25a281bdb7b15be3223f3ea14a78a9.ttf (56KB)
node_modules/@expo-google-fonts/dm-sans/300Light_Italic/DMSans_300Light_Italic.80cec38fe494b2d8d9c1f7f1096e73f5.ttf (61KB)
node_modules/@expo-google-fonts/dm-sans/300Light/DMSans_300Light.df43eeda0517a2dee06925d637bd6840.ttf (56KB)
node_modules/@expo-google-fonts/dm-sans/400Regular_Italic/DMSans_400Regular_Italic.d456fd1a58332b02c79e9bda60c4853e.ttf (61KB)
node_modules/@expo-google-fonts/dm-sans/400Regular/DMSans_400Regular.74f9bb7405caec741a24db735b2c5733.ttf (56KB)
node_modules/@expo-google-fonts/dm-sans/500Medium_Italic/DMSans_500Medium_Italic.fc3b9297fa9ed051f7649c8e756276b7.ttf (61KB)
node_modules/@expo-google-fonts/dm-sans/500Medium/DMSans_500Medium.7da0c1626a365ce0164d2ae4ebb0573b.ttf (56KB)
node_modules/@expo-google-fonts/dm-sans/600SemiBold_Italic/DMSans_600SemiBold_Italic.0f640fdba88da072848e514bf43c2b85.ttf (61KB)
node_modules/@expo-google-fonts/dm-sans/600SemiBold/DMSans_600SemiBold.b68921520b1d885dd7f854427cde3e82.ttf (56KB)
node_modules/@expo-google-fonts/dm-sans/700Bold_Italic/DMSans_700Bold_Italic.5af5d01e07e369ab645cbd92c05f89d5.ttf (61KB)
node_modules/@expo-google-fonts/dm-sans/700Bold/DMSans_700Bold.7a6c1a2c6196d4d0e617b57adb997b3b.ttf (56KB)
node_modules/@expo-google-fonts/dm-sans/800ExtraBold_Italic/DMSans_800ExtraBold_Italic.67790bc17c5b1ea7abef154cc8e21bc7.ttf (61KB)
node_modules/@expo-google-fonts/dm-sans/800ExtraBold/DMSans_800ExtraBold.74a7c51e71e5be3e9878deb3b1dd8276.ttf (56KB)
node_modules/@expo-google-fonts/dm-sans/900Black_Italic/DMSans_900Black_Italic.7c78541f1ece5c832d207df0be7b447f.ttf (61KB)
node_modules/@expo-google-fonts/dm-sans/900Black/DMSans_900Black.e0062779393299c3012a239746c1830c.ttf (56KB)
node_modules/@expo-google-fonts/syne/400Regular/Syne_400Regular.08f75a7b35006089ecfb46871891eaa6.ttf (69KB)
node_modules/@expo-google-fonts/syne/500Medium/Syne_500Medium.e4be2541dd148f0e8a6c6b5ff75228f6.ttf (69KB)
node_modules/@expo-google-fonts/syne/600SemiBold/Syne_600SemiBold.7ce75086f1539b40100f53503385b5d9.ttf (69KB)
node_modules/@expo-google-fonts/syne/700Bold/Syne_700Bold.0b46d64e8d5b1ef476fee2b8922818e2.ttf (69KB)
node_modules/@expo-google-fonts/syne/800ExtraBold/Syne_800ExtraBold.67fd7d06cb7e7803883b3f3154620782.ttf (69KB)
node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/AntDesign.3f78af31cca60105799838a1a7a59fbd.ttf (130KB)
node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Entypo.31b5ffea3daddc69dd01a1f3d6cf63c5.ttf (66KB)
node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/EvilIcons.140c53a7643ea949007aa9a282153849.ttf (13KB)
node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Feather.ca4b48e04dc1ce10bfbddb262c8b835f.ttf (56KB)
node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome.b06871f281fee6b241d60582ae9369b9.ttf (166KB)
node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome5_Brands.3b89dd103490708d19a95adcae52210e.ttf (134KB)
node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome5_Regular.1f77739ca9ff2188b539c36f30ffa2be.ttf (34KB)
node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome5_Solid.605ed7926cf39a2ad5ec2d1f9d391d3d.ttf (203KB)
node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome6_Brands.56c8d80832e37783f12c05db7c8849e2.ttf (209KB)
node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome6_Regular.370dd5af19f8364907b6e2c41f45dbbf.ttf (68KB)
node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome6_Solid.adec7d6f310bc577f05e8fe06a5daccf.ttf (424KB)
node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Fontisto.b49ae8ab2dbccb02c4d11caaacf09eab.ttf (314KB)
node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Foundation.e20945d7c929279ef7a6f1db184a4470.ttf (57KB)
node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.b4eb097d35f44ed943676fd56f6bdc51.ttf (390KB)
node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.6e435534bd35da5fef04168860a9b8fa.ttf (1.3MB)
node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialIcons.4e85bc9ebe07e0340c9c4fc2f6c38908.ttf (357KB)
node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Octicons.871378c6eab492a3e689a9385dc45a12.ttf (69KB)
node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/SimpleLineIcons.d2285965fe34b05465047401b8595dd0.ttf (54KB)
node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Zocial.1681f34aaca71b8dfb70756bca331eb2.ttf (26KB)
node_modules/expo-router/assets/arrow_down.017bc6ba3fc25503e5eb5e53826d48a8.png (9.5KB)
node_modules/expo-router/assets/error.d1ea1496f9057eb392d5bbf3732a61b7.png (469B)
node_modules/expo-router/assets/file.19eeb73b9593a38f8e9f418337fc7d10.png (138B)
node_modules/expo-router/assets/forward.d8b800c443b8972542883e0b9de2bdc6.png (188B)
node_modules/expo-router/assets/pkg.ab19f4cbc543357183a20571f68380a3.png (364B)
node_modules/expo-router/assets/react-navigation/elements/back-icon-mask.0a328cd9c1afd0afe8e3b1ec5165b1b4.png (653B)
node_modules/expo-router/assets/react-navigation/elements/back-icon.35ba0eaec5a4f5ed12ca16fabeae451d.png (207B)
node_modules/expo-router/assets/react-navigation/elements/clear-icon.c94f6478e7ae0cdd9f15de1fcb9e5e55.png (4 variations | 425B)
node_modules/expo-router/assets/react-navigation/elements/close-icon.808e1b1b9b53114ec2838071a7e6daa7.png (4 variations | 235B)
node_modules/expo-router/assets/react-navigation/elements/search-icon.286d67d3f74808a60a78d3ebf1a5fb57.png (928B)
node_modules/expo-router/assets/sitemap.412dd9275b6b48ad28f5e3d81bb1f626.png (465B)
node_modules/expo-router/assets/unmatched.20e71bdf79e3a97bf55fd9e164041578.png (4.8KB)

› web bundles (4):
_expo/static/css/web-4ed5cf4a09c110c0eb6d457ff3bc71cf.css (24KB)
_expo/static/js/web/Clipboard-71a5493f8069c4c32b0d7e0c93b1a472.js (8.9KB)
_expo/static/js/web/entry-d59f1f11ef338073402c3dc0dd34d551.js (3.9MB)
_expo/static/js/web/Haptics-8ca3e619d8f86d95ce09d091c72dff02.js (3.6KB)

› Files (3):
favicon.ico (15KB)
index.html (1.4KB)
metadata.json (49B)

Exported: dist

## web export
Exported: dist (see build log)
