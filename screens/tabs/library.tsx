import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuthStore } from '../../store/authStore';
import { useRoadmapStore, portalFromMode } from '../../store/roadmapStore';
import { useStudyStore } from '../../store/studyStore';
import { SUBJECTS } from '../../lib/subjects';
import { importPrivateNotes, listPrivateDocuments, type LibraryDocument } from '../../lib/library';
import { logError } from '../../lib/logEvent';
import { Sheet } from '../../components/Sheet';
import { EmptyState } from '../../components/ui/EmptyState';
import { COLORS } from '../../src/design/tokens';
import { t } from '../../src/locales';

const MAX_FILE_BYTES = 50 * 1024 * 1024;
const DEFAULT_SUBJECT_ID = SUBJECTS.find((subject) => subject.topics.length > 0)?.id ?? '';

interface ImportProgress {
  processed: number;
  total: number;
}

export default function LibraryTab() {
  const { user } = useAuthStore();
  const { learningMode } = useRoadmapStore();
  const { selectedSubjectId } = useStudyStore();
  const portalType = portalFromMode(learningMode ?? 'high_school');
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [sourceText, setSourceText] = useState('');
  const [subjectId, setSubjectId] = useState(selectedSubjectId ?? DEFAULT_SUBJECT_ID);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress>({ processed: 0, total: 0 });
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    if (!user?.id) {
      setDocuments([]);
      setLoadError(t('signInToViewLibrary'));
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      setDocuments(await listPrivateDocuments(user.id, portalType));
    } catch (error) {
      logError('LIBRARY_LOAD_FAILED', error);
      setLoadError(error instanceof Error ? error.message : t('libraryLoadFailed'));
    } finally {
      setLoading(false);
    }
  }, [portalType, user?.id]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  const filteredDocuments = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return query
      ? documents.filter((document) => document.title.toLocaleLowerCase().includes(query))
      : documents;
  }, [documents, search]);

  const handleImport = async () => {
    if (importing) return;
    if (!user?.id) {
      setImportError(t('signInToImportNotes'));
      return;
    }

    setImporting(true);
    setImportError(null);
    setImportMessage(null);
    setProgress({ processed: 0, total: 0 });
    try {
      const result = await importPrivateNotes({
        userId: user.id,
        portalType,
        subjectId,
        title,
        text: sourceText,
        onChunkProcessed: (processed, total) => setProgress({ processed, total }),
      });

      if (result.failed > 0) {
        setImportError(t('importPartial', { stored: result.stored, failed: result.failed }));
        return;
      }

      setImportMessage(t('importComplete', { count: result.stored }));
      setTitle('');
      setSourceText('');
      await loadDocuments();
    } catch (error) {
      logError('LIBRARY_IMPORT_FAILED', error);
      setImportError(error instanceof Error ? error.message : t('importFailed'));
    } finally {
      setImporting(false);
    }
  };

  const chooseTextFile = () => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      setImportError(t('fileUploadWebOnly'));
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.md,.pdf,text/plain,text/markdown,application/pdf';
    input.onchange = () => {
      const file = input.files?.item(0);
      if (!file) return;
      if (file.size > MAX_FILE_BYTES) {
        setImportError(t('fileTooLarge'));
        return;
      }
      if (file.name.toLocaleLowerCase().endsWith('.pdf')) {
        setImportError(t('pdfImportUnavailable'));
        return;
      }
      if (!/\.(txt|md)$/i.test(file.name)) {
        setImportError(t('supportedTextFiles'));
        return;
      }

      void file.text().then((text) => {
        if (!text.trim()) {
          setImportError(t('noTextToImport'));
          return;
        }
        setTitle(file.name.replace(/\.(txt|md)$/i, ''));
        setSourceText(text);
        setImportError(null);
      }).catch((error: unknown) => {
        logError('LIBRARY_FILE_READ_FAILED', error);
        setImportError(t('fileReadFailed'));
      });
    };
    input.click();
  };

  const progressPercent = progress.total > 0
    ? Math.round((progress.processed / progress.total) * 100)
    : 0;

  return (
    <SafeAreaView className="flex-1 bg-surface-bg" edges={['top']}>
      <ScrollView
        className="flex-1 px-4 pt-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 112 }}
      >
        <View className="mb-5">
          <Text className="text-3xl font-dmsans-bold text-text-primary">{t('library')}</Text>
          <Text className="mt-1 text-base text-text-secondary">{t('yourPrivateStudyMaterials')}</Text>
        </View>

        <View className="mb-5 min-h-[56px] flex-row items-center gap-3 rounded-xl border border-surface-border bg-surface-card px-4">
          <Ionicons name="lock-closed-outline" size={18} color={COLORS.primary.DEFAULT} />
          <Text className="flex-1 text-sm font-dmsans-medium text-text-primary">
            {t('notesStayPrivate')}
          </Text>
        </View>

        <View className="mb-5 min-h-[52px] flex-row items-center gap-3 rounded-xl border border-surface-border bg-surface-card px-4">
          <Ionicons name="search" size={18} color={COLORS.text.secondary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t('searchNotes')}
            placeholderTextColor={COLORS.text.muted}
            accessibilityLabel={t('searchNotes')}
            className="flex-1 py-3 text-base text-text-primary"
          />
        </View>

        {loading ? (
          <View className="items-center py-12">
            <ActivityIndicator color={COLORS.primary.DEFAULT} />
            <Text className="mt-3 text-sm text-text-secondary">{t('loadingLibrary')}</Text>
          </View>
        ) : loadError ? (
          <View className="rounded-xl border border-error/30 bg-error/10 p-4">
            <Text className="text-sm text-error">{loadError}</Text>
            {user?.id && (
              <TouchableOpacity
                onPress={() => void loadDocuments()}
                accessibilityRole="button"
                className="mt-3 min-h-[48px] flex-row items-center justify-center rounded-md bg-surface-card px-4"
              >
                <Text className="font-dmsans-semibold text-text-primary">{t('retry')}</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : filteredDocuments.length === 0 ? (
          <EmptyState
            icon="book"
            title={search ? t('noMatchingNotes') : t('noMaterialsYet')}
            message={search ? t('tryAnotherSearch') : t('importFirstNotes')}
            actionLabel={search ? undefined : t('importNotes')}
            onAction={search ? undefined : () => {
              setImportError(null);
              setSheetOpen(true);
            }}
          />
        ) : (
          <View className="gap-3">
            {filteredDocuments.map((document) => (
              <View
                key={document.id}
                className="rounded-xl border border-surface-border bg-surface-card p-4"
              >
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1 flex-row gap-3">
                    <View className="h-11 w-11 items-center justify-center rounded-md bg-surface-elevated">
                      <Ionicons name="document-text-outline" size={22} color={COLORS.primary.DEFAULT} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-dmsans-semibold text-text-primary" numberOfLines={2}>
                        {document.title}
                      </Text>
                      {document.createdAt && (
                        <Text className="mt-1 text-xs text-text-secondary">
                          {new Date(document.createdAt).toLocaleDateString()}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View className="rounded-full bg-primary/10 px-3 py-1.5">
                    <Text className="text-xs font-dmsans-medium text-primary">{t('private')}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          onPress={() => {
            setImportError(null);
            setImportMessage(null);
            setSheetOpen(true);
          }}
          accessibilityRole="button"
          className="mt-6 min-h-[52px] flex-row items-center justify-center gap-2 rounded-md bg-primary px-5"
        >
          <Ionicons name="add" size={20} color={COLORS.text.inverse} />
          <Text className="font-dmsans-semibold text-text-inverse">{t('importNotes')}</Text>
        </TouchableOpacity>
      </ScrollView>

      {sheetOpen && (
        <View pointerEvents="box-none" className="absolute inset-0">
          <Sheet isOpen onClose={() => {
            if (!importing) setSheetOpen(false);
          }}>
            <ScrollView
              className="px-5"
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 32 }}
            >
              <Text className="mb-2 text-xl font-dmsans-semibold text-text-primary">
                {t('importNewMaterial')}
              </Text>
              <Text className="mb-4 text-sm text-text-secondary">{t('notesStayPrivate')}</Text>

              <Text className="mb-2 text-sm font-dmsans-semibold text-text-primary">
                {t('chooseSubject')}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                {SUBJECTS.filter((subject) => subject.topics.length > 0).map((subject) => (
                  <TouchableOpacity
                    key={subject.id}
                    onPress={() => setSubjectId(subject.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: subjectId === subject.id }}
                    className={`mr-2 min-h-[48px] justify-center rounded-full border px-4 ${
                      subjectId === subject.id
                        ? 'border-primary bg-primary'
                        : 'border-surface-border bg-surface-card'
                    }`}
                  >
                    <Text className={`text-sm font-dmsans-medium ${
                      subjectId === subject.id ? 'text-text-inverse' : 'text-text-primary'
                    }`}>
                      {subject.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder={t('fileName')}
                placeholderTextColor={COLORS.text.muted}
                accessibilityLabel={t('fileName')}
                editable={!importing}
                className="mb-3 min-h-[48px] rounded-md border border-surface-border bg-surface-card px-4 text-base text-text-primary"
              />
              <TextInput
                value={sourceText}
                onChangeText={setSourceText}
                placeholder={t('pasteTextPlaceholder')}
                placeholderTextColor={COLORS.text.muted}
                accessibilityLabel={t('pasteTextPlaceholder')}
                editable={!importing}
                multiline
                textAlignVertical="top"
                className="mb-3 min-h-[144px] rounded-md border border-surface-border bg-surface-card p-4 text-base text-text-primary"
              />

              <TouchableOpacity
                onPress={chooseTextFile}
                disabled={importing}
                accessibilityRole="button"
                className="mb-4 min-h-[48px] flex-row items-center justify-center gap-2 rounded-md border border-surface-border bg-surface-card px-4"
              >
                <Ionicons name="folder-open-outline" size={18} color={COLORS.primary.DEFAULT} />
                <Text className="text-sm font-dmsans-semibold text-text-primary">{t('uploadTextFile')}</Text>
              </TouchableOpacity>

              {importing && progress.total > 0 && (
                <View className="mb-4 rounded-lg bg-surface-subtle p-4">
                  <Text className="mb-2 text-sm font-dmsans-medium text-text-primary">
                    {t('importProgress', { processed: progress.processed, total: progress.total })}
                  </Text>
                  <View className="h-2 overflow-hidden rounded-full bg-surface-border">
                    <View className="h-full rounded-full bg-primary" style={{ width: `${progressPercent}%` }} />
                  </View>
                  <Text className="mt-2 text-xs text-text-secondary">{t('keepScreenOpen')}</Text>
                </View>
              )}

              {importMessage && (
                <Text accessibilityRole="alert" className="mb-3 text-sm font-dmsans-medium text-success">
                  {importMessage}
                </Text>
              )}
              {importError && (
                <Text accessibilityRole="alert" className="mb-3 text-sm font-dmsans-medium text-error">
                  {importError}
                </Text>
              )}

              <TouchableOpacity
                onPress={() => void handleImport()}
                disabled={importing || !title.trim() || !sourceText.trim() || !subjectId}
                accessibilityRole="button"
                accessibilityState={{ disabled: importing || !title.trim() || !sourceText.trim() || !subjectId, busy: importing }}
                className={`min-h-[52px] flex-row items-center justify-center gap-2 rounded-md px-5 ${
                  importing || !title.trim() || !sourceText.trim() || !subjectId
                    ? 'bg-primary/40'
                    : 'bg-primary'
                }`}
              >
                {importing && <ActivityIndicator color={COLORS.text.inverse} />}
                <Text className="font-dmsans-semibold text-text-inverse">
                  {importing ? t('importing') : t('import')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (importing) return;
                  setSheetOpen(false);
                }}
                disabled={importing}
                accessibilityRole="button"
                className="mt-2 min-h-[48px] items-center justify-center"
              >
                <Text className="text-sm font-dmsans-medium text-text-secondary">{t('close')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </Sheet>
        </View>
      )}
    </SafeAreaView>
  );
}
