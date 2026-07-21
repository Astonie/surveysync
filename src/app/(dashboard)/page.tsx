"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FilePlus, List, Users, WifiOff } from "lucide-react";
import { useOffline } from "@/providers/OfflineProvider";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalSurveys: 0,
    totalResponses: 0,
    publishedSurveys: 0,
    offlineResponses: 0,
  });
  const [recentSurveys, setRecentSurveys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { isOnline, pendingCount } = useOffline();

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/surveys");
        if (res.ok) {
          const data = await res.json();
          setRecentSurveys(data.surveys?.slice(0, 5) || []);
          setStats({
            totalSurveys: data.surveys?.length || 0,
            totalResponses: data.surveys?.reduce(
              (acc: number, s: any) => acc + (s._count?.responses || 0),
              0
            ) || 0,
            publishedSurveys:
              data.surveys?.filter((s: any) => s.isPublished).length || 0,
            offlineResponses: 0,
          });
        }
      } catch {
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your surveys and responses
          </p>
        </div>
        <Link href="/surveys/new">
          <Button className="gap-2">
            <FilePlus className="h-4 w-4" />
            New Survey
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Surveys</p>
                <p className="text-3xl font-bold">{stats.totalSurveys}</p>
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
                <p className="text-3xl font-bold">{stats.totalResponses}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Published</p>
                <p className="text-3xl font-bold">{stats.publishedSurveys}</p>
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

      <Card>
        <CardHeader>
          <CardTitle>Recent Surveys</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : recentSurveys.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                No surveys yet. Create your first one!
              </p>
              <Link href="/surveys/new">
                <Button>
                  <FilePlus className="h-4 w-4 mr-2" />
                  Create Survey
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentSurveys.map((survey: any) => (
                <Link
                  key={survey.id}
                  href={`/surveys/${survey.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-secondary/50 transition-colors"
                >
                  <div>
                    <p className="font-medium">{survey.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {survey._count?.questions || 0} questions &middot;{" "}
                      {survey._count?.responses || 0} responses
                    </p>
                  </div>
                  <Badge variant={survey.isPublished ? "success" : "secondary"}>
                    {survey.isPublished ? "Published" : "Draft"}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
