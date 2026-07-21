"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { db } from "@/offline/db";
import { useOffline } from "@/providers/OfflineProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  WifiOff,
  Wifi,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Send,
  Loader2,
} from "lucide-react";

interface Question {
  id: string;
  type: string;
  text: string;
  required: boolean;
  options: string[] | null;
  order: number;
}

interface Survey {
  id: string;
  title: string;
  description: string | null;
  questions: Question[];
}

export default function CollectPage() {
  const params = useParams();
  const surveyId = params.surveyId as string;
  const { isOnline, pendingCount } = useOffline();

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<
    Record<string, string | number | string[]>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSurvey() {
      try {
        const localSurvey = await db.surveys.get(surveyId);
        if (localSurvey) {
          setSurvey({
            id: localSurvey.id,
            title: localSurvey.title,
            description: localSurvey.description,
            questions: JSON.parse(localSurvey.questions),
          });
          setLoading(false);
          return;
        }

        if (navigator.onLine) {
          const res = await fetch(`/api/surveys/${surveyId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.isPublished) {
              setSurvey(data);
              await db.surveys.put({
                id: data.id,
                title: data.title,
                description: data.description,
                questions: JSON.stringify(data.questions),
                isPublished: true,
                syncedAt: new Date().toISOString(),
              });
            }
          }
        }
      } catch {
      } finally {
        setLoading(false);
      }
    }
    loadSurvey();
  }, [surveyId]);

  const updateAnswer = useCallback(
    (questionId: string, value: string | number | string[]) => {
      setAnswers((prev) => ({ ...prev, [questionId]: value }));
    },
    []
  );

  const toggleCheckbox = useCallback(
    (questionId: string, option: string) => {
      setAnswers((prev) => {
        const current = (prev[questionId] as string[]) || [];
        const updated = current.includes(option)
          ? current.filter((v) => v !== option)
          : [...current, option];
        return { ...prev, [questionId]: updated };
      });
    },
    []
  );

  async function handleSubmit() {
    if (!survey) return;

    for (const q of survey.questions) {
      if (q.required) {
        const answer = answers[q.id];
        if (
          answer === undefined ||
          answer === "" ||
          (Array.isArray(answer) && answer.length === 0)
        ) {
          setError(`Please answer: "${q.text}"`);
          return;
        }
      }
    }

    setSubmitting(true);
    setError(null);

    const responseId = crypto.randomUUID();
    const answerData = Object.entries(answers).map(([questionId, value]) => ({
      questionId,
      value,
    }));
    const responseData = {
      id: responseId,
      surveyId: survey.id,
      answers: answerData,
      createdAt: new Date().toISOString(),
      synced: false,
    };

    try {
      await db.responses.put({ ...responseData, answers: JSON.stringify(answerData) } as any);

      if (!navigator.onLine) {
        await db.syncQueue.add({
          entityType: "response",
          entityId: responseId,
          action: "create",
          payload: JSON.stringify(responseData),
          createdAt: new Date().toISOString(),
          attempts: 0,
        });
        setSubmitted(true);
        return;
      }

      const res = await fetch("/api/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surveyId: survey.id,
          answers: responseData.answers,
          isOffline: false,
        }),
      });

      if (res.ok) {
        await db.responses.update(responseId, { synced: true });
        setSubmitted(true);
      } else {
        await db.syncQueue.add({
          entityType: "response",
          entityId: responseId,
          action: "create",
          payload: JSON.stringify(responseData),
          createdAt: new Date().toISOString(),
          attempts: 0,
        });
        setSubmitted(true);
      }
    } catch {
      await db.syncQueue.add({
        entityType: "response",
        entityId: responseId,
        action: "create",
        payload: JSON.stringify(responseData),
        createdAt: new Date().toISOString(),
        attempts: 0,
      });
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="py-12 text-center">
            <WifiOff className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Survey Not Found</h2>
            <p className="text-muted-foreground">
              {!navigator.onLine
                ? "You're offline and this survey hasn't been cached yet."
                : "This survey doesn't exist or hasn't been published."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary/30">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
            <h2 className="text-2xl font-bold mb-2">Thank You!</h2>
            <p className="text-muted-foreground mb-4">
              Your response has been recorded.
              {!isOnline &&
                " It will be synced when you're back online."}
            </p>
            {!isOnline && pendingCount > 0 && (
              <Badge variant="warning">
                {pendingCount} response{pendingCount !== 1 && "s"} waiting to
                sync
              </Badge>
            )}
            <Button
              variant="outline"
              className="mt-6"
              onClick={() => {
                setSubmitted(false);
                setAnswers({});
                setCurrentIndex(0);
              }}
            >
              Submit Another Response
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = survey.questions.sort(
    (a, b) => a.order - b.order
  )[currentIndex];
  const progress = ((currentIndex + 1) / survey.questions.length) * 100;

  return (
    <div className="min-h-screen bg-secondary/30">
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <h1 className="font-semibold text-sm truncate">{survey.title}</h1>
            <div className="flex items-center gap-2">
              {isOnline ? (
                <Badge variant="success" className="text-xs gap-1">
                  <Wifi className="h-3 w-3" /> Online
                </Badge>
              ) : (
                <Badge variant="warning" className="text-xs gap-1">
                  <WifiOff className="h-3 w-3" /> Offline
                </Badge>
              )}
            </div>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Question {currentIndex + 1} of {survey.questions.length}
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {currentIndex === 0 && survey.description && (
          <p className="text-muted-foreground mb-6 text-center">
            {survey.description}
          </p>
        )}

        {error && (
          <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
            {error}
          </div>
        )}

        {currentQuestion && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {currentQuestion.text}
                {currentQuestion.required && (
                  <span className="text-destructive ml-1">*</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentQuestion.type === "TEXT_INPUT" && (
                <textarea
                  className="w-full min-h-[120px] rounded-lg border border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Type your answer here..."
                  value={(answers[currentQuestion.id] as string) || ""}
                  onChange={(e) =>
                    updateAnswer(currentQuestion.id, e.target.value)
                  }
                />
              )}

              {currentQuestion.type === "MULTIPLE_CHOICE" &&
                currentQuestion.options && (
                  <div className="space-y-2">
                    {currentQuestion.options.map((opt) => (
                      <label
                        key={opt}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          answers[currentQuestion.id] === opt
                            ? "border-primary bg-primary/5"
                            : "hover:bg-secondary/50"
                        }`}
                      >
                        <input
                          type="radio"
                          name={currentQuestion.id}
                          value={opt}
                          checked={answers[currentQuestion.id] === opt}
                          onChange={() => updateAnswer(currentQuestion.id, opt)}
                          className="h-4 w-4 text-primary"
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                )}

              {currentQuestion.type === "CHECKBOX" &&
                currentQuestion.options && (
                  <div className="space-y-2">
                    {currentQuestion.options.map((opt) => {
                      const selected = (
                        (answers[currentQuestion.id] as string[]) || []
                      ).includes(opt);
                      return (
                        <label
                          key={opt}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            selected
                              ? "border-primary bg-primary/5"
                              : "hover:bg-secondary/50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() =>
                              toggleCheckbox(currentQuestion.id, opt)
                            }
                            className="h-4 w-4 rounded text-primary"
                          />
                          <span>{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

              {currentQuestion.type === "DROPDOWN" &&
                currentQuestion.options && (
                  <select
                    className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={(answers[currentQuestion.id] as string) || ""}
                    onChange={(e) =>
                      updateAnswer(currentQuestion.id, e.target.value)
                    }
                  >
                    <option value="">Select an option...</option>
                    {currentQuestion.options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                )}

              {currentQuestion.type === "RATING_SCALE" && (
                <div className="flex justify-center gap-3 py-4">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      onClick={() => updateAnswer(currentQuestion.id, num)}
                      className={`h-14 w-14 rounded-xl text-lg font-bold transition-all ${
                        answers[currentQuestion.id] === num
                          ? "bg-primary text-primary-foreground scale-110"
                          : "bg-secondary hover:bg-secondary/80"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              )}

              {currentQuestion.type === "DATE_INPUT" && (
                <input
                  type="date"
                  className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={(answers[currentQuestion.id] as string) || ""}
                  onChange={(e) =>
                    updateAnswer(currentQuestion.id, e.target.value)
                  }
                />
              )}
            </CardContent>
          </Card>
        )}

        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => {
              setError(null);
              setCurrentIndex(Math.max(0, currentIndex - 1));
            }}
            disabled={currentIndex === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {currentIndex < survey.questions.length - 1 ? (
            <Button
              onClick={() => {
                setError(null);
                setCurrentIndex(currentIndex + 1);
              }}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="gap-2"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {submitting
                ? "Submitting..."
                : isOnline
                ? "Submit"
                : "Submit Offline"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
