"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  GripVertical,
  ArrowLeft,
  Save,
  Eye,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type QuestionType = "MULTIPLE_CHOICE" | "CHECKBOX" | "TEXT_INPUT" | "RATING_SCALE" | "DROPDOWN" | "DATE_INPUT";

interface QuestionData {
  tempId: string;
  type: QuestionType;
  text: string;
  required: boolean;
  options: string[];
}

const questionTypeLabels: Record<QuestionType, string> = {
  MULTIPLE_CHOICE: "Multiple Choice",
  CHECKBOX: "Checkbox",
  TEXT_INPUT: "Text Input",
  RATING_SCALE: "Rating Scale (1-5)",
  DROPDOWN: "Dropdown",
  DATE_INPUT: "Date",
};

const questionTypeNeedsOptions: QuestionType[] = [
  "MULTIPLE_CHOICE",
  "CHECKBOX",
  "DROPDOWN",
];

function SortableQuestion({
  question,
  index,
  onUpdate,
  onRemove,
}: {
  question: QuestionData;
  index: number;
  onUpdate: (q: QuestionData) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: question.tempId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const needsOptions = questionTypeNeedsOptions.includes(question.type);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border rounded-xl p-4 bg-card space-y-3"
    >
      <div className="flex items-center gap-2">
        <button
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
        </button>
        <Badge variant="secondary" className="shrink-0">
          Q{index + 1}
        </Badge>
        <Badge variant="outline" className="shrink-0">
          {questionTypeLabels[question.type]}
        </Badge>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2">
        <Input
          placeholder="Enter your question..."
          value={question.text}
          onChange={(e) => onUpdate({ ...question, text: e.target.value })}
        />
      </div>

      {needsOptions && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Options</Label>
          {question.options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                placeholder={`Option ${i + 1}`}
                value={opt}
                onChange={(e) => {
                  const newOptions = [...question.options];
                  newOptions[i] = e.target.value;
                  onUpdate({ ...question, options: newOptions });
                }}
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  const newOptions = question.options.filter((_, j) => j !== i);
                  onUpdate({ ...question, options: newOptions });
                }}
                className="shrink-0 text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              onUpdate({ ...question, options: [...question.options, ""] })
            }
            className="gap-1"
          >
            <Plus className="h-3 w-3" />
            Add Option
          </Button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={question.required}
            onChange={(e) =>
              onUpdate({ ...question, required: e.target.checked })
            }
            className="rounded"
          />
          Required
        </label>
      </div>
    </div>
  );
}

export default function NewSurveyPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function addQuestion(type: QuestionType) {
    const newQ: QuestionData = {
      tempId: crypto.randomUUID(),
      type,
      text: "",
      required: true,
      options: type === "RATING_SCALE" ? [] : ["", ""],
    };
    setQuestions([...questions, newQ]);
  }

  function updateQuestion(updated: QuestionData) {
    setQuestions(questions.map((q) => (q.tempId === updated.tempId ? updated : q)));
  }

  function removeQuestion(tempId: string) {
    setQuestions(questions.filter((q) => q.tempId !== tempId));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = questions.findIndex((q) => q.tempId === active.id);
    const newIndex = questions.findIndex((q) => q.tempId === over.id);
    setQuestions(arrayMove(questions, oldIndex, newIndex));
  }

  async function saveSurvey(publish: boolean) {
    if (!title.trim()) return alert("Please enter a survey title");
    if (questions.length === 0) return alert("Add at least one question");

    for (const q of questions) {
      if (!q.text.trim()) return alert("All questions need text");
      if (questionTypeNeedsOptions.includes(q.type)) {
        const validOptions = q.options.filter((o) => o.trim());
        if (validOptions.length < 2) return alert(`"${q.text}" needs at least 2 options`);
      }
    }

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      status: publish ? "active" : "draft",
      questions: questions.map((q, i) => ({
        type: q.type,
        text: q.text.trim(),
        required: q.required,
        options: questionTypeNeedsOptions.includes(q.type)
          ? q.options.filter((o) => o.trim())
          : null,
        order: i,
      })),
    };

    try {
      setSaving(true);
      if (publish) setPublishing(true);

      const res = await fetch("/api/surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save survey");
      }

      const data = await res.json();
      router.push(`/surveys/${data.id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
      setPublishing(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Create New Survey</h1>
          <p className="text-sm text-muted-foreground">
            Design your survey with different question types
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Survey Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Customer Satisfaction Survey"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Brief description of your survey..."
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
        <CardContent className="space-y-4">
          {questions.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed rounded-xl">
              <p className="text-muted-foreground mb-4">
                No questions yet. Add your first question below.
              </p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={questions.map((q) => q.tempId)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {questions.map((q, i) => (
                    <SortableQuestion
                      key={q.tempId}
                      question={q}
                      index={i}
                      onUpdate={updateQuestion}
                      onRemove={() => removeQuestion(q.tempId)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

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
                  <Plus className="h-3 w-3" />
                  {label}
                </Button>
              )
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 pb-8">
        <Button
          variant="outline"
          onClick={() => saveSurvey(false)}
          disabled={saving}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          {saving && !publishing ? "Saving..." : "Save Draft"}
        </Button>
        <Button
          onClick={() => saveSurvey(true)}
          disabled={saving}
          className="gap-2"
        >
          <Eye className="h-4 w-4" />
          {publishing ? "Publishing..." : "Publish & View"}
        </Button>
      </div>
    </div>
  );
}
