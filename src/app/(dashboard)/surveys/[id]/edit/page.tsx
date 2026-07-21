"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Trash2, GripVertical, Save } from "lucide-react";

type QuestionType = "MULTIPLE_CHOICE" | "CHECKBOX" | "TEXT_INPUT" | "RATING_SCALE" | "DROPDOWN" | "DATE_INPUT";

interface QuestionData {
  id?: string;
  type: QuestionType;
  text: string;
  required: boolean;
  options: string[];
  order: number;
}

const questionTypeLabels: Record<QuestionType, string> = {
  MULTIPLE_CHOICE: "Multiple Choice",
  CHECKBOX: "Checkbox",
  TEXT_INPUT: "Text Input",
  RATING_SCALE: "Rating Scale",
  DROPDOWN: "Dropdown",
  DATE_INPUT: "Date",
};

const needsOptions: QuestionType[] = ["MULTIPLE_CHOICE", "CHECKBOX", "DROPDOWN"];

export default function EditSurveyPage() {
  const params = useParams();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/surveys/${params.id}`);
        if (res.ok) {
          const data = await res.json();
          setTitle(data.title);
          setDescription(data.description || "");
          setQuestions(
            data.questions
              .sort((a: any, b: any) => a.order - b.order)
              .map((q: any) => ({
                id: q.id,
                type: q.type,
                text: q.text,
                required: q.required,
                options: q.options || [],
                order: q.order,
              }))
          );
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id]);

  function addQuestion(type: QuestionType) {
    setQuestions([
      ...questions,
      {
        type,
        text: "",
        required: true,
        options: type === "RATING_SCALE" ? [] : ["", ""],
        order: questions.length,
      },
    ]);
  }

  function removeQuestion(index: number) {
    setQuestions(questions.filter((_, i) => i !== index));
  }

  function moveQuestion(index: number, direction: -1 | 1) {
    const newQ = [...questions];
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= newQ.length) return;
    [newQ[index], newQ[swapIndex]] = [newQ[swapIndex], newQ[index]];
    setQuestions(newQ.map((q, i) => ({ ...q, order: i })));
  }

  async function save() {
    if (!title.trim()) return alert("Enter a title");
    if (questions.length === 0) return alert("Add at least one question");

    for (const q of questions) {
      if (!q.text.trim()) return alert("All questions need text");
      if (needsOptions.includes(q.type)) {
        const valid = q.options.filter((o) => o.trim());
        if (valid.length < 2) return alert(`"${q.text}" needs at least 2 options`);
      }
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/surveys/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          questions: questions.map((q, i) => ({
            id: q.id,
            type: q.type,
            text: q.text.trim(),
            required: q.required,
            options: needsOptions.includes(q.type)
              ? q.options.filter((o) => o.trim())
              : null,
            order: i,
          })),
        }),
      });

      if (!res.ok) throw new Error("Failed to save");
      router.push(`/surveys/${params.id}`);
    } catch (err) {
      alert("Failed to save survey");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Edit Survey</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Survey Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Questions ({questions.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {questions.map((q, i) => (
            <div key={i} className="border rounded-xl p-4 space-y-3 bg-card">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Q{i + 1}</Badge>
                <Badge variant="outline">{questionTypeLabels[q.type]}</Badge>
                <div className="flex-1" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => moveQuestion(i, -1)}
                  disabled={i === 0}
                >
                  <GripVertical className="h-3 w-3 rotate-180" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => moveQuestion(i, 1)}
                  disabled={i === questions.length - 1}
                >
                  <GripVertical className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => removeQuestion(i)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>

              <Input
                placeholder="Enter your question..."
                value={q.text}
                onChange={(e) => {
                  const newQ = [...questions];
                  newQ[i] = { ...newQ[i], text: e.target.value };
                  setQuestions(newQ);
                }}
              />

              {needsOptions.includes(q.type) && (
                <div className="space-y-2">
                  {q.options.map((opt, j) => (
                    <div key={j} className="flex items-center gap-2">
                      <Input
                        placeholder={`Option ${j + 1}`}
                        value={opt}
                        onChange={(e) => {
                          const newQ = [...questions];
                          const opts = [...newQ[i].options];
                          opts[j] = e.target.value;
                          newQ[i] = { ...newQ[i], options: opts };
                          setQuestions(newQ);
                        }}
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-destructive"
                        onClick={() => {
                          const newQ = [...questions];
                          newQ[i] = {
                            ...newQ[i],
                            options: newQ[i].options.filter((_, k) => k !== j),
                          };
                          setQuestions(newQ);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const newQ = [...questions];
                      newQ[i] = {
                        ...newQ[i],
                        options: [...newQ[i].options, ""],
                      };
                      setQuestions(newQ);
                    }}
                    className="gap-1"
                  >
                    <Plus className="h-3 w-3" /> Add Option
                  </Button>
                </div>
              )}

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={q.required}
                  onChange={(e) => {
                    const newQ = [...questions];
                    newQ[i] = { ...newQ[i], required: e.target.checked };
                    setQuestions(newQ);
                  }}
                />
                Required
              </label>
            </div>
          ))}

          <div className="flex flex-wrap gap-2 pt-4 border-t">
            {(Object.entries(questionTypeLabels) as [QuestionType, string][]).map(
              ([type, label]) => (
                <Button
                  key={type}
                  variant="outline"
                  size="sm"
                  onClick={() => addQuestion(type)}
                  className="gap-1"
                >
                  <Plus className="h-3 w-3" /> {label}
                </Button>
              )
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 pb-8">
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button onClick={save} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
