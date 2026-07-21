"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import { SURVEY_STATUS_CONFIG, type SurveyStatus } from "@/types";

export default function SurveysListPage() {
  const router = useRouter();
  const [surveys, setSurveys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  useEffect(() => {
    loadSurveys();
  }, []);

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

  async function deleteSurvey(id: string) {
    if (!confirm("Are you sure you want to delete this survey?")) return;
    try {
      await fetch(`/api/surveys/${id}`, { method: "DELETE" });
      setSurveys(surveys.filter((s) => s.id !== id));
    } catch {}
    setMenuOpen(null);
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
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              {search ? "No surveys match your search." : "No surveys yet."}
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
                            onClick={() => deleteSurvey(survey.id)}
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
                  <span>{survey._count?.questions || 0} questions</span>
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
    </div>
  );
}
