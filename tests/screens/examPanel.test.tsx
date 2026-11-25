/**
 * E8 learner-surface proof: the wired MockExamPanel renders real exam data,
 * submits selections through the real grading service, and reports correct,
 * answered and unanswered counts from the real result. No network edges are
 * substituted — this is the panel component used by screens/tutor/session.tsx.
 */
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { describe, expect, it } from 'vitest';
import { MockExamPanel } from '../../components/exam/MockExamPanel';
import { buildMockExam } from '../../src/domain/exam/mockExam';
import { t } from '../../src/locales';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const EXAM = buildMockExam({
  id: 'exam-ui',
  subject: 'mathematics',
  topic: 'algebra',
  marksPerQuestion: 1,
  questions: [
    { id: 'q1', prompt: '2 + 2?', options: ['3', '4', '5'], correctIndex: 1 },
    { id: 'q2', prompt: '3 + 3?', options: ['5', '6', '7'], correctIndex: 1 },
    { id: 'q3', prompt: '4 + 4?', options: ['7', '8', '9'], correctIndex: 1 },
  ],
});

function textOf(root: TestRenderer.ReactTestInstance): string {
  return root.findAll((node) => typeof node.props?.children === 'string')
    .map((node) => String(node.props.children))
    .join('\n');
}

describe('MockExamPanel real submission path', () => {
  it('grades the learner selections and reports unanswered questions explicitly', async () => {
    let tree: TestRenderer.ReactTestRenderer | undefined;
    await act(async () => {
      tree = TestRenderer.create(<MockExamPanel exam={EXAM} />);
    });

    const radios = () => tree!.root.findAll(
      (node) => node.props?.accessibilityRole === 'radio' && typeof node.props?.onPress === 'function',
    );
    // Composite and host nodes share the same handler; dedupe by callback identity.
    const presses = () => [...new Set(radios().map((node) => node.props.onPress as () => void))];
    expect(presses()).toHaveLength(9);

    // q1 correct option (index 1), q2 wrong option (index 0), q3 left unanswered.
    await act(async () => { presses()[1](); });
    await act(async () => { presses()[3](); });

    const submit = [...new Set(tree!.root.findAll(
      (node) => node.props?.accessibilityRole === 'button' && typeof node.props?.onPress === 'function',
    ).map((node) => node.props.onPress as () => void))][0];
    expect(submit).toBeDefined();
    await act(async () => { submit(); });

    const output = textOf(tree!.root);
    expect(output).toContain(`${t('correctAnswer')} 1/3`);
    expect(output).toContain(`${t('youAnswered')} 2/3`);
    expect(output).toContain(`${t('outstanding')} 1`);
  });
});
