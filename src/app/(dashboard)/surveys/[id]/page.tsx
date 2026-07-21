"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Edit,
  BarChart3,
  ExternalLink,
  Copy,
  CheckCircle,
  Pause,
  Play,
  StopCircle,
  Globe,
  UserPlus,
  Trash2,
  Users,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { SURVEY_STATUS_CONFIG, type SurveyStatus } from "@/types";

export default function SurveyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [survey, setSurvey] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [collectors, setCollectors] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [collectorEmail, setCollectorEmail] = useState("");
  const [addingCollector, setAddingCollector] = useState(false);
  const [collectorError, setCollectorError] = useState("");
  const [inviteResult, setInviteResult] = useState<any>(null);
  const [copiedInvite, setCopiedInvite] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [surveyRes, accessRes, inviteRes] = await Promise.all([
          fetch(`/api/surveys/${params.id}`),
          fetch(`/api/surveys/${params.id}/access`),
          fetch(`/api/surveys/${params.id}/invite`),
        ]);
        if (surveyRes.ok) {
          setSurvey(await surveyRes.json());
        } else {
          router.push("/surveys");
          return;
        }
        if (accessRes.ok) {
          const data = await accessRes.json();
          setCollectors(data.access || []);
        }
        if (inviteRes.ok) {
          const data = await inviteRes.json();
          setInvitations(data.invitations || []);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id, router]);

  function getCollectUrl() {
    return `${typeof window !== "undefined" ? window.location.origin : ""}/collect/${survey.id}`;
  }

  function copyLink() {
    navigator.clipboard.writeText(getCollectUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function updateStatus(newStatus: SurveyStatus) {
    setUpdating(true);
    try {
      const res = await fetch(`/api/surveys/${survey.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) setSurvey({ ...survey, status: newStatus });
    } finally {
      setUpdating(false);
    }
  }

  async function inviteCollector() {
    if (!collectorEmail.trim()) return;
    setAddingCollector(true);
    setCollectorError("");
    setInviteResult(null);
    try {
      const res = await fetch(`/api/surveys/${survey.id}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: collectorEmail.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (res.ok) {
        setInviteResult(data);
        setInvitations([data.invitation, ...invitations]);
        setCollectorEmail("");
      } else {
        if (data.status === "pending" && data.invitationId) {
          setInviteResult(data);
        } else {
          setCollectorError(data.error || "Failed to send invitation");
        }
      }
    } finally {
      setAddingCollector(false);
    }
  }

  function copyInviteLink() {
    if (inviteResult?.inviteUrl) {
      navigator.clipboard.writeText(inviteResult.inviteUrl);
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2000);
    }
  }

  async function removeCollector(userId: string) {
    if (!confirm("Remove this collector's access?")) return;
    try {
      const res = await fetch(`/api/surveys/${survey.id}/access`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        setCollectors(collectors.filter((c) => c.userId !== userId));
      }
    } catch {}
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!survey) return null;

  const collectUrl = getCollectUrl();
  const sc = SURVEY_STATUS_CONFIG[survey.status as SurveyStatus] || SURVEY_STATUS_CONFIG.draft;
  const isActive = survey.status === "active";
  const isDraft = survey.status === "draft";
  const isPaused = survey.status === "paused";
  const isClosed = survey.status === "closed";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{survey.title}</h1>
          {survey.description && (
            <p className="text-muted-foreground">{survey.description}</p>
          )}
        </div>
        <Badge variant={sc.badge} className="text-sm">{sc.label}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Survey Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {isDraft && (
              <Button onClick={() => updateStatus("active")} disabled={updating} className="gap-2">
                <Globe className="h-4 w-4" /> Activate Survey
              </Button>
            )}
            {isActive && (
              <Button variant="outline" onClick={() => updateStatus("paused")} disabled={updating} className="gap-2">
                <Pause className="h-4 w-4" /> Pause
              </Button>
            )}
            {isPaused && (
              <Button onClick={() => updateStatus("active")} disabled={updating} className="gap-2">
                <Play className="h-4 w-4" /> Resume
              </Button>
            )}
            {(isActive || isPaused) && (
              <Button
                variant="destructive"
                onClick={() => {
                  if (confirm("Close this survey? It will stop accepting all new responses.")) {
                    updateStatus("closed");
                  }
                }}
                disabled={updating}
                className="gap-2"
              >
                <StopCircle className="h-4 w-4" /> Close Survey
              </Button>
            )}
            {isClosed && (
              <p className="text-sm text-muted-foreground">This survey is closed.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" /> Team ({collectors.length} active)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Collector's email address"
              value={collectorEmail}
              onChange={(e) => setCollectorEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && inviteCollector()}
              className="flex-1"
            />
            <Button onClick={inviteCollector} disabled={addingCollector || !collectorEmail.trim()} className="gap-2">
              <UserPlus className="h-4 w-4" />
              {addingCollector ? "Inviting..." : "Invite"}
            </Button>
          </div>
          {collectorError && <p className="text-sm text-destructive">{collectorError}</p>}
          <p className="text-xs text-muted-foreground">
            Invite people by email. They must register with that email to accept.
          </p>

          {inviteResult?.inviteUrl && (
            <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg space-y-2">
              <p className="text-sm font-medium text-green-700 dark:text-green-300">
                Invitation link created!
              </p>
              <div className="flex items-center gap-2">
                <Input readOnly value={inviteResult.inviteUrl} className="text-xs font-mono" />
                <Button variant="outline" size="sm" onClick={copyInviteLink}>
                  {copiedInvite ? "Copied!" : "Copy"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Share this link with {inviteResult.invitation?.email}. It expires in 7 days.
              </p>
            </div>
          )}

          {invitations.filter((inv) => inv.status === "pending").length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase">Pending Invitations</p>
              {invitations.filter((inv) => inv.status === "pending").map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-3 border border-dashed rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{inv.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Sent {new Date(inv.createdAt).toLocaleDateString()} · Expires {new Date(inv.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="secondary">Pending</Badge>
                </div>
              ))}
            </div>
          )}

          {collectors.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase">Active Collectors</p>
              {collectors.map((c) => (
                <div key={c.userId} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{c.user.name || c.user.email}</p>
                    <p className="text-xs text-muted-foreground">{c.user.email}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCollector(c.userId)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {(isActive || isPaused) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Share This Survey</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <QRCodeSVG value={collectUrl} size={120} />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Input readOnly value={collectUrl} className="text-sm font-mono" />
                  <Button variant="outline" size="icon" onClick={copyLink}>
                    {copied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Link href={`/collect/${survey.id}`} target="_blank">
                    <Button variant="outline" size="sm" className="gap-1">
                      <ExternalLink className="h-3 w-3" /> Open Form
                    </Button>
                  </Link>
                  <Link href={`/surveys/${survey.id}/responses`}>
                    <Button variant="outline" size="sm" className="gap-1">
                      <BarChart3 className="h-3 w-3" /> View Responses
                    </Button>
                  </Link>
                </div>
                {isPaused && (
                  <p className="text-xs text-yellow-600">Survey is paused — respondents will see a "paused" message.</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Questions ({survey.questions.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {survey.questions
            .sort((a: any, b: any) => a.order - b.order)
            .map((q: any, i: number) => (
              <div key={q.id} className="border rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <span className="text-sm font-medium text-muted-foreground">{i + 1}.</span>
                  <div className="flex-1">
                    <p className="font-medium">{q.text}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{q.type.replace(/_/g, " ")}</Badge>
                      {q.required && <Badge variant="secondary" className="text-xs">Required</Badge>}
                    </div>
                    {q.options && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {(q.options as string[]).map((opt: string) => (
                          <Badge key={opt} variant="secondary" className="text-xs">{opt}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 pb-8">
        <Link href={`/surveys/${survey.id}/edit`}>
          <Button variant="outline" className="gap-2"><Edit className="h-4 w-4" /> Edit Survey</Button>
        </Link>
        <Link href={`/surveys/${survey.id}/responses`}>
          <Button className="gap-2"><BarChart3 className="h-4 w-4" /> View Responses ({survey._count?.responses || 0})</Button>
        </Link>
      </div>
    </div>
  );
}
