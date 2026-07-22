"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/offline/db";
import { useOffline } from "@/providers/OfflineProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  WifiOff, Wifi, CheckCircle, ArrowLeft, ArrowRight, Send, Loader2, LogIn,
  Pause, Play, StopCircle, Cloud, CloudOff, Clock, User,
} from "lucide-react";

interface Question {
  id: string; type: string; text: string; required: boolean; options: string[] | null; order: number;
}

interface Survey {
  id: string; title: string; description: string | null; questions: Question[]; status: string;
}

interface CollectionSession {
  id: string; status: string; responsesCount: number; startedAt: string;
}

export default function CollectPage() {
  const params = useParams();
  const router = useRouter();
  const surveyId = params.surveyId as string;
  const { isOnline, pendingCount } = useOffline();

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | number | string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [session, setSession] = useState<CollectionSession | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const responseCountRef = useRef(0);
  const [sessionResponses, setSessionResponses] = useState(0);
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/session");
        const data = await res.json();
        setUser(data.user || null);
      } catch { setUser(null); }
      finally { setAuthChecked(true); }
    }
    checkAuth();
  }, []);

  useEffect(() => {
    if (!authChecked || !user) return;
    async function loadSurvey() {
      try {
        if (navigator.onLine) {
          const res = await fetch(`/api/surveys/${surveyId}`);
          if (res.ok) {
            const data = await res.json();
            setSurvey(data);
            await db.surveys.put({ id: data.id, title: data.title, description: data.description,
              questions: JSON.stringify(data.questions), status: data.status, syncedAt: new Date().toISOString() });
            setLoading(false);
            return;
          }
        }
        const localSurvey = await db.surveys.get(surveyId);
        if (localSurvey) {
          setSurvey({ id: localSurvey.id, title: localSurvey.title, description: localSurvey.description,
            questions: JSON.parse(localSurvey.questions), status: localSurvey.status });
        }
      } catch {}
      finally { setLoading(false); }
    }
    loadSurvey();
  }, [surveyId, authChecked, user]);

  useEffect(() => {
    if (!authChecked || !user || !survey) return;
    async function ensureSession() {
      try {
        const res = await fetch("/api/collector/sessions", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ surveyId }),
        });
        if (res.ok) {
          const data = await res.json();
          setSession(data);
          setSessionResponses(data.responsesCount || 0);
          responseCountRef.current = data.responsesCount || 0;
          setSessionError(null);
        } else {
          setSessionError("You don't have collector access for this survey. Responses can still be submitted.");
        }
      } catch {
        setSessionError("Could not create collection session. Responses can still be submitted.");
      }
    }
    ensureSession();
  }, [surveyId, authChecked, user, survey]);

  const autoSaveAnswer = useCallback((qId: string, val: string | number | string[]) => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      setAutoSaveStatus("saving");
      const key = `autosave_${surveyId}_${user?.id}`;
      const data = { answers: { ...answers, [qId]: val }, savedAt: new Date().toISOString() };
      try {
        localStorage.setItem(key, JSON.stringify(data));
        setAutoSaveStatus("saved");
        setTimeout(() => setAutoSaveStatus("idle"), 2000);
      } catch {
        setAutoSaveStatus("idle");
      }
    }, 1000);
  }, [answers, surveyId, user?.id]);

  useEffect(() => {
    if (!user || !survey) return;
    const key = `autosave_${surveyId}_${user.id}`;
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.answers) setAnswers(data.answers);
      }
    } catch {}
  }, [user, survey, surveyId]);

  const updateAnswer = useCallback((questionId: string, value: string | number | string[]) => {
    setAnswers((prev) => {
      const next = { ...prev, [questionId]: value };
      autoSaveAnswer(questionId, value);
      return next;
    });
  }, [autoSaveAnswer]);

  const toggleCheckbox = useCallback((questionId: string, option: string) => {
    setAnswers((prev) => {
      const current = (prev[questionId] as string[]) || [];
      const updated = current.includes(option) ? current.filter((v) => v !== option) : [...current, option];
      autoSaveAnswer(questionId, updated);
      return { ...prev, [questionId]: updated };
    });
  }, [autoSaveAnswer]);

  async function updateSessionStatus(action: string) {
    if (!session) return;
    setSessionLoading(true);
    try {
      const res = await fetch(`/api/collector/sessions/${session.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, responsesCount: responseCountRef.current }),
      });
      if (res.ok) {
        const data = await res.json();
        setSession(data);
      }
    } catch {}
    finally { setSessionLoading(false); }
  }

  async function handleSubmit() {
    if (!survey) return;
    for (const q of survey.questions) {
      if (q.required) {
        const answer = answers[q.id];
        if (answer === undefined || answer === "" || (Array.isArray(answer) && answer.length === 0)) {
          setError(`Please answer: "${q.text}"`);
          return;
        }
      }
    }

    setSubmitting(true);
    setError(null);

    const responseId = crypto.randomUUID();
    const answerData = Object.entries(answers).map(([questionId, value]) => ({ questionId, value }));
    const responseData = { id: responseId, surveyId: survey.id, answers: answerData, createdAt: new Date().toISOString(), synced: false };

    async function addToSyncQueue() {
      await db.syncQueue.add({ entityType: "response", entityId: responseId, action: "create",
        payload: JSON.stringify(responseData), createdAt: new Date().toISOString(), attempts: 0 });
    }

    try {
      await db.responses.put({ ...responseData, answers: JSON.stringify(answerData) } as any);

      if (!navigator.onLine) {
        await addToSyncQueue();
        responseCountRef.current++;
        setSessionResponses(responseCountRef.current);
        const key = `autosave_${surveyId}_${user.id}`;
        localStorage.removeItem(key);
        setSubmitted(true);
        return;
      }

      const res = await fetch("/api/responses", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ surveyId: survey.id, answers: answerData, isOffline: false }),
      });

      if (res.ok) {
        await db.responses.update(responseId, { synced: true });
        responseCountRef.current++;
        setSessionResponses(responseCountRef.current);
        if (session) {
          fetch(`/api/collector/sessions/${session.id}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "count", responsesCount: responseCountRef.current }),
          }).catch(() => {});
        }
        const key = `autosave_${surveyId}_${user.id}`;
        localStorage.removeItem(key);
        setSubmitted(true);
      } else {
        await addToSyncQueue();
        responseCountRef.current++;
        setSessionResponses(responseCountRef.current);
        const key = `autosave_${surveyId}_${user.id}`;
        localStorage.removeItem(key);
        setError("Server rejected the response. It has been saved offline and will sync later.");
      }
    } catch {
      await addToSyncQueue();
      responseCountRef.current++;
      setSessionResponses(responseCountRef.current);
      const key = `autosave_${surveyId}_${user.id}`;
      localStorage.removeItem(key);
      setSubmitted(true);
    } finally { setSubmitting(false); }
  }

  if (!authChecked || loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary/30">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="py-12 text-center">
            <LogIn className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Login Required</h2>
            <p className="text-muted-foreground mb-4">You need an account to collect data for this survey.</p>
            <Button onClick={() => router.push("/login")}>Go to Login</Button>
          </CardContent>
        </Card>
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
            <p className="text-muted-foreground">{!navigator.onLine ? "You're offline and this survey hasn't been cached yet." : "This survey doesn't exist or isn't accepting responses."}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (survey.status === "draft") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary/30">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="py-12 text-center">
            <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Survey Not Ready</h2>
            <p className="text-muted-foreground mb-4">This survey is still in draft mode and not accepting responses yet.</p>
            <Button variant="outline" onClick={() => router.push("/dashboard")}>Back to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (survey.status === "paused") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary/30">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="py-12 text-center">
            <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-yellow-100 flex items-center justify-center">
              <WifiOff className="h-8 w-8 text-yellow-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Survey Paused</h2>
            <p className="text-muted-foreground mb-4">This survey is temporarily paused by the owner.</p>
            <Button variant="outline" onClick={() => router.push("/dashboard")}>Back to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (survey.status === "closed") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary/30">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="py-12 text-center">
            <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Survey Closed</h2>
            <p className="text-muted-foreground mb-4">This survey is no longer accepting responses.</p>
            <Button variant="outline" onClick={() => router.push("/dashboard")}>Back to Dashboard</Button>
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
            <h2 className="text-2xl font-bold mb-2">Response Saved!</h2>
            <p className="text-muted-foreground mb-2">
              {sessionResponses} response{sessionResponses !== 1 ? "s" : ""} collected this session
            </p>
            <p className="text-muted-foreground mb-4">
              {!isOnline && "This response will sync when you're back online."}
            </p>
            {!isOnline && pendingCount > 0 && (
              <Badge variant="warning">{pendingCount} response{pendingCount !== 1 ? "s" : ""} waiting to sync</Badge>
            )}
            <div className="flex flex-col gap-2 mt-6">
              <Button onClick={() => { setSubmitted(false); setAnswers({}); setCurrentIndex(0); }}>
                Collect Another Response
              </Button>
              {session && session.status === "active" && (
                <Button variant="outline" onClick={() => updateSessionStatus("pause")} disabled={sessionLoading}>
                  <Pause className="h-4 w-4 mr-2" /> Pause Collection
                </Button>
              )}
              {session && session.status === "paused" && (
                <Button variant="outline" onClick={() => updateSessionStatus("resume")} disabled={sessionLoading}>
                  <Play className="h-4 w-4 mr-2" /> Resume Collection
                </Button>
              )}
              {session && (session.status === "active" || session.status === "paused") && (
                <Button variant="destructive" onClick={() => {
                  if (confirm("Close this collection session and submit results to the survey owner?")) {
                    updateSessionStatus("submit");
                  }
                }} disabled={sessionLoading}>
                  <StopCircle className="h-4 w-4 mr-2" /> Close & Submit to Owner
                </Button>
              )}
              {session?.status === "submitted" && (
                <div className="mt-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                    Results submitted to survey owner!
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sortedQuestions = survey.questions.sort((a, b) => a.order - b.order);
  const currentQuestion = sortedQuestions[currentIndex];
  const progress = ((currentIndex + 1) / sortedQuestions.length) * 100;
  const sessionStatus = session?.status || "active";
  const isPaused = sessionStatus === "paused";

  return (
    <div className="min-h-screen bg-secondary/30">
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <h1 className="font-semibold text-sm truncate">{survey.title}</h1>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{user.name || user.email}</span>
              {isOnline ? (
                <Badge variant="success" className="text-xs gap-1"><Wifi className="h-3 w-3" /> Online</Badge>
              ) : (
                <Badge variant="warning" className="text-xs gap-1"><WifiOff className="h-3 w-3" /> Offline</Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all duration-300 rounded-full" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-xs text-muted-foreground shrink-0">{currentIndex + 1}/{sortedQuestions.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {autoSaveStatus === "saving" && <span className="text-xs text-muted-foreground flex items-center gap-1"><CloudOff className="h-3 w-3 animate-pulse" /> Saving...</span>}
              {autoSaveStatus === "saved" && <span className="text-xs text-green-600 flex items-center gap-1"><Cloud className="h-3 w-3" /> Draft saved</span>}
              {session && (
                <Badge variant={sessionStatus === "active" ? "success" : sessionStatus === "paused" ? "warning" : sessionStatus === "submitted" ? "default" : "secondary"} className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  {sessionResponses} collected
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              {session && sessionStatus === "active" && (
                <Button variant="ghost" size="sm" onClick={() => updateSessionStatus("pause")} disabled={sessionLoading} className="h-7 text-xs gap-1">
                  <Pause className="h-3 w-3" /> Pause
                </Button>
              )}
              {session && sessionStatus === "paused" && (
                <Button variant="ghost" size="sm" onClick={() => updateSessionStatus("resume")} disabled={sessionLoading} className="h-7 text-xs gap-1">
                  <Play className="h-3 w-3" /> Resume
                </Button>
              )}
              {session && (sessionStatus === "active" || sessionStatus === "paused") && (
                <Button variant="ghost" size="sm" onClick={() => {
                  if (confirm(`Submit ${sessionResponses} collected responses to the survey owner and close this session?`)) {
                    updateSessionStatus("submit");
                  }
                }} disabled={sessionLoading} className="h-7 text-xs gap-1 text-destructive hover:text-destructive">
                  <StopCircle className="h-3 w-3" /> Submit
                </Button>
              )}
              {session?.status === "submitted" && (
                <Badge variant="success" className="text-xs">Submitted</Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {isPaused && (
        <div className="max-w-2xl mx-auto px-4 pt-6">
          <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800">
            <CardContent className="py-8 text-center">
              <Pause className="h-12 w-12 mx-auto mb-3 text-yellow-600" />
              <h2 className="text-xl font-bold mb-2">Collection Paused</h2>
              <p className="text-muted-foreground mb-4">Your collection is paused. Resume to continue collecting data.</p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => updateSessionStatus("resume")} disabled={sessionLoading} className="gap-2">
                  <Play className="h-4 w-4" /> Resume Collection
                </Button>
                <Button variant="destructive" onClick={() => {
                  if (confirm(`Submit ${sessionResponses} collected responses and close?`)) {
                    updateSessionStatus("submit");
                  }
                }} disabled={sessionLoading} className="gap-2">
                  <StopCircle className="h-4 w-4" /> Submit & Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!isPaused && (
        <div className="max-w-2xl mx-auto px-4 py-8">
          {sessionError && !session && (
            <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm text-yellow-700 dark:text-yellow-300">
              {sessionError}
            </div>
          )}
          {currentIndex === 0 && survey.description && (
            <p className="text-muted-foreground mb-6 text-center">{survey.description}</p>
          )}

          {error && (
            <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">{error}</div>
          )}

          {currentQuestion && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {currentQuestion.text}
                  {currentQuestion.required && <span className="text-destructive ml-1">*</span>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {currentQuestion.type === "TEXT_INPUT" && (
                  <textarea
                    className="w-full min-h-[120px] rounded-lg border border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="Type your answer here..."
                    value={(answers[currentQuestion.id] as string) || ""}
                    onChange={(e) => updateAnswer(currentQuestion.id, e.target.value)}
                  />
                )}

                {currentQuestion.type === "MULTIPLE_CHOICE" && currentQuestion.options && (
                  <div className="space-y-2">
                    {currentQuestion.options.map((opt) => (
                      <label key={opt} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${answers[currentQuestion.id] === opt ? "border-primary bg-primary/5" : "hover:bg-secondary/50"}`}>
                        <input type="radio" name={currentQuestion.id} value={opt} checked={answers[currentQuestion.id] === opt}
                          onChange={() => updateAnswer(currentQuestion.id, opt)} className="h-4 w-4 text-primary" />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                )}

                {currentQuestion.type === "CHECKBOX" && currentQuestion.options && (
                  <div className="space-y-2">
                    {currentQuestion.options.map((opt) => {
                      const selected = ((answers[currentQuestion.id] as string[]) || []).includes(opt);
                      return (
                        <label key={opt} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selected ? "border-primary bg-primary/5" : "hover:bg-secondary/50"}`}>
                          <input type="checkbox" checked={selected} onChange={() => toggleCheckbox(currentQuestion.id, opt)}
                            className="h-4 w-4 rounded text-primary" />
                          <span>{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {currentQuestion.type === "DROPDOWN" && currentQuestion.options && (
                  <select
                    className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={(answers[currentQuestion.id] as string) || ""}
                    onChange={(e) => updateAnswer(currentQuestion.id, e.target.value)}
                  >
                    <option value="">Select an option...</option>
                    {currentQuestion.options.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                )}

                {currentQuestion.type === "RATING_SCALE" && (
                  <div className="flex justify-center gap-3 py-4">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <button key={num} onClick={() => updateAnswer(currentQuestion.id, num)}
                        className={`h-14 w-14 rounded-xl text-lg font-bold transition-all ${answers[currentQuestion.id] === num ? "bg-primary text-primary-foreground scale-110" : "bg-secondary hover:bg-secondary/80"}`}>
                        {num}
                      </button>
                    ))}
                  </div>
                )}

                {currentQuestion.type === "DATE_INPUT" && (
                  <input type="date"
                    className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={(answers[currentQuestion.id] as string) || ""}
                    onChange={(e) => updateAnswer(currentQuestion.id, e.target.value)}
                  />
                )}
              </CardContent>
            </Card>
          )}

          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={() => { setError(null); setCurrentIndex(Math.max(0, currentIndex - 1)); }}
              disabled={currentIndex === 0}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
            {currentIndex < sortedQuestions.length - 1 ? (
              <Button onClick={() => { setError(null); setCurrentIndex(currentIndex + 1); }}>
                Next <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {submitting ? "Submitting..." : isOnline ? "Submit Response" : "Submit Offline"}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
