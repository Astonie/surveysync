"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  BarChart3,
  ClipboardList,
} from "lucide-react";
import { toast } from "sonner";
import { SURVEY_STATUS_CONFIG, type SurveyStatus } from "@/types";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";

interface SurveySummary {
  id: string;
  title: string;
  description: string | null;
  status: string;
  createdAt: string;
  questions?: unknown[];
  _count?: { responses: number };
}

export default function SurveysListPage() {
  const [surveys, setSurveys] = useState<SurveySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SurveySummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function loadSurveys() {
    try {
      const res = await fetch("/api/surveys");
      if (res.ok) {
        const data = await res.json();
        setSurveys(data.surveys || []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSurveys();
  }, []);

  async function deleteSurvey() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/surveys/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        setSurveys((prev) => prev.filter((s) => s.id !== deleteTarget.id));
        toast.success("Survey deleted");
      } else {
        toast.error("Failed to delete survey");
      }
    } catch {
      toast.error("Failed to delete survey");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  const filtered = surveys.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Surveys</h1>
          <p className="text-muted-foreground">Manage and view all your surveys</p>
        </div>
        <Link href="/surveys/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Survey
          </Button>
        </Link>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search surveys..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="relative">
              <CardHeader className="pb-3">
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-5 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              {search ? (
                <Search className="h-6 w-6 text-muted-foreground" />
              ) : (
                <ClipboardList className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <h2 className="text-lg font-semibold mb-1">
              {search ? "No matching surveys" : "No surveys yet"}
            </h2>
            <p className="text-muted-foreground mb-6">
              {search
                ? "Try a different search term."
                : "Create your first survey to start collecting responses."}
            </p>
            {!search && (
              <Link href="/surveys/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Survey
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((survey) => (
            <Card key={survey.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <Link href={`/surveys/${survey.id}`} className="hover:underline">
                    <CardTitle className="text-lg">{survey.title}</CardTitle>
                  </Link>
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        setMenuOpen(menuOpen === survey.id ? null : survey.id)
                      }
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                    {menuOpen === survey.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setMenuOpen(null)}
                        />
                        <div className="absolute right-0 top-9 z-20 w-40 bg-card border rounded-lg shadow-lg py-1">
                          <Link
                            href={`/surveys/${survey.id}`}
                            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary"
                          >
                            <Eye className="h-3 w-3" /> View
                          </Link>
                          <Link
                            href={`/surveys/${survey.id}/edit`}
                            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary"
                          >
                            <Edit className="h-3 w-3" /> Edit
                          </Link>
                          <Link
                            href={`/surveys/${survey.id}/responses`}
                            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary"
                          >
                            <BarChart3 className="h-3 w-3" /> Responses
                          </Link>
                          <button
                            onClick={() => {
                              setDeleteTarget(survey);
                              setMenuOpen(null);
                            }}
                            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary text-destructive w-full text-left"
                          >
                            <Trash2 className="h-3 w-3" /> Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                {survey.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {survey.description}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{survey.questions?.length || 0} questions</span>
                  <span>&middot;</span>
                  <span>{survey._count?.responses || 0} responses</span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  {(() => {
                    const sc = SURVEY_STATUS_CONFIG[survey.status as SurveyStatus] || SURVEY_STATUS_CONFIG.draft;
                    return <Badge variant={sc.badge}>{sc.label}</Badge>;
                  })()}
                  <span className="text-xs text-muted-foreground">
                    {new Date(survey.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && !deleting && setDeleteTarget(null)}
        title="Delete survey?"
        description={
          deleteTarget
            ? `"${deleteTarget.title}" and all of its responses will be permanently deleted. This action cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={deleteSurvey}
      />
    </div>
  );
}
