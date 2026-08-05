"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FilePlus, List, Users, WifiOff, ClipboardList, Pause, Play } from "lucide-react";
import { useOffline } from "@/providers/OfflineProvider";
import { SURVEY_STATUS_CONFIG, type SurveyStatus } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";

interface SurveySummary {
  id: string;
  title: string;
  status: string;
  myResponses?: number;
  questions?: unknown[];
  _count?: { responses: number; questions?: number };
}

interface CollectorSession {
  id: string;
  surveyId: string;
  status: string;
  responsesCount: number;
}

export default function DashboardPage() {
  const [ownedSurveys, setOwnedSurveys] = useState<SurveySummary[]>([]);
  const [assignedSurveys, setAssignedSurveys] = useState<SurveySummary[]>([]);
  const [collectorSessions, setCollectorSessions] = useState<CollectorSession[]>([]);
  const [loading, setLoading] = useState(true);
  const { pendingCount } = useOffline();

  const allSurveys = [...ownedSurveys, ...assignedSurveys];
  const totalResponses = allSurveys.reduce((acc, s) => acc + (s._count?.responses || 0), 0);
  const activeSurveys = allSurveys.filter((s) => s.status === "active").length;

  useEffect(() => {
    async function load() {
      try {
        const [ownedRes, assignedRes, sessionsRes] = await Promise.all([
          fetch("/api/surveys"),
          fetch("/api/collector/surveys"),
          fetch("/api/collector/sessions"),
        ]);
        if (ownedRes.ok) {
          const data = await ownedRes.json();
          setOwnedSurveys(data.surveys || []);
        }
        if (assignedRes.ok) {
          const data = await assignedRes.json();
          setAssignedSurveys(data.surveys || []);
        }
        if (sessionsRes.ok) {
          const data = await sessionsRes.json();
          setCollectorSessions(data.sessions || []);
        }
      } catch {
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function getStatusConfig(status: string) {
    return SURVEY_STATUS_CONFIG[status as SurveyStatus] || SURVEY_STATUS_CONFIG.draft;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your surveys and responses</p>
        </div>
        <Link href="/surveys/new">
          <Button className="gap-2"><FilePlus className="h-4 w-4" /> New Survey</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Surveys</p>
                <p className="text-3xl font-bold">{allSurveys.length}</p>
              </div>
              <List className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Responses</p>
                <p className="text-3xl font-bold">{totalResponses}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-3xl font-bold">{activeSurveys}</p>
              </div>
              <Badge variant="success" className="text-xs">Live</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Sync</p>
                <p className="text-3xl font-bold">{pendingCount}</p>
              </div>
              <WifiOff className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {assignedSurveys.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" /> Assigned to Me ({assignedSurveys.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {assignedSurveys.map((survey) => {
                const sc = getStatusConfig(survey.status);
                const session = collectorSessions.find((s) => s.surveyId === survey.id && (s.status === "active" || s.status === "paused"));
                return (
                  <div key={survey.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex-1">
                      <Link href={`/collect/${survey.id}`} target="_blank" className="font-medium hover:underline">
                        {survey.title}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {survey.questions?.length ?? survey._count?.questions ?? 0} questions &middot; {survey.myResponses || 0} collected
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {session && (
                        <Badge variant={session.status === "active" ? "success" : "warning"} className="text-xs gap-1">
                          {session.status === "active" ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                          {session.responsesCount} collected
                        </Badge>
                      )}
                      <Badge variant={sc.badge}>{sc.label}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>My Surveys ({ownedSurveys.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-1/2" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                  <Skeleton className="h-5 w-16" />
                </div>
              ))}
            </div>
          ) : ownedSurveys.length === 0 ? (
            <div className="text-center py-10">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <ClipboardList className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-4">No surveys yet. Create your first one!</p>
              <Link href="/surveys/new">
                <Button><FilePlus className="h-4 w-4 mr-2" /> Create Survey</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {ownedSurveys.map((survey) => {
                const sc = getStatusConfig(survey.status);
                return (
                  <Link key={survey.id} href={`/surveys/${survey.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-secondary/50 transition-colors">
                    <div>
                      <p className="font-medium">{survey.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {(survey.questions?.length ?? survey._count?.questions ?? 0)} questions &middot; {survey._count?.responses || 0} responses
                      </p>
                    </div>
                    <Badge variant={sc.badge}>{sc.label}</Badge>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
