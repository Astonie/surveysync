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
  Globe,
  EyeOff,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export default function SurveyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [survey, setSurvey] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/surveys/${params.id}`);
        if (res.ok) {
          setSurvey(await res.json());
        } else {
          router.push("/surveys");
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

  async function togglePublish() {
    setToggling(true);
    try {
      const res = await fetch(`/api/surveys/${survey.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !survey.isPublished }),
      });
      if (res.ok) {
        setSurvey({ ...survey, isPublished: !survey.isPublished });
      }
    } finally {
      setToggling(false);
    }
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
        <div className="flex items-center gap-2">
          <Badge variant={survey.isPublished ? "success" : "secondary"}>
            {survey.isPublished ? "Published" : "Draft"}
          </Badge>
          <Button
            variant={survey.isPublished ? "outline" : "default"}
            size="sm"
            onClick={togglePublish}
            disabled={toggling}
            className="gap-1"
          >
            {survey.isPublished ? (
              <><EyeOff className="h-3 w-3" /> Unpublish</>
            ) : (
              <><Globe className="h-3 w-3" /> Publish</>
            )}
          </Button>
        </div>
      </div>

      {survey.isPublished && (
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
                    {copied ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Link href={`/collect/${survey.id}`} target="_blank">
                    <Button variant="outline" size="sm" className="gap-1">
                      <ExternalLink className="h-3 w-3" />
                      Open Form
                    </Button>
                  </Link>
                  <Link href={`/surveys/${survey.id}/responses`}>
                    <Button variant="outline" size="sm" className="gap-1">
                      <BarChart3 className="h-3 w-3" />
                      View Responses
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Questions ({survey.questions.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {survey.questions
            .sort((a: any, b: any) => a.order - b.order)
            .map((q: any, i: number) => (
              <div key={q.id} className="border rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    {i + 1}.
                  </span>
                  <div className="flex-1">
                    <p className="font-medium">{q.text}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {q.type.replace(/_/g, " ")}
                      </Badge>
                      {q.required && (
                        <Badge variant="secondary" className="text-xs">Required</Badge>
                      )}
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
          <Button variant="outline" className="gap-2">
            <Edit className="h-4 w-4" />
            Edit Survey
          </Button>
        </Link>
        <Link href={`/surveys/${survey.id}/responses`}>
          <Button className="gap-2">
            <BarChart3 className="h-4 w-4" />
            View Responses ({survey._count?.responses || 0})
          </Button>
        </Link>
      </div>
    </div>
  );
}
