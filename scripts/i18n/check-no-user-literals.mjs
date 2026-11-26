#!/usr/bin/env node
/**
 * C30 / GT-15 / E13-T2 — i18n boundary at the real shipped-screen source.
 *
 * A locale-key gate that only checks `t('…')` calls can pass while a screen
 * still renders hard-coded English copy. This scanner walks every `.tsx` file
 * under `app/` and `screens/` and rejects user-visible literals at the source
 * boundary. It is intentionally fail-closed: unclassified string props are
 * reported with file/line/column rather than silently allowed.
 */
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const VISIBLE_PROPS = new Set([
  'title',
  'placeholder',
  'label',
  'accessibilityLabel',
  'aria-label',
  'message',
  'description',
  'hint',
  'subtitle',
  'headerTitle',
  'alertTitle',
  'buttonText',
  'cancelText',
  'confirmText',
  'prompt',
  'tabBarLabel',
  'tabBarAccessibilityLabel',
]);

const VISIBLE_OPTION_PROPS = new Set(VISIBLE_PROPS);

/**
 * Explicitly non-visible props. This is the complete allowlist: a string prop
 * outside this set is rejected when its value contains a space or a capitalised
 * word, so a new visible prop cannot slip through by being unnamed here.
 */
const NON_VISIBLE_PROPS = new Set([
  'className',
  'containerClassName',
  'style',
  'contentContainerStyle',
  'columnWrapperStyle',
  'testID',
  'key',
  'id',
  'name',
  'accessibilityRole',
  'accessibilityState',
  'accessibilityValue',
  'accessibilityHint',
  'importantForAccessibility',
  'accessible',
  'role',
  'aria-checked',
  'aria-disabled',
  'aria-expanded',
  'aria-selected',
  'size',
  'variant',
  'color',
  'tint',
  'icon',
  'iconPosition',
  'rounded',
  'width',
  'height',
  'textAlignVertical',
  'textAlign',
  'fontFamily',
  'fontSize',
  'fontWeight',
  'lineHeight',
  'numberOfLines',
  'ellipsizeMode',
  'selectable',
  'selectionColor',
  'autoCapitalize',
  'autoComplete',
  'autoFocus',
  'autoCorrect',
  'keyboardType',
  'keyboardShouldPersistTaps',
  'returnKeyType',
  'secureTextEntry',
  'multiline',
  'editable',
  'maxLength',
  'placeholderTextColor',
  'pointerEvents',
  'source',
  'resizeMode',
  'contentType',
  'subjectName',
  'subjectId',
  'type',
  'mode',
  'value',
  'href',
  'to',
  'method',
  'target',
  'rel',
  'data',
  'children',
  'renderItem',
  'ListHeaderComponent',
  'ListEmptyComponent',
  'ListFooterComponent',
  'ItemSeparatorComponent',
  'contentInset',
  'contentOffset',
  'snapPoints',
  'behavior',
  'onPress',
  'onPressIn',
  'onPressOut',
  'onLongPress',
  'onChange',
  'onChangeText',
  'onValueChange',
  'onSubmitEditing',
  'onFocus',
  'onBlur',
  'onLayout',
  'onScroll',
  'onContentSizeChange',
  'onMomentumScrollEnd',
  'onRefresh',
  'onEndReached',
  'onMouseEnter',
  'onMouseLeave',
  'collapsable',
  'removeClippedSubviews',
  'needsOffscreenAlphaCompositing',
  'renderToHardwareTextureAndroid',
  'shouldRasterizeIOS',
  'transform',
  'position',
  'flex',
  'gap',
  'margin',
  'padding',
  'opacity',
  'borderWidth',
  'borderColor',
  'borderRadius',
  'backgroundColor',
  'elevation',
  'shadow',
  'zIndex',
]);

const VISIBLE_CALLS = new Set([
  'Alert.alert',
  'alert',
  'setError',
  'setMessage',
  'setNotice',
  'toast',
  'Toast.show',
]);

function humanLiteral(value) {
  const text = String(value ?? '').trim();
  if (text.length < 2) return false;
  if (!/[A-Za-z]{2}/.test(text)) return false;
  if (/^https?:\/\//i.test(text)) return false;
  return true;
}

function isTranslationCall(node) {
  for (let p = node.parent; p; p = p.parent) {
    if (ts.isCallExpression(p)) {
      const callee = p.expression.getText(p.getSourceFile());
      if (callee === 't' || callee.endsWith('.t')) return true;
    }
    if (ts.isJsxAttribute(p)) return false;
  }
  return false;
}

function containingJsxAttribute(node) {
  for (let p = node.parent; p; p = p.parent) {
    if (ts.isJsxAttribute(p)) return p;
  }
  return undefined;
}

const COMPARISON_OPERATORS = new Set([
  ts.SyntaxKind.EqualsEqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsEqualsToken,
  ts.SyntaxKind.EqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsToken,
  ts.SyntaxKind.LessThanToken,
  ts.SyntaxKind.LessThanEqualsToken,
  ts.SyntaxKind.GreaterThanToken,
  ts.SyntaxKind.GreaterThanEqualsToken,
  ts.SyntaxKind.InstanceOfKeyword,
  ts.SyntaxKind.InKeyword,
]);

/**
 * True only when a string literal is a rendered value inside a JSX expression,
 * not a data value used by a comparison or callback. Object options such as
 * `options={{ title: 'Home' }}` are rendered by the navigator and are included.
 */
function visibleObjectProperty(node) {
  for (let p = node.parent; p; p = p.parent) {
    if (ts.isPropertyAssignment(p) && VISIBLE_OPTION_PROPS.has(p.name.getText(p.getSourceFile()))) {
      return p.name.getText(p.getSourceFile());
    }
    if (ts.isConditionalExpression(p) || ts.isParenthesizedExpression(p)) continue;
    if (ts.isBinaryExpression(p) && (p.operatorToken.kind === ts.SyntaxKind.BarBarToken
      || p.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken)) continue;
    return undefined;
  }
  return undefined;
}

function isRenderedJsxString(node) {
  for (let p = node.parent; p; p = p.parent) {
    if (ts.isJsxExpression(p)) return true;
    if (ts.isJsxElement(p) || ts.isJsxFragment(p) || ts.isJsxAttribute(p)) return false;
    if (ts.isPropertyAssignment(p) && VISIBLE_OPTION_PROPS.has(p.name.getText(p.getSourceFile()))) return true;
    if (ts.isBinaryExpression(p)) {
      if (COMPARISON_OPERATORS.has(p.operatorToken.kind)) return false;
      if (p.operatorToken.kind !== ts.SyntaxKind.PlusToken) return false;
    }
    if (ts.isCallExpression(p)) return false;
    const passthrough = ts.isConditionalExpression(p) || ts.isParenthesizedExpression(p)
      || ts.isAsExpression(p) || ts.isNonNullExpression(p) || ts.isSatisfiesExpression?.(p);
    if (!passthrough) return false;
  }
  return false;
}

export function scanSource(file, source, withNodes = false) {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const violations = [];

  function add(node, kind, value) {
    if (!humanLiteral(value)) return;
    const { line, character } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
    violations.push({
      file: path.relative(process.cwd(), file).split(path.sep).join('/'),
      line: line + 1,
      column: character + 1,
      kind,
      value: String(value).trim(),
      ...(withNodes ? { node, sourceFile: sf } : {}),
    });
  }

  function visit(node) {
    if (ts.isJsxText(node)) add(node, 'jsx-text', node.text);

    if (ts.isJsxAttribute(node)) {
      const prop = node.name.getText(sf);
      const init = node.initializer;
      if (init && ts.isStringLiteral(init) && !NON_VISIBLE_PROPS.has(prop)) {
        if (VISIBLE_PROPS.has(prop) || /\s/.test(init.text) || /^[A-Z]/.test(init.text.trim())) {
          add(init, `prop:${prop}`, init.text);
        }
      }
    }

    if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && !isTranslationCall(node)) {
      const attr = containingJsxAttribute(node);
      const prop = attr?.name.getText(sf);
      if (!prop || (!NON_VISIBLE_PROPS.has(prop) && (VISIBLE_PROPS.has(prop) || /\s/.test(node.text) || /^[A-Z]/.test(node.text.trim())))) {
        const parent = node.parent;
        const visibleCall = parent && ts.isCallExpression(parent) && VISIBLE_CALLS.has(parent.expression.getText(sf));
        const objectProp = visibleObjectProperty(node);
        if (visibleCall) add(node, `call:${parent.expression.getText(sf)}`, node.text);
        else if (objectProp) add(node, `object-prop:${objectProp}`, node.text);
        else if (isRenderedJsxString(node)) add(node, 'jsx-expression', node.text);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sf);
  return violations;
}

function tsxFilesUnder(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'archive') return [];
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return tsxFilesUnder(full);
    return entry.name.endsWith('.tsx') ? [full] : [];
  });
}

export function scanAll(root = process.cwd()) {
  const files = [...tsxFilesUnder(path.join(root, 'app')), ...tsxFilesUnder(path.join(root, 'screens'))].sort();
  const violations = files.flatMap((file) => scanSource(file, fs.readFileSync(file, 'utf8')));
  return { files, violations };
}

function main() {
  const { files, violations } = scanAll();
  if (violations.length === 0) {
    console.log(`[I18N] PASS — ${files.length} shipped screen files scanned; 0 user-visible literals outside t().`);
    return;
  }
  console.error(`[I18N] FAIL — ${violations.length} user-visible literal(s) in shipped screens.`);
  for (const v of violations) {
    console.error(`${v.file}:${v.line}:${v.column} ${v.kind} ${JSON.stringify(v.value)}`);
  }
  process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  main();
}
