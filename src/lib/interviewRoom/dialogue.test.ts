import { describe, expect, it } from 'vitest';
import {
  correctInterviewTerms,
  guardBuzzwords,
  detectMisconceptions,
  chooseDialogueAction,
  generateDebrief,
  computeOverallCall,
  getPointShortName,
  END_OF_ANSWER_PAUSE_SECONDS,
} from './dialogue';
import { interviewRoomQuestions } from './questions';
import type { TurnRecord } from './types';

describe('Interview Room Dialogue & Logic', () => {
  const qFoundation = interviewRoomQuestions[0];
  const qLora = interviewRoomQuestions[2];

  describe('correctInterviewTerms', () => {
    it('corrects Laura to LoRA on LoRA question', () => {
      const input = 'Laura is an adapter technique where we freeze base weights.';
      const output = correctInterviewTerms(input, 'genai-lora-production-serving');
      expect(output).toContain('LoRA is an adapter');
    });

    it('corrects general AI terms: rag, llm, gpu, vram, xgboost', () => {
      const input = 'we use rag with an llm and run it on a gpu with limited vram, or use xg boost for tabular.';
      const output = correctInterviewTerms(input);
      expect(output).toContain('RAG');
      expect(output).toContain('LLM');
      expect(output).toContain('GPU');
      expect(output).toContain('VRAM');
      expect(output).toContain('XGBoost');
    });

    it('corrects low rank adaptation casing', () => {
      const input = 'we apply low rank adaptation to the attention matrices.';
      const output = correctInterviewTerms(input, 'genai-lora-production-serving');
      expect(output).toContain('Low-Rank Adaptation');
    });
  });

  describe('guardBuzzwords', () => {
    it('rejects short answers under 12 words even if they contain buzzwords', () => {
      const answer = 'RAG fine-tuning vector database pretrain.';
      expect(guardBuzzwords(answer, 'p1_pretraining_scale')).toBe(false);
    });

    it('rejects answers that lack the key anchor terms for that point', () => {
      const answer = 'In our architecture we looked at multiple different components and evaluated how the server was performing overall without touching anything.';
      expect(guardBuzzwords(answer, 'p1_pretraining_scale')).toBe(false);
    });

    it('accepts answers that are long enough and contain key terms', () => {
      const answer = 'A foundation model is pretrained at massive scale on broad datasets so that it learns general representations.';
      expect(guardBuzzwords(answer, 'p1_pretraining_scale')).toBe(true);
    });
  });

  describe('detectMisconceptions', () => {
    it('detects next-token only misconception on foundation models', () => {
      const answer = 'A foundational model is basically a probabilistic model that tries to predict the next token.';
      const detected = detectMisconceptions(answer, qFoundation);
      expect(detected).not.toBeNull();
      expect(detected?.probe.id).toBe('w1_next_token_only');
      expect(detected?.spokenQuestion).toContain('vision or audio');
    });

    it('detects quantization misconception on LoRA', () => {
      const answer = 'LoRA is a compression technique that quantizes the weights down to lower bits.';
      const detected = detectMisconceptions(answer, qLora);
      expect(detected).not.toBeNull();
      expect(detected?.probe.id).toBe('w1_quantization_confusion');
      expect(detected?.spokenQuestion).toContain('quantize weights');
    });

    it('returns null when no misconceptions are present', () => {
      const answer = 'LoRA freezes the base model weights and trains two small low-rank adapter matrices.';
      const detected = detectMisconceptions(answer, qLora);
      expect(detected).toBeNull();
    });
  });

  describe('chooseDialogueAction (5 Dialogue Rules)', () => {
    it('Rule 1: advances immediately to debrief on excellent answer (all covered, no misconceptions)', async () => {
      const allCovered = qFoundation.points.map(point => ({
        point,
        status: 'covered' as const,
        confidence: 90,
      }));
      const action = chooseDialogueAction(0, [], 'great answer', qFoundation, allCovered, null);
      expect(action.type).toBe('debrief');
    });

    it('Rule 2: advances to debrief after max 2 follow-ups (turnIndex >= 2)', () => {
      const someCovered = qFoundation.points.map((point, i) => ({
        point,
        status: i === 0 ? ('covered' as const) : ('not_heard_yet' as const),
        confidence: 30,
      }));
      const action = chooseDialogueAction(2, [], 'answer', qFoundation, someCovered, null);
      expect(action.type).toBe('debrief');
    });

    it('Rule 3: prioritizes misconception probe on turn 0', () => {
      const someCovered = qFoundation.points.map(point => ({
        point,
        status: 'not_heard_yet' as const,
        confidence: 10,
      }));
      const misconception = {
        probe: qFoundation.wrong_answer_probes[0],
        matchedPhrase: 'predict the next token',
        spokenQuestion: 'Does next-token prediction apply to foundation models in vision or audio?',
      };
      const action = chooseDialogueAction(0, [], 'answer', qFoundation, someCovered, misconception);
      expect(action.type).toBe('follow_up');
      if (action.type === 'follow_up') {
        expect(action.probedMisconceptionId).toBe('w1_next_token_only');
        expect(action.spokenQuestion).toContain('vision or audio');
      }
    });

    it('Rule 4: probes single critical unaddressed claim in under 20 words', () => {
      const points = qFoundation.points.map((point, i) => ({
        point,
        status: i === 0 ? ('covered' as const) : ('not_heard_yet' as const),
        confidence: i === 0 ? 90 : 10,
      }));
      const action = chooseDialogueAction(0, [], 'answer', qFoundation, points, null);
      expect(action.type).toBe('follow_up');
      if (action.type === 'follow_up') {
        expect(action.probedPointId).toBe(qFoundation.points[1].id);
        const wordCount = action.spokenQuestion.split(/\s+/).length;
        expect(wordCount).toBeLessThanOrEqual(20);
      }
    });

    it('Rule 5: advances when learner clarifies probed point on turn 2', () => {
      const history: TurnRecord[] = [
        {
          turnIndex: 0,
          questionText: qFoundation.spoken_question,
          spokenText: qFoundation.spoken_question,
          isFollowUp: false,
          learnerAnswer: 'First answer',
        },
        {
          turnIndex: 1,
          questionText: qFoundation.points[1].follow_up_spoken,
          spokenText: qFoundation.points[1].follow_up_spoken,
          isFollowUp: true,
          probedPointId: qFoundation.points[1].id,
          learnerAnswer: 'I adapt the model by prompting or fine-tuning without retraining.',
        },
      ];
      const points = qFoundation.points.map((point, i) => ({
        point,
        status: i <= 2 ? ('covered' as const) : ('not_heard_yet' as const),
        confidence: 85,
      }));
      const action = chooseDialogueAction(1, history, 'clarified', qFoundation, points, null);
      expect(action.type).toBe('debrief');
    });
  });

  describe('computeOverallCall', () => {
    it('implements single, tested, deterministic rule for overall call', () => {
      expect(computeOverallCall(4, 4)).toBe('Strong');
      expect(computeOverallCall(3, 4)).toBe('Strong');
      expect(computeOverallCall(2, 4)).toBe('Getting there');
      expect(computeOverallCall(1, 4)).toBe('Getting there');
      expect(computeOverallCall(0, 4)).toBe('Needs work');
      expect(computeOverallCall(0, 0)).toBe('Needs work');
    });

    it('extracts concise lowercase point short name from claim', () => {
      expect(getPointShortName(qFoundation.points[0])).toContain('pretrained at scale');
      expect(getPointShortName(qFoundation.points[1])).toContain('acts as a shared base');
    });
  });

  describe('generateDebrief', () => {
    it('constructs scorecard with call, practice action, rubric rows, and marked text', () => {
      const turns: TurnRecord[] = [
        {
          turnIndex: 0,
          questionText: qFoundation.spoken_question,
          spokenText: qFoundation.spoken_question,
          isFollowUp: false,
          learnerAnswer: 'A foundation model is pretrained on massive datasets to learn general representations. However for simple tabular data classical models like XGBoost are much cheaper and faster.',
        },
      ];
      const points = [
        {
          point: qFoundation.points[0],
          status: 'covered' as const,
          confidence: 90,
          evidenceQuote: 'A foundation model is pretrained on massive datasets to learn general representations.',
        },
        {
          point: qFoundation.points[1],
          status: 'not_heard_yet' as const,
          confidence: 10,
        },
        {
          point: qFoundation.points[2],
          status: 'not_heard_yet' as const,
          confidence: 10,
        },
        {
          point: qFoundation.points[3],
          status: 'covered' as const,
          confidence: 85,
          evidenceQuote: 'classical models like XGBoost are much cheaper and faster.',
        },
      ];

      const debrief = generateDebrief(qFoundation, turns, points);
      expect(debrief.overallCall).toBe('Getting there');
      expect(debrief.practiceTitle).toBeTruthy();
      expect(debrief.practiceRoute).toBeTruthy();
      expect(debrief.rows.length).toBe(3);
      expect(debrief.rows[0].label).toBe('Fundamentals');
      expect(debrief.rows[0].pill).toBe('Strong');
      expect(debrief.rows[0].quote).toContain('pretrained on massive datasets');
      expect(debrief.markedAnswerHtml).toContain('<mark>');
    });

    it('builds honest debrief for weak answer (0 points covered) naming missed points and reporting no evidence', () => {
      const turns: TurnRecord[] = [
        {
          turnIndex: 0,
          questionText: qFoundation.spoken_question,
          spokenText: qFoundation.spoken_question,
          isFollowUp: false,
          learnerAnswer: 'Machine learning is about algorithms running on computers.',
        },
      ];
      const allMissed = qFoundation.points.map(point => ({
        point,
        status: 'not_heard_yet' as const,
        confidence: 15,
      }));

      const debrief = generateDebrief(qFoundation, turns, allMissed);
      expect(debrief.overallCall).toBe('Needs work');
      expect(debrief.overallSummary).toContain('You did not address any of the 4 core evaluation points');
      expect(debrief.overallSummary).toContain('We did not hear evidence for:');
      expect(debrief.overallSummary).toContain('pretrained at scale');
      expect(debrief.overallSummary).toContain('No direct evidence or verifiable technical claims were observed');

      // Verify all signal rows without evidence say so explicitly
      expect(debrief.rows[0].pill).toBe('Not heard yet');
      expect(debrief.rows[0].quote).toBe('No evidence heard in answer.');
      expect(debrief.rows[1].pill).toBe('Not heard yet');
      expect(debrief.rows[1].quote).toBe('No evidence heard when probed.');
      expect(debrief.rows[2].pill).toBe('Not heard yet');
      expect(debrief.rows[2].quote).toBe('No evidence heard in answer.');
    });

    it('builds debrief for strong answer (all points covered) praising only real evidence', () => {
      const turns: TurnRecord[] = [
        {
          turnIndex: 0,
          questionText: qFoundation.spoken_question,
          spokenText: qFoundation.spoken_question,
          isFollowUp: false,
          learnerAnswer: 'A foundation model is pretrained at scale on massive broad datasets. It adapts to many downstream tasks via prompting without retraining from scratch. Classical models like XGBoost remain superior for tabular data with strict latency.',
        },
      ];
      const allCovered = qFoundation.points.map((point, i) => ({
        point,
        status: 'covered' as const,
        confidence: 90,
        evidenceQuote: i === 0 ? 'pretrained at scale on massive broad datasets' : undefined,
      }));

      const debrief = generateDebrief(qFoundation, turns, allCovered);
      expect(debrief.overallCall).toBe('Strong');
      expect(debrief.overallSummary).toContain('You covered all 4 core dimensions:');
      expect(debrief.overallSummary).toContain('No core technical criteria were left unaddressed.');
      expect(debrief.overallSummary).toContain('Demonstrated evidence heard: "pretrained at scale on massive broad datasets".');
      // Depth when probed should be "Not probed" because all points were covered on turn 1
      expect(debrief.rows[1].pill).toBe('Not probed');
      expect(debrief.rows[1].quote).toContain('criteria satisfied on opening turn');
    });

    it('builds debrief for next-token probed answer citing probed misconception and actual quote', () => {
      const turns: TurnRecord[] = [
        {
          turnIndex: 0,
          questionText: qFoundation.spoken_question,
          spokenText: qFoundation.spoken_question,
          isFollowUp: false,
          learnerAnswer: 'A foundation model basically just predicts the next token based on previous tokens. XGBoost is cheaper for tabular data.',
        },
        {
          turnIndex: 1,
          questionText: 'Does that apply to vision and audio?',
          spokenText: 'Does that apply to vision and audio?',
          isFollowUp: true,
          probedMisconceptionId: 'w1_next_token_only',
          learnerAnswer: 'In vision foundation models learn representations without predicting text tokens.',
        },
      ];

      const evaluated = [
        {
          point: qFoundation.points[0],
          status: 'not_heard_yet' as const,
          confidence: 20,
        },
        {
          point: qFoundation.points[1],
          status: 'not_heard_yet' as const,
          confidence: 25,
        },
        {
          point: qFoundation.points[2],
          status: 'not_heard_yet' as const,
          confidence: 20,
        },
        {
          point: qFoundation.points[3],
          status: 'covered' as const,
          confidence: 88,
          evidenceQuote: 'XGBoost is cheaper for tabular data.',
        },
      ];

      const debrief = generateDebrief(qFoundation, turns, evaluated);
      expect(debrief.overallCall).toBe('Getting there');
      expect(debrief.overallSummary).toContain('You covered 1 of 4 evaluation points');
      expect(debrief.overallSummary).toContain('We did not hear evidence for');
      expect(debrief.overallSummary).toContain('misconception (Defines foundation model strictly as next-token prediction)');
      expect(debrief.overallSummary).toContain('Demonstrated evidence heard: "XGBoost is cheaper for tabular data."');
      expect(debrief.rows[1].label).toBe('Depth when probed');
      expect(debrief.rows[1].pill).toBe('Partly there');
      expect(debrief.rows[1].quote).toContain('In vision foundation models learn representations');
    });
  });

  it('verifies END_OF_ANSWER_PAUSE_SECONDS constant is 6.0', () => {
    expect(END_OF_ANSWER_PAUSE_SECONDS).toBe(6.0);
  });
});
