"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Trash2, GripVertical, ArrowLeft, ArrowRight, Save, Eye, Cloud, CloudOff, FolderPlus,
} from "lucide-react";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";

type QuestionType = "MULTIPLE_CHOICE" | "CHECKBOX" | "TEXT_INPUT" | "RATING_SCALE" | "DROPDOWN" | "DATE_INPUT";

interface QuestionData {
  tempId: string;
  type: QuestionType;
  text: string;
  required: boolean;
  options: string[];
}

interface SectionData {
  tempId: string;
  title: string;
  description: string;
  questions: QuestionData[];
}

interface RawQuestion {
  type: QuestionType;
  text: string;
  required: boolean;
  options: string[] | null;
  order: number;
}

interface RawSection {
  title: string | null;
  description: string | null;
  order: number;
  questions?: RawQuestion[];
}

const QUESTIONS_PER_PAGE = 10;

const questionTypeLabels: Record<QuestionType, string> = {
  MULTIPLE_CHOICE: "Multiple Choice",
  CHECKBOX: "Checkbox",
  TEXT_INPUT: "Text Input",
  RATING_SCALE: "Rating Scale (1-5)",
  DROPDOWN: "Dropdown",
  DATE_INPUT: "Date",
};

const questionTypeNeedsOptions: QuestionType[] = ["MULTIPLE_CHOICE", "CHECKBOX", "DROPDOWN"];

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

function SortableQuestion({ question, index, selected, onToggleSelect, onUpdate, onRemove }: {
  question: QuestionData; index: number;
  selected: boolean; onToggleSelect: () => void;
  onUpdate: (q: QuestionData) => void; onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: question.tempId });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const needsOptions = questionTypeNeedsOptions.includes(question.type);

  return (
    <div ref={setNodeRef} style={style} className="border rounded-xl p-4 bg-card space-y-3">
      <div className="flex items-center gap-2">
        <input type="checkbox" className="rounded" checked={selected} onChange={onToggleSelect} title="Select question" />
        <button className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground" {...attributes} {...listeners}>
          <GripVertical className="h-5 w-5" />
        </button>
        <Badge variant="secondary" className="shrink-0">Q{index + 1}</Badge>
        <Badge variant="outline" className="shrink-0">{questionTypeLabels[question.type]}</Badge>
        <div className="flex-1" />
        <Button variant="ghost" size="icon" onClick={onRemove} className="text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-2">
        <Input placeholder="Enter your question..." value={question.text}
          onChange={(e) => onUpdate({ ...question, text: e.target.value })} />
      </div>
      {needsOptions && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Options</Label>
          {question.options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input placeholder={`Option ${i + 1}`} value={opt}
                onChange={(e) => { const newOptions = [...question.options]; newOptions[i] = e.target.value; onUpdate({ ...question, options: newOptions }); }}
                className="flex-1" />
              <Button variant="ghost" size="icon" onClick={() => onUpdate({ ...question, options: question.options.filter((_, j) => j !== i) })}
                className="shrink-0 text-destructive"><Trash2 className="h-3 w-3" /></Button>
            </div>
          ))}
          <Button variant="ghost" size="sm" onClick={() => onUpdate({ ...question, options: [...question.options, ""] })} className="gap-1">
            <Plus className="h-3 w-3" /> Add Option
          </Button>
        </div>
      )}
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={question.required}
            onChange={(e) => onUpdate({ ...question, required: e.target.checked })} className="rounded" />
          Required
        </label>
      </div>
    </div>
  );
}

function SectionCard({ section, index, questionStart, questions, selected, onToggleSelect, onUpdate, onRemove, onAddQuestion, onMoveQuestion }: {
  section: SectionData; index: number;
  questionStart: number;
  questions: QuestionData[];
  selected: Set<string>;
  onToggleSelect: (tempId: string) => void;
  onUpdate: (s: SectionData) => void;
  onRemove: () => void;
  onAddQuestion: (type: QuestionType) => string;
  onMoveQuestion: (qTempId: string, sectionTempId: string, direction: -1 | 1) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const updateQuestion = (q: QuestionData) => {
    onUpdate({ ...section, questions: section.questions.map((item) => (item.tempId === q.tempId ? q : item)) });
  };
  const removeQuestion = (qTempId: string) => {
    onUpdate({ ...section, questions: section.questions.filter((item) => item.tempId !== qTempId) });
  };
  const handleQuestionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = section.questions.findIndex((q) => q.tempId === active.id);
    const newIndex = section.questions.findIndex((q) => q.tempId === over.id);
    onUpdate({ ...section, questions: arrayMove(section.questions, oldIndex, newIndex) });
  };

  return (
    <div className="border-2 border-dashed rounded-2xl p-4 space-y-3 bg-background">
      <div className="flex items-center gap-2">
        <Badge variant="secondary">Section {index + 1}</Badge>
        <Input
          placeholder="Section title (e.g., Personal Information)"
          value={section.title}
          onChange={(e) => onUpdate({ ...section, title: e.target.value })}
          className="flex-1"
        />
        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={onRemove}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <Textarea
        placeholder="Section description (optional)"
        value={section.description}
        onChange={(e) => onUpdate({ ...section, description: e.target.value })}
        rows={2}
      />

      {questions.length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleQuestionDragEnd}>
          <SortableContext items={questions.map((q) => q.tempId)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {questions.map((q, i) => (
                <div key={q.tempId}>
                  <SortableQuestion question={q} index={questionStart + i}
                    selected={selected.has(q.tempId)}
                    onToggleSelect={() => onToggleSelect(q.tempId)}
                    onUpdate={updateQuestion} onRemove={() => removeQuestion(q.tempId)} />
                  <div className="flex justify-end gap-1 pr-1 -mt-2">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onMoveQuestion(q.tempId, section.tempId, -1)} disabled={i === 0}>
                      <GripVertical className="h-3 w-3 rotate-180" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onMoveQuestion(q.tempId, section.tempId, 1)} disabled={i === questions.length - 1}>
                      <GripVertical className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="text-center py-6 border rounded-xl border-dashed">
          <p className="text-muted-foreground text-sm">No questions on this page yet.</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-2 border-t">
        {(Object.entries(questionTypeLabels) as [QuestionType, string][]).map(([type, label]) => (
          <Button key={type} variant="outline" size="sm" onClick={() => onAddQuestion(type)} className="gap-1">
            <Plus className="h-3 w-3" /> {label}
          </Button>
        ))}
      </div>
    </div>
  );
}

export default function NewSurveyPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sections, setSections] = useState<SectionData[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialLoad = useRef(true);
  const sectionsRef = useRef(sections);

  useEffect(() => {
    sectionsRef.current = sections;
  });

  const questionCount = sections.reduce((n, s) => n + s.questions.length, 0);

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

  const pageQuestionKeys = currentPage.kind === "section" ? currentPage.questions.map((q) => q.tempId) : [];
  const allPageSelected = pageQuestionKeys.length > 0 && pageQuestionKeys.every((k) => selected.has(k));
  const selectedCount = [...selected].filter((k) => sections.some((s) => s.questions.some((q) => q.tempId === k))).length;

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
      if (allPageSelected) pageQuestionKeys.forEach((k) => next.delete(k));
      else pageQuestionKeys.forEach((k) => next.add(k));
      return next;
    });
  }

  function lastPageIndexForSection(secs: SectionData[], sectionIndex: number): number {
    const targetPages = buildPages(secs);
    const matches = targetPages.filter((p) => p.kind === "section" && p.sectionIndex === sectionIndex);
    return matches.length > 0 ? targetPages.indexOf(matches[matches.length - 1]) : Math.max(0, targetPages.length - 1);
  }

  function bulkAction(kind: "delete" | "toggleRequired" | "move", targetSectionTempId?: string) {
    if (currentPage.kind !== "section") return;
    const current = sectionsRef.current;
    const si = currentPage.sectionIndex;
    const sec = current[si];
    if (!sec) return;
    const keys = new Set(pageQuestionKeys.filter((k) => selected.has(k)));

    if (kind === "delete") {
      setSections(current.map((s, i) => i === si ? { ...s, questions: s.questions.filter((q) => !keys.has(q.tempId)) } : s));
    } else if (kind === "toggleRequired") {
      setSections(current.map((s, i) => i === si ? { ...s, questions: s.questions.map((q) => keys.has(q.tempId) ? { ...q, required: !q.required } : q) } : s));
    } else if (kind === "move" && targetSectionTempId && targetSectionTempId !== sec.tempId) {
      const moving = sec.questions.filter((q) => keys.has(q.tempId));
      if (moving.length === 0) return;
      const next = current.map((s) => {
        if (s.tempId === sec.tempId) return { ...s, questions: s.questions.filter((q) => !keys.has(q.tempId)) };
        if (s.tempId === targetSectionTempId) return { ...s, questions: [...s.questions, ...moving] };
        return s;
      });
      setSections(next);
      const targetIndex = next.findIndex((s) => s.tempId === targetSectionTempId);
      setPageIndex(lastPageIndexForSection(next, targetIndex));
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

  function addSection() {
    const newSection: SectionData = { tempId: crypto.randomUUID(), title: "", description: "", questions: [] };
    const next = [...sectionsRef.current, newSection];
    setSections(next);
    setSelected(new Set());
    setPageIndex(buildPages(next).length - 1);
  }

  function updateSection(updated: SectionData) {
    setSections((prev) => prev.map((s) => (s.tempId === updated.tempId ? updated : s)));
  }

  function removeSection(sectionTempId: string) {
    const next = sectionsRef.current.filter((s) => s.tempId !== sectionTempId);
    setSections(next);
    setSelected(new Set());
    setPageIndex((p) => Math.min(p, buildPages(next).length - 1));
  }

  function addQuestionToSection(sectionTempId: string, type: QuestionType): string {
    const newQuestion: QuestionData = {
      tempId: crypto.randomUUID(), type, text: "", required: true,
      options: type === "RATING_SCALE" ? [] : ["", ""],
    };
    const next = sectionsRef.current.map((s) =>
      s.tempId === sectionTempId ? { ...s, questions: [...s.questions, newQuestion] } : s);
    setSections(next);
    setSelected(new Set());
    setPageIndex(buildPages(next).findIndex((p) => p.kind === "section" && p.questions.some((q) => q.tempId === newQuestion.tempId)));
    return newQuestion.tempId;
  }

  function moveQuestion(qTempId: string, sectionTempId: string, direction: -1 | 1) {
    setSections((prev) => prev.map((s) => {
      if (s.tempId !== sectionTempId) return s;
      const qIndex = s.questions.findIndex((q) => q.tempId === qTempId);
      const newIndex = qIndex + direction;
      if (qIndex === -1 || newIndex < 0 || newIndex >= s.questions.length) return s;
      const newQs = [...s.questions];
      [newQs[qIndex], newQs[newIndex]] = [newQs[newIndex], newQs[qIndex]];
      return { ...s, questions: newQs };
    }));
  }

  const autoSave = useCallback(async (t: string, d: string, secs: SectionData[]) => {
    if (!t.trim() && secs.every((s) => s.questions.length === 0)) return;
    setAutoSaveStatus("saving");
    try {
      const res = await fetch("/api/surveys/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftId,
          title: t, description: d,
          sections: secs.map((s, si) => ({
            title: s.title, description: s.description,
            order: si,
            questions: s.questions.map((q, qi) => ({
              type: q.type, text: q.text, required: q.required,
              options: questionTypeNeedsOptions.includes(q.type) ? q.options.filter((o) => o.trim()) : null,
              order: qi,
            })),
          })),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.draftId && !draftId) setDraftId(data.draftId);
        setAutoSaveStatus("saved");
        setLastSaved(new Date());
      } else {
        setAutoSaveStatus("error");
      }
    } catch {
      setAutoSaveStatus("error");
    }
  }, [draftId]);

  useEffect(() => {
    if (isInitialLoad.current) { isInitialLoad.current = false; return; }
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => autoSave(title, description, sections), 3000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [title, description, sections, autoSave]);

  useEffect(() => {
    async function loadDraft() {
      try {
        const res = await fetch("/api/surveys/draft");
        if (res.ok) {
          const data = await res.json();
          if (data.drafts && data.drafts.length > 0) {
            const latest = data.drafts[0];
            const draft = latest.data;
            if (draft.title) setTitle(draft.title);
            if (draft.description) setDescription(draft.description);

            const draftSections = draft.sections && draft.sections.length > 0
              ? (draft.sections as RawSection[])
              : (draft.questions ? [{ tempId: crypto.randomUUID(), title: "", description: "", questions: draft.questions }] : []);

            setSections((draftSections as RawSection[]).map((s: RawSection) => ({
              tempId: crypto.randomUUID(),
              title: s.title || "",
              description: s.description || "",
              questions: (s.questions || []).map((q: RawQuestion) => ({
                tempId: crypto.randomUUID(), type: q.type, text: q.text || "",
                required: q.required !== false, options: q.options || [],
              })),
            })));
            setDraftId(latest.id);
            setLastSaved(new Date(latest.savedAt));
          }
        }
      } catch {}
    }
    loadDraft();
  }, []);

  async function saveSurvey(publish: boolean) {
    if (!title.trim()) return toast.error("Please enter a survey title");
    const allQuestions = sections.flatMap((s) => s.questions);
    if (allQuestions.length === 0) return toast.error("Add at least one question");
    for (const q of allQuestions) {
      if (!q.text.trim()) return toast.error("All questions need text");
      if (questionTypeNeedsOptions.includes(q.type)) {
        const validOptions = q.options.filter((o) => o.trim());
        if (validOptions.length < 2) return toast.error(`"${q.text}" needs at least 2 options`);
      }
    }

    try {
      setSaving(true);
      if (publish) setPublishing(true);

      if (draftId) {
        await fetch(`/api/surveys/draft?draftId=${draftId}`, { method: "DELETE" });
      }

      const res = await fetch("/api/surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(), description: description.trim() || null,
          status: publish ? "active" : "draft",
          sections: sections.map((s, si) => ({
            title: s.title.trim(), description: s.description.trim() || null,
            order: si,
            questions: s.questions.map((q, qi) => ({
              type: q.type, text: q.text.trim(), required: q.required,
              options: questionTypeNeedsOptions.includes(q.type)
                ? q.options.filter((o) => o.trim()) : null,
              order: qi,
            })),
          })),
        }),
      });

      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Failed to save"); }
      const data = await res.json();
      toast.success(publish ? "Survey published!" : "Survey saved as draft");
      router.push(`/surveys/${data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
      setPublishing(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Create New Survey</h1>
          <p className="text-sm text-muted-foreground">Build your survey page by page</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {autoSaveStatus === "saving" && <><CloudOff className="h-3 w-3 animate-pulse" /> Saving...</>}
          {autoSaveStatus === "saved" && <><Cloud className="h-3 w-3 text-green-500" /> Saved{lastSaved ? ` ${lastSaved.toLocaleTimeString()}` : ""}</>}
          {autoSaveStatus === "error" && <span className="text-destructive">Save failed</span>}
          {autoSaveStatus === "idle" && <span>Draft auto-saves every 3s</span>}
        </div>
        <Button variant="outline" size="sm" onClick={() => saveSurvey(false)} disabled={saving || publishing} className="gap-2">
          <Save className="h-4 w-4" /> {saving && !publishing ? "Saving..." : "Save as Draft"}
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
          <StepPill key={s.tempId} label={s.title.trim() || `Section ${si + 1}`}
            active={currentPage.kind === "section" && currentPage.sectionIndex === si}
            onClick={() => goToPage(pageIndexForSection(si))} />
        ))}
      </div>

      {currentPage.kind === "details" ? (
        <>
          <Card>
            <CardHeader><CardTitle>Survey Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input id="title" placeholder="e.g., Customer Satisfaction Survey" value={title}
                  onChange={(e) => setTitle(e.target.value)} maxLength={200} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" placeholder="Brief description of your survey..." value={description}
                  onChange={(e) => setDescription(e.target.value)} maxLength={2000} rows={3} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Sections ({sections.length}) <span className="text-sm font-normal text-muted-foreground">· {questionCount} questions</span></CardTitle>
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
                    <button key={s.tempId} onClick={() => goToPage(pageIndexForSection(si))}
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
        <>
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
            {selectedCount > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{selectedCount} selected</Badge>
                <Button variant="destructive" size="sm" onClick={() => bulkAction("delete")} className="gap-1">
                  <Trash2 className="h-3 w-3" /> Delete
                </Button>
                <select
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value !== "") {
                      bulkAction("move", e.target.value);
                      e.target.value = "";
                    }
                  }}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  title="Move selected to section"
                >
                  <option value="">Move to section...</option>
                  {sections.map((s, ti) => (
                    ti !== currentPage.sectionIndex ? (
                      <option key={s.tempId} value={s.tempId}>{s.title.trim() || `Section ${ti + 1}`}</option>
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
          <SectionCard
            section={sections[currentPage.sectionIndex]}
            index={currentPage.sectionIndex}
            questionStart={currentPage.questionStart}
            questions={currentPage.questions}
            selected={selected}
            onToggleSelect={toggleSelect}
            onUpdate={updateSection}
            onRemove={() => removeSection(sections[currentPage.sectionIndex].tempId)}
            onAddQuestion={(type) => addQuestionToSection(sections[currentPage.sectionIndex].tempId, type)}
            onMoveQuestion={moveQuestion}
          />
        </>
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
          <Button onClick={() => saveSurvey(true)} disabled={saving || publishing} className="gap-2">
            <Eye className="h-4 w-4" /> {publishing ? "Publishing..." : "Publish & View"}
          </Button>
        )}
      </div>
    </div>
  );
}
