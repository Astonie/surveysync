"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Trash2, MoveUp, MoveDown, Save, FolderPlus } from "lucide-react";

type QuestionType = "MULTIPLE_CHOICE" | "CHECKBOX" | "TEXT_INPUT" | "RATING_SCALE" | "DROPDOWN" | "DATE_INPUT";

interface QuestionData {
  id?: string;
  type: QuestionType;
  text: string;
  required: boolean;
  options: string[];
  order: number;
}

interface SectionData {
  id?: string;
  title: string;
  description: string;
  order: number;
  questions: QuestionData[];
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

interface RawQuestion {
  id: string;
  type: QuestionType;
  text: string;
  required: boolean;
  options: string[] | null;
  order: number;
}

interface RawSection {
  id?: string;
  title: string | null;
  description: string | null;
  order: number;
  questions: RawQuestion[];
}

export default function EditSurveyPage() {
  const params = useParams();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sections, setSections] = useState<SectionData[]>([]);
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
          const loadedSections = (data.sections && data.sections.length > 0
            ? (data.sections as RawSection[])
            : [{ id: undefined, title: "", description: null, order: 0, questions: (data.questions || []) as RawQuestion[] }]
          )
            .sort((a, b) => a.order - b.order)
            .map((s: RawSection) => ({
              id: s.id,
              title: s.title || "",
              description: s.description || "",
              order: s.order ?? 0,
              questions: (s.questions || [])
                .sort((a, b) => a.order - b.order)
                .map((q: RawQuestion) => ({
                  id: q.id,
                  type: q.type,
                  text: q.text,
                  required: q.required,
                  options: q.options || [],
                  order: q.order,
                })),
            }));
          setSections(loadedSections);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id]);

  function addSection() {
    setSections((prev) => [...prev.map((s) => s), { title: "", description: "", order: prev.length, questions: [] }]);
  }

  function removeSection(index: number) {
    setSections((prev) => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i })));
  }

  function moveSection(index: number, direction: -1 | 1) {
    setSections((prev) => {
      const next = [...prev];
      const swapIndex = index + direction;
      if (swapIndex < 0 || swapIndex >= next.length) return prev;
      [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
      return next.map((s, i) => ({ ...s, order: i }));
    });
  }

  function updateSection(index: number, patch: Partial<SectionData>) {
    setSections((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function addQuestion(sectionIndex: number, type: QuestionType) {
    setSections((prev) =>
      prev.map((s, i) =>
        i === sectionIndex
          ? { ...s, questions: [...s.questions, { type, text: "", required: true, options: type === "RATING_SCALE" ? [] : ["", ""], order: s.questions.length }] }
          : s
      )
    );
  }

  function removeQuestion(sectionIndex: number, questionIndex: number) {
    setSections((prev) =>
      prev.map((s, i) =>
        i === sectionIndex
          ? { ...s, questions: s.questions.filter((_, j) => j !== questionIndex).map((q, j) => ({ ...q, order: j })) }
          : s
      )
    );
  }

  function moveQuestion(sectionIndex: number, questionIndex: number, direction: -1 | 1) {
    setSections((prev) =>
      prev.map((s, i) => {
        if (i !== sectionIndex) return s;
        const qs = [...s.questions];
        const swapIndex = questionIndex + direction;
        if (swapIndex < 0 || swapIndex >= qs.length) return s;
        [qs[questionIndex], qs[swapIndex]] = [qs[swapIndex], qs[questionIndex]];
        return { ...s, questions: qs.map((q, j) => ({ ...q, order: j })) };
      })
    );
  }

  function updateQuestion(sectionIndex: number, questionIndex: number, patch: Partial<QuestionData>) {
    setSections((prev) =>
      prev.map((s, i) =>
        i === sectionIndex
          ? { ...s, questions: s.questions.map((q, j) => (j === questionIndex ? { ...q, ...patch } : q)) }
          : s
      )
    );
  }

  function updateOption(sectionIndex: number, questionIndex: number, optIndex: number, value: string) {
    setSections((prev) =>
      prev.map((s, i) =>
        i === sectionIndex
          ? { ...s, questions: s.questions.map((q, j) => {
              if (j !== questionIndex) return q;
              const options = [...q.options];
              options[optIndex] = value;
              return { ...q, options };
            }) }
          : s
      )
    );
  }

  function removeOption(sectionIndex: number, questionIndex: number, optIndex: number) {
    setSections((prev) =>
      prev.map((s, i) =>
        i === sectionIndex
          ? { ...s, questions: s.questions.map((q, j) => {
              if (j !== questionIndex) return q;
              return { ...q, options: q.options.filter((_, k) => k !== optIndex) };
            }) }
          : s
      )
    );
  }

  function addOption(sectionIndex: number, questionIndex: number) {
    setSections((prev) =>
      prev.map((s, i) =>
        i === sectionIndex
          ? { ...s, questions: s.questions.map((q, j) => {
              if (j !== questionIndex) return q;
              return { ...q, options: [...q.options, ""] };
            }) }
          : s
      )
    );
  }

  function moveQuestionToSection(sourceSection: number, questionIndex: number, targetSection: number) {
    if (sourceSection === targetSection) return;
    setSections((prev) => {
      const question = prev[sourceSection].questions[questionIndex];
      if (!question) return prev;
      const next = prev.map((s, i) => {
        if (i === sourceSection) {
          return { ...s, questions: s.questions.filter((_, j) => j !== questionIndex).map((q, j) => ({ ...q, order: j })) };
        }
        if (i === targetSection) {
          return { ...s, questions: [...s.questions, { ...question, order: s.questions.length }] };
        }
        return s;
      });
      return next;
    });
  }

  async function save() {
    if (!title.trim()) return alert("Enter a title");
    const allQuestions = sections.flatMap((s) => s.questions);
    if (allQuestions.length === 0) return alert("Add at least one question");

    for (const q of allQuestions) {
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
          sections: sections.map((s, si) => ({
            id: s.id,
            title: s.title.trim(),
            description: s.description.trim() || null,
            order: si,
            questions: s.questions.map((q, qi) => ({
              id: q.id,
              type: q.type,
              text: q.text.trim(),
              required: q.required,
              options: needsOptions.includes(q.type)
                ? q.options.filter((o) => o.trim())
                : null,
              order: qi,
            })),
          })),
        }),
      });

      if (!res.ok) throw new Error("Failed to save");
      router.push(`/surveys/${params.id}`);
    } catch {
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

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Sections ({sections.length}) <span className="text-muted-foreground text-sm font-normal">· {sections.reduce((n, s) => n + s.questions.length, 0)} questions</span>
          </h2>
          <Button variant="outline" size="sm" onClick={addSection} className="gap-1">
            <FolderPlus className="h-4 w-4" /> Add Section
          </Button>
        </div>

        {sections.map((section, si) => (
          <div key={si} className="border-2 border-dashed rounded-2xl p-4 space-y-3 bg-background">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Section {si + 1}</Badge>
              <Input
                placeholder="Section title"
                value={section.title}
                onChange={(e) => updateSection(si, { title: e.target.value })}
                className="flex-1"
              />
              <Button variant="ghost" size="icon" onClick={() => moveSection(si, -1)} disabled={si === 0}>
                <MoveUp className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => moveSection(si, 1)} disabled={si === sections.length - 1}>
                <MoveDown className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => removeSection(si)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <Textarea
              placeholder="Section description (optional)"
              value={section.description}
              onChange={(e) => updateSection(si, { description: e.target.value })}
              rows={2}
            />

            {section.questions.length === 0 && (
              <div className="text-center py-4 border border-dashed rounded-xl">
                <p className="text-muted-foreground text-sm">No questions in this section yet.</p>
              </div>
            )}

            {section.questions.map((q, qi) => (
              <div key={qi} className="border rounded-xl p-4 space-y-3 bg-card">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Q{qi + 1}</Badge>
                  <Badge variant="outline">{questionTypeLabels[q.type]}</Badge>
                  <div className="flex-1" />
                  <select
                    value={si}
                    onChange={(e) => moveQuestionToSection(si, qi, Number(e.target.value))}
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    title="Move to section"
                  >
                    {sections.map((target, ti) => (
                      <option key={ti} value={ti}>
                        {ti === si ? `In section ${ti + 1}` : `Move to section ${ti + 1}`}
                      </option>
                    ))}
                  </select>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveQuestion(si, qi, -1)} disabled={qi === 0}>
                    <MoveUp className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveQuestion(si, qi, 1)} disabled={qi === section.questions.length - 1}>
                    <MoveDown className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeQuestion(si, qi)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>

                <Input
                  placeholder="Enter your question..."
                  value={q.text}
                  onChange={(e) => updateQuestion(si, qi, { text: e.target.value })}
                />

                {needsOptions.includes(q.type) && (
                  <div className="space-y-2">
                    {q.options.map((opt, j) => (
                      <div key={j} className="flex items-center gap-2">
                        <Input
                          placeholder={`Option ${j + 1}`}
                          value={opt}
                          onChange={(e) => updateOption(si, qi, j, e.target.value)}
                          className="flex-1"
                        />
                        <Button variant="ghost" size="icon" className="shrink-0 text-destructive" onClick={() => removeOption(si, qi, j)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="ghost" size="sm" onClick={() => addOption(si, qi)} className="gap-1">
                      <Plus className="h-3 w-3" /> Add Option
                    </Button>
                  </div>
                )}

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={q.required}
                    onChange={(e) => updateQuestion(si, qi, { required: e.target.checked })}
                  />
                  Required
                </label>
              </div>
            ))}

            <div className="flex flex-wrap gap-2 pt-2 border-t">
              {(Object.entries(questionTypeLabels) as [QuestionType, string][]).map(([type, label]) => (
                <Button key={type} variant="outline" size="sm" onClick={() => addQuestion(si, type)} className="gap-1">
                  <Plus className="h-3 w-3" /> {label}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>

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