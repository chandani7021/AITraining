import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { Layout } from '../../components/Layout';
import { ContentRenderer } from '../../components/training/ContentRenderer';
import { QuizSection } from '../../components/training/QuizSection';
import { StepIndicator } from '../../components/training/StepIndicator';
import type { Stage } from '../../components/training/types';
import type { EmployeeTrainingDetail, QuizAnswer, QuizResult } from '../../types';

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

async function fetchTraining(id: string): Promise<EmployeeTrainingDetail> {
  const { data } = await apiClient.get(`/employee/trainings/${id}`);
  return data;
}

async function submitQuiz(id: string, answers: QuizAnswer[]): Promise<QuizResult> {
  const { data } = await apiClient.post(`/employee/trainings/${id}/submit-quiz`, { answers });
  return data;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function TrainingDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const storageKey = `mfg-training-${id}`;

  // stageState: initialized from localStorage; null means "not yet set by user interaction"
  const [stageState, setStage] = useState<Stage | null>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved).stage ?? null;
    } catch { /* ignore */ }
    return null;
  });

  const [moduleAnswers, setModuleAnswers] = useState<Record<number, Record<string, number>>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? (JSON.parse(saved).moduleAnswers ?? {}) : {};
    } catch { return {}; }
  });

  const [moduleChecked, setModuleChecked] = useState<Record<number, boolean>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? (JSON.parse(saved).moduleChecked ?? {}) : {};
    } catch { return {}; }
  });

  const [finalAnswers, setFinalAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<QuizResult | null>(null);

  const { data: training, isLoading } = useQuery({
    queryKey: ['employee', 'training', id],
    queryFn: () => fetchTraining(id ?? ''),
    enabled: !!id,
  });

  // Derived stage: localStorage → backend → default module 0
  // Computing during render means no setStage-in-effect needed
  const backendModuleIndex = training?.progress.current_module_index ?? null;
  const stage = useMemo<Stage>(() => {
    if (stageState !== null) return stageState;
    if (backendModuleIndex != null) {
      return { type: 'module-content', index: backendModuleIndex };
    }
    return { type: 'module-content', index: 0 };
  }, [stageState, backendModuleIndex]);

  // Persist to localStorage only after user has interacted (stageState is non-null)
  useEffect(() => {
    if (stageState === null) return;
    if (stage.type === 'result') {
      localStorage.removeItem(storageKey);
    } else {
      localStorage.setItem(storageKey, JSON.stringify({ stage, moduleAnswers, moduleChecked }));
    }
  }, [stage, moduleAnswers, moduleChecked, storageKey, stageState]);

  // Debounced save to backend — fires 1.5s after the last stage change
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (stage.type !== 'module-content' && stage.type !== 'module-quiz') return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      apiClient
        .patch(`/employee/trainings/${id}/progress`, { current_module_index: stage.index })
        .catch(() => {});
    }, 1500);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [stage, id]);

  const submitMutation = useMutation({
    mutationFn: (payload: QuizAnswer[]) => submitQuiz(id ?? '', payload),
    onSuccess: (data) => {
      setResult(data);
      setStage({ type: 'result' });
      qc.invalidateQueries({ queryKey: ['employee', 'trainings'] });
      qc.invalidateQueries({ queryKey: ['employee', 'training', id] });
    },
  });

  function handleRetake() {
    localStorage.removeItem(storageKey);
    setStage({ type: 'module-content', index: 0 });
    setModuleAnswers({});
    setModuleChecked({});
    setFinalAnswers({});
    setResult(null);
  }

  if (isLoading) {
    return (
      <Layout>
        <p className="text-gray-500 text-sm">Loading training…</p>
      </Layout>
    );
  }

  if (!training) {
    return (
      <Layout>
        <p className="text-red-600 text-sm">Training not found or not assigned to you.</p>
      </Layout>
    );
  }

  const modules = training.modules?.modules ?? [];

  const finalQuizQuestions = training.modules?.final_quiz?.questions?.length
    ? training.modules.final_quiz.questions
    : modules.flatMap((m) => m.quiz.questions);

  // ------------------------------------------------------------------
  // Module content screen
  // ------------------------------------------------------------------
  if (stage.type === 'module-content') {
    const mod = modules[stage.index];
    return (
      <Layout>
        <h2 className="text-xl font-bold text-gray-900 mb-5">{training.title}</h2>
        <StepIndicator modules={modules} stage={stage} />

        {training.progress.completed && (
          <div className="mb-4 inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-1.5 rounded-lg">
            <span>✓</span>
            <span>Previously completed — Score: {training.progress.score}%</span>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-5">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
            <p className="text-xs text-sky-600 font-semibold uppercase tracking-wide mb-0.5">
              Module {stage.index + 1} of {modules.length}
            </p>
            <h3 className="font-semibold text-gray-900">{mod.title}</h3>
            <p className="text-sm text-gray-500 mt-0.5">{mod.summary}</p>
          </div>
          <div className="px-5 py-5 space-y-4">
            {mod.content.map((block) => (
              <ContentRenderer key={JSON.stringify(block)} block={block} />
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setStage({ type: 'module-quiz', index: stage.index })}
          className="w-full bg-sky-600 hover:bg-sky-700 text-white font-semibold py-3 rounded-lg text-sm transition"
        >
          Next: Take Module {stage.index + 1} Quiz →
        </button>

        <button
          type="button"
          onClick={() => {
            if (stage.index === 0) {
              navigate('/employee/trainings');
            } else {
              setStage({ type: 'module-quiz', index: stage.index - 1 });
            }
          }}
          className="mt-3 w-full border border-gray-200 hover:border-gray-300 text-gray-500 hover:text-gray-700 font-medium py-2.5 rounded-lg text-sm transition"
        >
          ← {stage.index === 0 ? 'Back to Trainings' : `Back to Module ${stage.index} Quiz`}
        </button>

        {training.progress.completed && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={handleRetake}
              className="text-sm text-gray-400 hover:text-gray-600 underline"
            >
              Restart from beginning
            </button>
          </div>
        )}
      </Layout>
    );
  }

  // ------------------------------------------------------------------
  // Module quiz screen
  // ------------------------------------------------------------------
  if (stage.type === 'module-quiz') {
    const mod = modules[stage.index];
    const isLastModule = stage.index === modules.length - 1;
    const currentAnswers = moduleAnswers[stage.index] ?? {};
    const isChecked = moduleChecked[stage.index] ?? false;
    const allAnswered = mod.quiz.questions.every((q) => currentAnswers[q.id] !== undefined);

    return (
      <Layout>
        <h2 className="text-xl font-bold text-gray-900 mb-5">{training.title}</h2>
        <StepIndicator modules={modules} stage={stage} />

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-5 bg-indigo-500 rounded-full" />
            <h4 className="font-bold text-gray-900">
              Module {stage.index + 1} Quiz
              <span className="ml-2 text-sm font-normal text-gray-400">— {mod.title}</span>
            </h4>
          </div>
          <p className="text-xs text-gray-400 mb-6">
            {mod.quiz.questions.length} question{mod.quiz.questions.length !== 1 ? 's' : ''}
            {' '}· Practice round — answers shown immediately
          </p>

          <QuizSection
            questions={mod.quiz.questions}
            answers={currentAnswers}
            onSelect={(qid, idx) => {
              if (!isChecked) {
                setModuleAnswers((prev) => ({
                  ...prev,
                  [stage.index]: { ...(prev[stage.index] ?? {}), [qid]: idx },
                }));
              }
            }}
            checked={isChecked}
          />

          {!isChecked && (
            <div className="mt-5 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStage({ type: 'module-content', index: stage.index })}
                className="text-sm text-gray-400 hover:text-gray-600 transition"
              >
                ← Back to Content
              </button>
              <div className="flex items-center gap-3">
                <p className="text-xs text-gray-400">
                  {Object.keys(currentAnswers).length} / {mod.quiz.questions.length} answered
                </p>
                <button
                  type="button"
                  onClick={() => setModuleChecked((prev) => ({ ...prev, [stage.index]: true }))}
                  disabled={!allAnswered}
                  className=" bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition"
                >
                  Check Answers
                </button>
              </div>
            </div>
          )}
        </div>

        {isChecked && (
          <div className="space-y-2 mt-2">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setModuleAnswers((prev) => ({ ...prev, [stage.index]: {} }));
                  setModuleChecked((prev) => ({ ...prev, [stage.index]: false }));
                }}
                className="flex-1 border border-gray-300 hover:border-gray-400 text-gray-600 hover:text-gray-800 font-medium py-3 rounded-lg text-sm transition"
              >
                Retake This Quiz
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isLastModule) {
                    setStage({ type: 'final-quiz' });
                  } else {
                    setStage({ type: 'module-content', index: stage.index + 1 });
                  }
                }}
                className="flex-1 bg-sky-600 hover:bg-sky-700 text-white font-semibold py-3 rounded-lg text-sm transition"
              >
                {isLastModule ? 'Next: Final Quiz →' : `Next: Module ${stage.index + 2} →`}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setStage({ type: 'module-content', index: stage.index })}
              className="w-full border border-gray-200 hover:border-gray-300 text-gray-500 hover:text-gray-700 font-medium py-2.5 rounded-lg text-sm transition"
            >
              ← Back to Module {stage.index + 1} Content
            </button>
          </div>
        )}
      </Layout>
    );
  }

  // ------------------------------------------------------------------
  // Final quiz screen
  // ------------------------------------------------------------------
  if (stage.type === 'final-quiz') {
    const allAnswered = finalQuizQuestions.every((q) => finalAnswers[q.id] !== undefined);

    function handleFinalSubmit() {
      const payload: QuizAnswer[] = Object.entries(finalAnswers).map(([qid, idx]) => ({
        question_id: qid,
        selected_index: idx,
      }));
      submitMutation.mutate(payload);
    }

    return (
      <Layout>
        <h2 className="text-xl font-bold text-gray-900 mb-5">{training.title}</h2>
        <StepIndicator modules={modules} stage={stage} />

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-5 bg-indigo-600 rounded-full" />
            <h4 className="font-bold text-gray-900 text-lg">Final Quiz</h4>
          </div>
          <p className="text-xs text-gray-400 mb-6">
            {finalQuizQuestions.length} questions across all {modules.length} modules · This is scored
          </p>

          <QuizSection
            questions={finalQuizQuestions}
            answers={finalAnswers}
            onSelect={(qid, idx) => setFinalAnswers((prev) => ({ ...prev, [qid]: idx }))}
            checked={false}
          />

          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStage({ type: 'module-quiz', index: modules.length - 1 })}
              className="text-sm text-gray-400 hover:text-gray-600 transition"
            >
              ← Back to Last Module Quiz
            </button>
            <div className="flex items-center gap-3">
              <p className="text-xs text-gray-400">
                {Object.keys(finalAnswers).length} / {finalQuizQuestions.length} answered
              </p>
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={!allAnswered || submitMutation.isPending}
                className="bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white font-semibold px-8 py-2.5 rounded-lg text-sm transition"
              >
                {submitMutation.isPending ? 'Submitting…' : 'Submit & See Results'}
              </button>
            </div>
          </div>

          {submitMutation.isError && (
            <p className="mt-3 text-sm text-red-600">Failed to submit. Please try again.</p>
          )}
        </div>
      </Layout>
    );
  }

  // ------------------------------------------------------------------
  // Result screen
  // ------------------------------------------------------------------
  if (stage.type === 'result' && result) {
    return (
      <Layout>
        <h2 className="text-xl font-bold text-gray-900 mb-6">{training.title}</h2>
        <div
          className={`p-10 rounded-2xl text-center ${
            result.passed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}
        >
          <p className={`text-6xl font-bold mb-3 ${result.passed ? 'text-green-600' : 'text-red-600'}`}>
            {result.score}%
          </p>
          <p className={`text-lg font-semibold ${result.passed ? 'text-green-700' : 'text-red-700'}`}>
            {result.passed ? 'Passed! Well done.' : 'Not passed. Score ≥ 80% required.'}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            {result.passed
              ? 'You have successfully completed this training.'
              : 'Review the modules and try again to improve your score.'}
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleRetake}
              className="bg-sky-600 hover:bg-sky-700 text-white px-8 py-2.5 rounded-lg text-sm font-medium transition"
            >
              Retake Training
            </button>
            <button
              type="button"
              onClick={() => navigate('/employee/trainings')}
              className="border border-gray-300 hover:border-gray-400 text-gray-600 hover:text-gray-800 px-8 py-2.5 rounded-lg text-sm font-medium transition"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return null;
}
