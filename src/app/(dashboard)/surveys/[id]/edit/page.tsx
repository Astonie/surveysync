"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Plus, Trash2, MoveUp, MoveDown, Save, FolderPlus } from "lucide-react";
import { toast } from "sonner";

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
const QUESTIONS_PER_PAGE = 10;

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

type BuilderPage =
  | { kind: "details" }
  | { kind: "section"; sectionIndex: number; pageNumber: number; questionStart: number; questions: QuestionData[] };

function StepPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${active ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-secondary/50"}`}>
      {label}
    </button>
  );
}

export default function EditSurveyPage() {
  const params = useParams();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sections, setSections] = useState<SectionData[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const sectionsRef = useRef(sections);

  useEffect(() => {
    sectionsRef.current = sections;
  });

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

  function buildPages(secs: SectionData[]): BuilderPage[] {
    const result: BuilderPage[] = [{ kind: "details" }];
    secs.forEach((s, sectionIndex) => {
      const chunks: QuestionData[][] = s.questions.length === 0
        ? [[]]
        : Array.from({ length: Math.ceil(s.questions.length / QUESTIONS_PER_PAGE) }, (_, i) =>
            s.questions.slice(i * QUESTIONS_PER_PAGE, (i + 1) * QUESTIONS_PER_PAGE));
      let qn = 1;
      chunks.forEach((chunk, ci) => {
        result.push({ kind: "section", sectionIndex, pageNumber: ci + 1, questionStart: qn, questions: chunk });
        qn += chunk.length;
      });
    });
    return result;
  }

  const pages = buildPages(sections);
  const boundedIndex = Math.min(pageIndex, pages.length - 1);
  const currentPage = pages[boundedIndex];
  const progress = pages.length > 0 ? ((boundedIndex + 1) / pages.length) * 100 : 0;

  const pageSelectedKeys = currentPage.kind === "section"
    ? currentPage.questions.map((q) => {
        const qi = sections[currentPage.sectionIndex].questions.indexOf(q);
        return `${currentPage.sectionIndex}:${qi}`;
      })
    : [];
  const allPageSelected = pageSelectedKeys.length > 0 && pageSelectedKeys.every((k) => selected.has(k));

  function goToPage(index: number) {
    setSelected(new Set());
    setPageIndex(Math.max(0, Math.min(pages.length - 1, index)));
  }

  function toggleSelect(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) pageSelectedKeys.forEach((k) => next.delete(k));
      else pageSelectedKeys.forEach((k) => next.add(k));
      return next;
    });
  }

  function bulkAction(kind: "delete" | "toggleRequired" | "move", targetSection?: number) {
    if (currentPage.kind !== "section") return;
    const si = currentPage.sectionIndex;
    if (!sections[si]) return;
    const keys = new Set(pageSelectedKeys.filter((k) => selected.has(k)));

    if (kind === "delete") {
      setSections((prev) => prev.map((s, i) => i === si
        ? { ...s, questions: s.questions.filter((_, qi) => !keys.has(`${si}:${qi}`)).map((q, j) => ({ ...q, order: j })) }
        : s));
    } else if (kind === "toggleRequired") {
      setSections((prev) => prev.map((s, i) => i === si
        ? { ...s, questions: s.questions.map((q, qi) => keys.has(`${si}:${qi}`) ? { ...q, required: !q.required } : q) }
        : s));
    } else if (kind === "move" && targetSection !== undefined && targetSection !== si) {
      const moving = sections[si].questions.filter((q, qi) => keys.has(`${si}:${qi}`));
      if (moving.length === 0) return;
      const next = sections.map((s, i) => {
        if (i === si) return { ...s, questions: s.questions.filter((_, qi) => !keys.has(`${si}:${qi}`)).map((q, j) => ({ ...q, order: j })) };
        if (i === targetSection) return { ...s, questions: s.questions.concat(moving.map((q, j) => ({ ...q, order: s.questions.length + j }))) };
        return s;
      });
      setSections(next);
      setPageIndex(lastPageIndexForSection(next, targetSection));
    }
    setSelected(new Set());
  }

  function pageIndexForSection(sectionIndex: number): number {
    const idx = pages.findIndex((p) => p.kind === "section" && p.sectionIndex === sectionIndex);
    return idx === -1 ? boundedIndex : idx;
  }

  function sectionPageCount(sectionIndex: number): number {
    const len = sections[sectionIndex]?.questions.length ?? 0;
    return len === 0 ? 1 : Math.ceil(len / QUESTIONS_PER_PAGE);
  }

  function lastPageIndexForSection(secs: SectionData[], sectionIndex: number): number {
    const targetPages = buildPages(secs);
    const matches = targetPages.filter((p) => p.kind === "section" && p.sectionIndex === sectionIndex);
    return matches.length > 0 ? targetPages.indexOf(matches[matches.length - 1]) : Math.max(0, targetPages.length - 1);
  }

  function addSection() {
    const newSection: SectionData = { title: "", description: "", order: sectionsRef.current.length, questions: [] };
    const next = [...sectionsRef.current, newSection];
    setSections(next);
    setSelected(new Set());
    setPageIndex(lastPageIndexForSection(next, next.length - 1));
  }

  function removeSection(index: number) {
    const next = sectionsRef.current.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i }));
    setSections(next);
    setSelected(new Set());
    setPageIndex((p) => Math.min(p, buildPages(next).length - 1));
  }

  function moveSection(index: number, direction: -1 | 1) {
    const next = [...sectionsRef.current];
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= next.length) return;
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
    setSections(next.map((s, i) => ({ ...s, order: i })));
    setSelected(new Set());
    setPageIndex((p) => Math.min(p, buildPages(next).length - 1));
  }

  function updateSection(index: number, patch: Partial<SectionData>) {
    setSections((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function addQuestion(sectionIndex: number, type: QuestionType) {
    const q: QuestionData = {
      type, text: "", required: true,
      options: type === "RATING_SCALE" ? [] : ["", ""],
      order: sectionsRef.current[sectionIndex].questions.length,
    };
    const next = sectionsRef.current.map((s, i) =>
      i === sectionIndex ? { ...s, questions: [...s.questions, q] } : s);
    setSections(next);
    setSelected(new Set());
    setPageIndex(lastPageIndexForSection(next, sectionIndex));
  }

  function removeQuestion(sectionIndex: number, questionIndex: number) {
    setSelected(new Set());
    setSections((prev) =>
      prev.map((s, i) =>
        i === sectionIndex
          ? { ...s, questions: s.questions.filter((_, j) => j !== questionIndex).map((q, j) => ({ ...q, order: j })) }
          : s
      )
    );
  }

  function moveQuestion(sectionIndex: number, questionIndex: number, direction: -1 | 1) {
    setSelected(new Set());
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
    const current = sectionsRef.current;
    const question = current[sourceSection]?.questions[questionIndex];
    if (!question) return;
    setSelected(new Set());
    const next = current.map((s, i) => {
      if (i === sourceSection) {
        return { ...s, questions: s.questions.filter((_, j) => j !== questionIndex).map((q, j) => ({ ...q, order: j })) };
      }
      if (i === targetSection) {
        return { ...s, questions: [...s.questions, { ...question, order: s.questions.length }] };
      }
      return s;
    });
    setSections(next);
    setPageIndex(lastPageIndexForSection(next, targetSection));
  }

  async function save() {
    if (!title.trim()) return toast.error("Enter a title");
    const allQuestions = sections.flatMap((s) => s.questions);
    if (allQuestions.length === 0) return toast.error("Add at least one question");

    for (const q of allQuestions) {
      if (!q.text.trim()) return toast.error("All questions need text");
      if (needsOptions.includes(q.type)) {
        const valid = q.options.filter((o) => o.trim());
        if (valid.length < 2) return toast.error(`"${q.text}" needs at least 2 options`);
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
      toast.success("Survey updated");
      router.push(`/surveys/${params.id}`);
    } catch {
      toast.error("Failed to save survey");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-7 w-1/3 bg-muted animate-pulse rounded" />
            <div className="h-4 w-1/2 bg-muted animate-pulse rounded" />
          </div>
          <div className="h-9 w-32 bg-muted animate-pulse rounded-lg" />
        </div>
        <div className="h-2 bg-secondary rounded-full" />
        <div className="h-32 bg-muted animate-pulse rounded-xl" />
        <div className="h-64 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Edit Survey</h1>
          <p className="text-sm text-muted-foreground">Edit your survey page by page</p>
        </div>
        <Button size="sm" onClick={save} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-primary transition-all duration-300 rounded-full" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-xs text-muted-foreground shrink-0">Page {boundedIndex + 1} / {pages.length}</span>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <StepPill label="Survey" active={currentPage.kind === "details"} onClick={() => goToPage(0)} />
        {sections.map((s, si) => (
          <StepPill key={s.id ?? si} label={s.title.trim() || `Section ${si + 1}`}
            active={currentPage.kind === "section" && currentPage.sectionIndex === si}
            onClick={() => goToPage(pageIndexForSection(si))} />
        ))}
      </div>

      {currentPage.kind === "details" ? (
        <>
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
              <div className="flex items-center justify-between">
                <CardTitle>Sections ({sections.length}) <span className="text-sm font-normal text-muted-foreground">· {sections.reduce((n, s) => n + s.questions.length, 0)} questions</span></CardTitle>
                <Button variant="outline" size="sm" onClick={addSection} className="gap-1">
                  <FolderPlus className="h-4 w-4" /> Add Section
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {sections.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed rounded-xl">
                  <p className="text-muted-foreground mb-4">No sections yet. Add a section to organize your questions.</p>
                  <Button onClick={addSection} className="gap-1"><FolderPlus className="h-4 w-4" /> Add Section</Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {sections.map((s, si) => (
                    <button key={s.id ?? si} onClick={() => goToPage(pageIndexForSection(si))}
                      className="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-secondary/50 text-left">
                      <div>
                        <p className="text-sm font-medium">{s.title.trim() || `Section ${si + 1}`}</p>
                        <p className="text-xs text-muted-foreground">{s.questions.length} question{s.questions.length !== 1 ? "s" : ""}{sectionPageCount(si) > 1 ? ` · ${sectionPageCount(si)} pages` : ""}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : currentPage.kind === "section" && sections[currentPage.sectionIndex] ? (
        <div className="border-2 border-dashed rounded-2xl p-4 space-y-3 bg-background">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Section {currentPage.sectionIndex + 1}</Badge>
            <Input
              placeholder="Section title"
              value={sections[currentPage.sectionIndex].title}
              onChange={(e) => updateSection(currentPage.sectionIndex, { title: e.target.value })}
              className="flex-1"
            />
            <Button variant="ghost" size="icon" onClick={() => moveSection(currentPage.sectionIndex, -1)} disabled={currentPage.sectionIndex === 0}>
              <MoveUp className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => moveSection(currentPage.sectionIndex, 1)} disabled={currentPage.sectionIndex === sections.length - 1}>
              <MoveDown className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => removeSection(currentPage.sectionIndex)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <Textarea
            placeholder="Section description (optional)"
            value={sections[currentPage.sectionIndex].description}
            onChange={(e) => updateSection(currentPage.sectionIndex, { description: e.target.value })}
            rows={2}
          />

          {sectionPageCount(currentPage.sectionIndex) > 1 && (
            <p className="text-xs text-muted-foreground">
              {sections[currentPage.sectionIndex].title.trim() || `Section ${currentPage.sectionIndex + 1}`} — page {currentPage.pageNumber} of {sectionPageCount(currentPage.sectionIndex)}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" className="rounded" checked={allPageSelected} onChange={toggleSelectAll} />
              Select all on page
            </label>
            <div className="flex-1" />
            {selected.size > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{selected.size} selected</Badge>
                <Button variant="destructive" size="sm" onClick={() => bulkAction("delete")} className="gap-1">
                  <Trash2 className="h-3 w-3" /> Delete
                </Button>
                <select
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value !== "") {
                      bulkAction("move", Number(e.target.value));
                      e.target.value = "";
                    }
                  }}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  title="Move selected to section"
                >
                  <option value="">Move to section...</option>
                  {sections.map((s, ti) => (
                    ti !== currentPage.sectionIndex ? (
                      <option key={ti} value={ti}>{s.title.trim() || `Section ${ti + 1}`}</option>
                    ) : null
                  ))}
                </select>
                <Button variant="outline" size="sm" onClick={() => bulkAction("toggleRequired")}>
                  Toggle Required
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>Clear</Button>
              </div>
            )}
          </div>

          {currentPage.questions.length === 0 && (
            <div className="text-center py-4 border border-dashed rounded-xl">
              <p className="text-muted-foreground text-sm">No questions on this page yet.</p>
            </div>
          )}

          {currentPage.questions.map((q, i) => {
            const si = currentPage.sectionIndex;
            const qi = sections[si].questions.indexOf(q);
            return (
              <div key={q.id ?? qi} className="border rounded-xl p-4 space-y-3 bg-card">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={selected.has(`${si}:${qi}`)}
                    onChange={() => toggleSelect(`${si}:${qi}`)}
                    title="Select question"
                  />
                  <Badge variant="secondary">Q{currentPage.questionStart + i}</Badge>
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
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveQuestion(si, qi, -1)} disabled={i === 0}>
                    <MoveUp className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveQuestion(si, qi, 1)} disabled={i === currentPage.questions.length - 1}>
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
            );
          })}

          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {(Object.entries(questionTypeLabels) as [QuestionType, string][]).map(([type, label]) => (
              <Button key={type} variant="outline" size="sm" onClick={() => addQuestion(currentPage.sectionIndex, type)} className="gap-1">
                <Plus className="h-3 w-3" /> {label}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between pt-2 pb-8">
        <Button variant="outline" onClick={() => goToPage(boundedIndex - 1)} disabled={boundedIndex === 0}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <div className="text-xs text-muted-foreground text-center">
          Page {boundedIndex + 1} of {pages.length}
          {currentPage.kind === "section" && ` · Section ${currentPage.sectionIndex + 1} of ${sections.length}`}
        </div>
        {boundedIndex < pages.length - 1 ? (
          <Button onClick={() => goToPage(boundedIndex + 1)}>
            Next <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={save} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Changes"}
          </Button>
        )}
      </div>
    </div>
  );
}
