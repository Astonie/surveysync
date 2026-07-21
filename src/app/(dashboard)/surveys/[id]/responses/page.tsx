"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, ExternalLink } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function ResponsesPage() {
  const params = useParams();
  const router = useRouter();
  const [survey, setSurvey] = useState<any>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/responses/${params.id}`);
        if (res.ok) {
          const data = await res.json();
          setSurvey(data.survey);
          setResponses(data.responses || []);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id]);

  function exportCSV() {
    if (!survey || responses.length === 0) return;

    const questions = survey.questions.sort(
      (a: any, b: any) => a.order - b.order
    );
    const headers = ["Response ID", "Date", ...questions.map((q: any) => q.text)];
    const rows = responses.map((r: any) => {
      const row = [
        r.id,
        new Date(r.createdAt).toLocaleString(),
        ...questions.map((q: any) => {
          const answer = r.answers.find((a: any) => a.questionId === q.id);
          if (!answer) return "";
          if (Array.isArray(answer.value)) return answer.value.join(", ");
          return String(answer.value);
        }),
      ];
      return row;
    });

    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${survey.title.replace(/\s+/g, "_")}_responses.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function getChartData(questionId: string, questionType: string) {
    if (!["MULTIPLE_CHOICE", "CHECKBOX", "DROPDOWN"].includes(questionType))
      return null;

    const counts: Record<string, number> = {};
    responses.forEach((r: any) => {
      const answer = r.answers.find((a: any) => a.questionId === questionId);
      if (!answer) return;
      const values = Array.isArray(answer.value)
        ? answer.value
        : [String(answer.value)];
      values.forEach((v: string) => {
        counts[v] = (counts[v] || 0) + 1;
      });
    });

    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!survey) return null;

  const questions = survey.questions.sort(
    (a: any, b: any) => a.order - b.order
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            Responses: {survey.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {responses.length} total response{responses.length !== 1 && "s"}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={exportCSV}
          disabled={responses.length === 0}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {responses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No responses yet.</p>
            <Link href={`/collect/${survey.id}`} target="_blank">
              <Button>
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Survey Form
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          {questions.map((q: any) => {
            const chartData = getChartData(q.id, q.type);
            const textAnswers =
              q.type === "TEXT_INPUT"
                ? responses
                    .map((r: any) => {
                      const a = r.answers.find(
                        (ans: any) => ans.questionId === q.id
                      );
                      return a ? String(a.value) : null;
                    })
                    .filter(Boolean)
                : [];

            return (
              <Card key={q.id}>
                <CardHeader>
                  <CardTitle className="text-base">{q.text}</CardTitle>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-xs">
                      {q.type.replace(/_/g, " ")}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {responses.length} answers
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {chartData ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : q.type === "TEXT_INPUT" ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {textAnswers.map((text: string | null, i: number) => (
                        <div key={i} className="text-sm p-2 bg-secondary rounded">
                          {text}
                        </div>
                      ))}
                    </div>
                  ) : q.type === "RATING_SCALE" ? (() => {
                    const ratings = responses
                      .map((r: any) => {
                        const a = r.answers.find(
                          (ans: any) => ans.questionId === q.id
                        );
                        return a ? Number(a.value) : null;
                      })
                      .filter((v): v is number => v !== null);
                    const avg =
                      ratings.length > 0
                        ? (ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length).toFixed(1)
                        : "N/A";
                    return (
                      <div className="text-center">
                        <p className="text-4xl font-bold text-primary">{avg}</p>
                        <p className="text-sm text-muted-foreground">
                          Average rating out of 5 ({ratings.length} ratings)
                        </p>
                      </div>
                    );
                  })() : null}
                </CardContent>
              </Card>
            );
          })}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">All Responses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">#</th>
                      <th className="text-left p-2 font-medium">Date</th>
                      {questions.map((q: any) => (
                        <th key={q.id} className="text-left p-2 font-medium">
                          {q.text.slice(0, 30)}
                          {q.text.length > 30 ? "..." : ""}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {responses.map((r: any, i: number) => (
                      <tr key={r.id} className="border-b">
                        <td className="p-2">{i + 1}</td>
                        <td className="p-2 text-muted-foreground">
                          {new Date(r.createdAt).toLocaleDateString()}
                        </td>
                        {questions.map((q: any) => {
                          const answer = r.answers.find(
                            (a: any) => a.questionId === q.id
                          );
                          return (
                            <td key={q.id} className="p-2">
                              {answer
                                ? Array.isArray(answer.value)
                                  ? answer.value.join(", ")
                                  : String(answer.value)
                                : "-"}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
