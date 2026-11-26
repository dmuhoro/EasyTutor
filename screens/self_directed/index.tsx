import { t } from '../../src/locales';
import { LEGACY_COLORS } from '../../src/design/legacyPalette';
import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { GoalInput } from "../../components/GoalInput";
import { useRoadmapStore } from "../../store/roadmapStore";
import Ionicons from '@expo/vector-icons/Ionicons';
import { chunkText } from "../../lib/chunking";
import { storeChunks } from "../../lib/knowledge";
import { stableHashId } from "../../lib/stableId";
import { Database } from "../../src/infrastructure/database";

import { PortalHeader } from "../../components/PortalHeader";

const AUTOMOTIVE_SUBJECT_ID = 'sd-automotive';
const AUTOMOTIVE_CURRICULUM_SCOPE = undefined; // Book text lives in PRIVATE scope only
const IMPORT_BATCH = 50;

export default function SelfDirectedMission() {
  const router = useRouter();
  const { roadmaps, fetchSavedRoadmaps, checkedTasks, userId } = useRoadmapStore();
  const [sourceText, setSourceText] = useState("");
  const [ingesting, setIngesting] = useState(false);
  const [subjectName, setSubjectName] = useState("Automotive Science Principles");
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ stored: number; failed: number; total: number; new: number; existing: number } | null>(null);

  useEffect(() => {
    fetchSavedRoadmaps();
  }, []);

  const handleStartMission = (goal: string) => {
    router.push({
      pathname: '/self-directed/roadmap',
      params: { topic: goal }
    });
  };

  const handleIngest = async () => {
    if (ingesting) return;
    if (!userId) {
      Alert.alert(t('pc'), t('gs'));
      return;
    }

    const text = sourceText.trim();
    if (!text) {
      Alert.alert(t('kf'), t('oi'));
      return;
    }

    setIngesting(true);
    try {
      const chunks = chunkText(text).map((content) => ({ content }));
      const documentId = stableHashId(`${userId}|${subjectName}`);
      const result = await storeChunks({
        userId,
        portalType: 'knowledge_explorer',
        documentId,
        title: subjectName,
        chunks,
        subjectId: AUTOMOTIVE_SUBJECT_ID,
        curriculumScope: AUTOMOTIVE_CURRICULUM_SCOPE,
      });

      if (result.failed === 0) {
        Alert.alert(t('mv'), `Knowledge base updated (${result.stored}/${result.total} chunks stored).`);
        setSourceText("");
      } else {
        Alert.alert(
          t('ix'),
          `Stored ${result.stored}/${result.total} chunks. ${result.failed} failed — embedding was unavailable (is Ollama reachable and embedding-capable?).`
        );
      }
    } catch (err) {
      Alert.alert(
        t('oa'),
        t('mi')
      );
    } finally {
      setIngesting(false);
    }
  };

  const pickFile = () => {
    if (importing) return;
    const doc = (globalThis as any).document;
    if (!doc) {
      Alert.alert(t('e'), t('lo'));
      return;
    }
    const input = doc.createElement('input');
    input.type = 'file';
    input.accept = '.jsonl';
    input.onchange = (event: any) => {
      const file = event.target.files?.[0];
      if (file) {
        setImportFileName(file.name);
        void handleImportFile(file);
      }
    };
    input.click();
  };

  const handleImportFile = async (file: File) => {
    if (!userId) {
      Alert.alert(t('pc'), t('js'));
      return;
    }

    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const chunks: any[] = [];
    const parseErrors: string[] = [];
    lines.forEach((line, i) => {
      try {
        const obj = JSON.parse(line);
        if (typeof obj.id === 'undefined' || !obj.text) {
          parseErrors.push(`line ${i + 1}: missing id or text`);
          return;
        }
        chunks.push({
          id: String(obj.id),
          content: String(obj.text),
          metadata: {
            source: obj.source ?? null,
            chapterNo: obj.chapter_no ?? null,
            chapterTitle: obj.chapter_title ?? null,
            page: obj.page ?? null,
            chunkIndex: obj.chunk_index ?? null,
          },
        });
      } catch {
        parseErrors.push(`line ${i + 1}: invalid JSON`);
      }
    });

    if (parseErrors.length > 0) {
      Alert.alert(
        t('jw'),
        parseErrors.slice(0, 6).join("\n") + (parseErrors.length > 6 ? "\n…" : "")
      );
    }
    if (chunks.length === 0) return;

    const documentId = stableHashId(`import:${userId}|${subjectName}`);
    setImporting(true);
    setImportProgress(0);
    setImportResult(null);
    try {
      // Check existing chunks for dedupe reporting (deterministic chunk ids
      // mean re-importing the same corpus is an idempotent upsert).
      let existingChunkIds: Set<string> = new Set();
      try {
        const existing = await Database.governedQuery({
          table: 'document_chunks',
          columns: 'id',
          userId,
          portalType: 'knowledge_explorer',
        }).then((r: any) => (r.data || []).map((d: any) => d.id));
        existingChunkIds = new Set(existing);
      } catch {
        // If we can't read existing chunks, just proceed — dedupe is handled
        // by the governed write layer regardless.
      }
      const existingCount = chunks.filter(c => existingChunkIds.has(c.id)).length;

      let stored = 0;
      let failed = 0;
      for (let i = 0; i < chunks.length; i += IMPORT_BATCH) {
        const batch = chunks.slice(i, i + IMPORT_BATCH);
        const result = await storeChunks({
          userId,
          portalType: 'knowledge_explorer',
          documentId,
          title: subjectName,
          chunks: batch,
          subjectId: AUTOMOTIVE_SUBJECT_ID,
          // Book text lives in the signed-in user's PRIVATE scope only.
          curriculumScope: undefined,
        });
        stored += result.stored;
        failed += result.failed;
        setImportProgress(Math.min(100, Math.round(((i + batch.length) / chunks.length) * 100)));
      }
      setImportResult({
        stored,
        failed,
        total: chunks.length,
        new: stored - Math.min(existingCount, stored),
        existing: Math.min(existingCount, stored),
      });
      setImportFileName(null);
    } catch (err) {
      Alert.alert(t('v'), t('c'));
    } finally {
      setImporting(false);
      setImportProgress(0);
    }
  };

  const selfDirectedRoadmaps = roadmaps.filter(r => r.learningMode === 'self_directed');

  return (
    <SafeAreaView className="flex-1 bg-legacy-night-canvas" edges={['top']}>
      <PortalHeader />
      <ScrollView className="flex-1 px-5 pt-4">
        <View className="mb-10">
          <Text className="text-legacy-green500 font-bold font-syne text-sm uppercase tracking-widest mb-2">{t('bt')}</Text>
          <Text className="text-white text-4xl font-bold font-syne mb-4">{t('ot')}</Text>
          <Text className="text-legacy-night-text-muted text-lg font-dmsans leading-7">
            {t('nk')}
          </Text>
        </View>

        <GoalInput onStart={handleStartMission} containerStyle={{ marginBottom: 40 }} />

        <View className="mb-10">
          <Text className="text-white text-2xl font-bold font-syne mb-6">{t('lh')}</Text>
          
          <TouchableOpacity
            className="bg-legacy-night-surface p-5 rounded-[20px] border border-legacy-night-border mb-3 flex-row items-center"
            onPress={() => Alert.alert("Library", "Opening your personal knowledge vault...")}
          >
            <Ionicons name="book-outline" size={24} color={LEGACY_COLORS.yellow500} />
            <Text className="text-white font-syne text-lg ml-4">{t('du')}</Text>
          </TouchableOpacity>

          <View className="bg-legacy-night-surface p-5 rounded-[20px] border border-legacy-night-border mb-3">
            <Text className="text-white font-syne text-lg mb-2">{t('db')}</Text>
            <Text className="text-legacy-night-text-muted text-xs font-dmsans mb-3">
              {t('dh')}
            </Text>
            <TextInput
              className="bg-legacy-night-canvas border border-legacy-night-border rounded-xl p-3 text-white font-dmsans"
              value={subjectName}
              onChangeText={setSubjectName}
              placeholder={t('fo')}
              placeholderTextColor={LEGACY_COLORS.nightTextMuted}
              editable={!ingesting}
            />
            <TextInput
              className="bg-legacy-night-canvas border border-legacy-night-border rounded-xl p-3 text-white font-dmsans min-h-[120px]"
              multiline
              value={sourceText}
              onChangeText={setSourceText}
              placeholder={t('hu')}
              placeholderTextColor={LEGACY_COLORS.nightTextMuted}
              editable={!ingesting}
            />
            <TouchableOpacity
              className={`mt-3 rounded-xl p-4 items-center ${ingesting ? 'bg-legacy-night-border' : 'bg-legacy-blue500'}`}
              onPress={handleIngest}
              disabled={ingesting}
            >
              {ingesting ? (
                <ActivityIndicator color={LEGACY_COLORS.white} />
              ) : (
                <Text className="text-white font-syne font-bold">{t('qr')}</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Private-only guarantee — book text lives only in your scope */}
          <View className="bg-legacy-blue700/10 border border-legacy-blue700/30 rounded-2xl p-5 mb-4 flex-row items-start gap-3">
            <View className="bg-legacy-blue700/20 rounded-full p-2">
              <Ionicons name="shield-checkmark" size={20} color={LEGACY_COLORS.blue500} />
            </View>
            <View className="flex-1">
              <Text className="text-legacy-blue500 font-bold font-syne text-sm mb-1">{t('mn')}</Text>
              <Text className="text-legacy-night-text-muted text-xs font-dmsans leading-5">
                {t('hn')}
              </Text>
            </View>
          </View>

          <View className="bg-legacy-night-surface p-5 rounded-[20px] border border-legacy-night-border mb-3">
            <Text className="text-white font-syne text-lg mb-2">{t('nw')}</Text>
            <Text className="text-legacy-night-text-muted text-xs font-dmsans mb-3">
              {t('fy')}
            </Text>
            {importFileName ? (
              <Text className="text-legacy-green500 text-xs font-dmsans mb-2">{importFileName}</Text>
            ) : (
              <Text className="text-legacy-night-text-muted text-xs font-dmsans mb-2">{t('el')}</Text>
            )}
            <View className="w-full bg-legacy-night-border rounded-xl h-3 mb-3 overflow-hidden">
              <View
                className="bg-legacy-blue500 h-full"
                style={{ width: `${importProgress}%` }}
              />
            </View>
            {importResult && (
              <View className="mt-3">
                <Text className="text-legacy-night-text-muted text-[10px] uppercase font-bold tracking-wider mb-1">
                  {t('ab')}
                </Text>
                <View className="flex-row gap-4">
                  <View className="flex-1">
                    <Text className="text-legacy-green500 text-xs font-bold font-syne">{importResult.new}</Text>
                    <Text className="text-legacy-green500 text-[10px] font-dmsans uppercase">{t('on')}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-legacy-night-text-muted text-xs font-bold font-syne">{importResult.existing}</Text>
                    <Text className="text-legacy-night-text-muted text-[10px] font-dmsans uppercase">{t('di')}</Text>
                  </View>
                  {importResult.failed > 0 && (
                    <View className="flex-1">
                      <Text className="text-legacy-red500 text-xs font-bold font-syne">{importResult.failed}</Text>
                      <Text className="text-legacy-red500 text-[10px] font-dmsans uppercase">{t('fe')}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}
            <TouchableOpacity
              className={`w-full rounded-xl p-4 items-center ${importing ? 'bg-legacy-night-border' : 'bg-legacy-blue500'}`}
              onPress={pickFile}
              disabled={importing}
            >
              {importing ? (
                <ActivityIndicator color={LEGACY_COLORS.white} />
              ) : (
                <Text className="text-white font-syne font-bold">{t('he')}</Text>
              )}
            </TouchableOpacity>
            <Text className="text-legacy-night-text-muted text-[10px] font-dmsans mt-3">
              {t('fm')}
            </Text>
          </View>

          <TouchableOpacity
            className="bg-legacy-night-surface p-5 rounded-[20px] border border-legacy-night-border mb-3 flex-row items-center"
            onPress={() => router.push('/explore')}
          >
            <Ionicons name="chatbubbles-outline" size={24} color={LEGACY_COLORS.purple500Bright} />
            <Text className="text-white font-syne text-lg ml-4">{t('km')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-legacy-night-surface p-5 rounded-[20px] border border-legacy-night-border mb-3 flex-row items-center"
            onPress={() => Alert.alert("Library", "Opening your personal knowledge vault...")}
          >
            <Ionicons name="book-outline" size={24} color={LEGACY_COLORS.yellow500} />
            <Text className="text-white font-syne text-lg ml-4">{t('du')}</Text>
          </TouchableOpacity>
        </View>

        {selfDirectedRoadmaps.length > 0 && (
          <View className="mb-20">
            <Text className="text-white text-2xl font-bold font-syne mb-6">{t('ga')}</Text>
            {selfDirectedRoadmaps.slice(0, 5).map((roadmap) => {
              const tasks = roadmap.days.reduce((acc, d) => acc + d.tasks.length, 0);
              const roadmapChecked = checkedTasks[roadmap.id] || {};
              const done = Object.values(roadmapChecked).reduce((acc, dt) => acc + dt.length, 0);
              const percent = tasks > 0 ? Math.round((done / tasks) * 100) : 0;

              return (
                <TouchableOpacity
                  key={roadmap.id}
                  onPress={() => router.push({ pathname: '/self-directed/roadmap', params: { topic: roadmap.topic } })}
                  className="bg-legacy-night-surface p-6 rounded-[28px] border border-legacy-night-border mb-4 flex-row items-center justify-between"
                >
                  <View className="flex-1 mr-4">
                     <Text className="text-white text-lg font-bold font-syne mb-1" numberOfLines={1}>{roadmap.topic}</Text>
                     <Text className="text-legacy-night-text-muted text-xs font-dmsans">{percent}{t('kc')}</Text>
                  </View>
                  <View className={`w-8 h-8 rounded-full items-center justify-center ${percent === 100 ? 'bg-legacy-green500/20' : 'bg-legacy-blue-ribbon/20'}`}>
                    <Ionicons name={percent === 100 ? "trophy" : "chevron-forward"} size={16} color={percent === 100 ? LEGACY_COLORS.green500 : LEGACY_COLORS.blueRibbon} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
