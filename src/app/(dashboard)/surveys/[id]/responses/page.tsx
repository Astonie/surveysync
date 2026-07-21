"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, Download, ExternalLink, Users, TrendingUp, Clock, BarChart3,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from "recharts";

const PIE_COLORS = ["#2563eb", "#16a34a", "#ea580c", "#9333ea", "#dc2626", "#0891b2", "#ca8a04", "#e11d48", "#7c3aed", "#059669"];

export default function ResponsesPage() {
  const params = useParams();
  const router = useRouter();
  const [survey, setSurvey] = useState<any>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [collectorFilter, setCollectorFilter] = useState("");

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

  const filteredResponses = useMemo(() => {
    return responses.filter((r: any) => {
      const d = new Date(r.createdAt);
      if (dateFrom && d < new Date(dateFrom)) return false;
      if (dateTo) { const to = new Date(dateTo); to.setHours(23, 59, 59, 999); if (d > to) return false; }
      if (collectorFilter && r.submittedById !== collectorFilter) return false;
      return true;
    });
  }, [responses, dateFrom, dateTo, collectorFilter]);

  const questions = useMemo(() => survey?.questions?.sort((a: any, b: any) => a.order - b.order) || [], [survey]);

  const collectors = useMemo(() => {
    const map = new Map<string, { name: string; email: string; count: number }>();
    responses.forEach((r: any) => {
      if (r.collector) {
        const id = r.submittedById;
        const existing = map.get(id);
        if (existing) existing.count++;
        else map.set(id, { name: r.collector.name || r.collector.email, email: r.collector.email, count: 1 });
      }
    });
    return Array.from(map.entries()).map(([id, info]) => ({ id, ...info }));
  }, [responses]);

  const stats = useMemo(() => {
    if (filteredResponses.length === 0) return null;
    const now = new Date();
    const first = new Date(filteredResponses[filteredResponses.length - 1].createdAt);
    const daysSinceFirst = Math.max(1, Math.ceil((now.getTime() - first.getTime()) / 86400000));
    const responsesPerDay: Record<string, number> = {};
    filteredResponses.forEach((r: any) => {
      const day = new Date(r.createdAt).toLocaleDateString();
      responsesPerDay[day] = (responsesPerDay[day] || 0) + 1;
    });
    const timeline = Object.entries(responsesPerDay).map(([date, count]) => ({ date, count })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const offlineCount = filteredResponses.filter((r: any) => r.isOffline).length;
    return { total: filteredResponses.length, rate: (filteredResponses.length / daysSinceFirst).toFixed(1), timeline, offlineCount, onlineCount: filteredResponses.length - offlineCount };
  }, [filteredResponses]);

  function getChartData(questionId: string, questionType: string) {
    if (!["MULTIPLE_CHOICE", "CHECKBOX", "DROPDOWN"].includes(questionType)) return null;
    const counts: Record<string, number> = {};
    filteredResponses.forEach((r: any) => {
      const answer = r.answers.find((a: any) => a.questionId === questionId);
      if (!answer) return;
      const values = Array.isArray(answer.value) ? answer.value : [String(answer.value)];
      values.forEach((v: string) => { counts[v] = (counts[v] || 0) + 1; });
    });
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return Object.entries(counts).map(([name, count]) => ({ name, count, percentage: total > 0 ? Math.round((count / total) * 100) : 0 })).sort((a, b) => b.count - a.count);
  }

  function getRatingStats(questionId: string) {
    const ratings = filteredResponses.map((r: any) => { const a = r.answers.find((ans: any) => ans.questionId === questionId); return a ? Number(a.value) : null; }).filter((v): v is number => v !== null);
    if (ratings.length === 0) return null;
    const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratings.forEach((r) => { distribution[r] = (distribution[r] || 0) + 1; });
    return { average: avg.toFixed(1), total: ratings.length, distribution: Object.entries(distribution).map(([score, count]) => ({ score: `${score}★`, count, percentage: Math.round((count / ratings.length) * 100) })) };
  }

  function getTextAnswers(questionId: string) {
    return filteredResponses.map((r: any) => { const a = r.answers.find((ans: any) => ans.questionId === questionId); return a ? String(a.value) : null; }).filter(Boolean);
  }

  function exportCSV() {
    if (!survey || filteredResponses.length === 0) return;
    const headers = ["Response ID", "Date", "Channel", "Collector", ...questions.map((q: any) => q.text)];
    const rows = filteredResponses.map((r: any) => [
      r.id, new Date(r.createdAt).toLocaleString(), r.isOffline ? "Offline" : "Online",
      r.collector?.email || "Self",
      ...questions.map((q: any) => { const answer = r.answers.find((a: any) => a.questionId === q.id); if (!answer) return ""; if (Array.isArray(answer.value)) return answer.value.join(", "); return String(answer.value); }),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${survey.title.replace(/\s+/g, "_")}_responses.csv`; a.click(); URL.revokeObjectURL(url);
  }

  if (loading) {
    return <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  if (!survey) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Analytics: {survey.title}</h1>
          <p className="text-sm text-muted-foreground">{filteredResponses.length} of {responses.length} responses{(dateFrom || dateTo || collectorFilter) && " (filtered)"}</p>
        </div>
        <Button variant="outline" onClick={exportCSV} disabled={filteredResponses.length === 0} className="gap-2">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1">
              <Label className="text-xs">From</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
            </div>
            {collectors.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs">Collector</Label>
                <select value={collectorFilter} onChange={(e) => setCollectorFilter(e.target.value)} className="w-48 rounded-lg border border-input bg-background px-3 py-2 text-sm">
                  <option value="">All collectors</option>
                  {collectors.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.count})</option>
                  ))}
                </select>
              </div>
            )}
            {(dateFrom || dateTo || collectorFilter) && (
              <Button variant="ghost" size="sm" onClick={() => { setDateFrom(""); setDateTo(""); setCollectorFilter(""); }}>Clear Filter</Button>
            )}
          </div>
        </CardContent>
      </Card>

      {collectors.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Collector Performance</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {collectors.map((c) => (
                <div key={c.id} className="border rounded-lg p-3">
                  <p className="font-medium text-sm">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.email}</p>
                  <p className="text-2xl font-bold mt-1">{c.count} <span className="text-sm font-normal text-muted-foreground">responses</span></p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Responses</p><p className="text-3xl font-bold">{stats.total}</p></div><Users className="h-8 w-8 text-muted-foreground" /></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Avg/Day</p><p className="text-3xl font-bold">{stats.rate}</p></div><TrendingUp className="h-8 w-8 text-muted-foreground" /></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Online</p><p className="text-3xl font-bold">{stats.onlineCount}</p></div><Badge variant="success" className="text-xs">Live</Badge></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Offline</p><p className="text-3xl font-bold">{stats.offlineCount}</p></div><Clock className="h-8 w-8 text-muted-foreground" /></div></CardContent></Card>
        </div>
      )}

      {stats && stats.timeline.length > 1 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Responses Over Time</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={stats.timeline}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} dot={{ fill: "#2563eb" }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {filteredResponses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">{responses.length === 0 ? "No responses yet." : "No responses match the selected filter."}</p>
            {responses.length === 0 && (
              <Link href={`/collect/${survey.id}`} target="_blank">
                <Button><ExternalLink className="h-4 w-4 mr-2" /> Open Survey Form</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {questions.map((q: any) => {
            const chartData = getChartData(q.id, q.type);
            const ratingStats = q.type === "RATING_SCALE" ? getRatingStats(q.id) : null;
            const textAnswers = q.type === "TEXT_INPUT" ? getTextAnswers(q.id) : [];

            return (
              <Card key={q.id}>
                <CardHeader>
                  <CardTitle className="text-base">{q.text}</CardTitle>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-xs">{q.type.replace(/_/g, " ")}</Badge>
                    <Badge variant="secondary" className="text-xs">{filteredResponses.length} answers</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {chartData ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Bar dataKey="count" radius={[4, 4, 0, 0]}>{chartData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}</Bar>
                        </BarChart>
                      </ResponsiveContainer>
                      <div className="space-y-2">
                        {chartData.map((item) => (
                          <div key={item.name} className="flex items-center gap-3">
                            <span className="text-sm font-medium w-32 truncate" title={item.name}>{item.name}</span>
                            <div className="flex-1 h-4 bg-secondary rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${item.percentage}%` }} />
                            </div>
                            <span className="text-sm text-muted-foreground w-16 text-right">{item.count} ({item.percentage}%)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : q.type === "RATING_SCALE" && ratingStats ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="text-center py-4">
                        <p className="text-5xl font-bold text-primary">{ratingStats.average}</p>
                        <p className="text-sm text-muted-foreground mt-2">Average rating ({ratingStats.total} ratings)</p>
                      </div>
                      <div className="space-y-2">
                        {ratingStats.distribution.map((d) => (
                          <div key={d.score} className="flex items-center gap-3">
                            <span className="text-sm font-medium w-8">{d.score}</span>
                            <div className="flex-1 h-4 bg-secondary rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${d.percentage}%` }} />
                            </div>
                            <span className="text-sm text-muted-foreground w-16 text-right">{d.count} ({d.percentage}%)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : q.type === "TEXT_INPUT" ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {textAnswers.length === 0 ? <p className="text-sm text-muted-foreground">No text responses</p> :
                        textAnswers.map((text: string | null, i: number) => (
                          <div key={i} className="text-sm p-2 bg-secondary rounded">{text}</div>
                        ))
                      }
                    </div>
                  ) : <p className="text-sm text-muted-foreground">No data</p>}
                </CardContent>
              </Card>
            );
          })}

          <Card>
            <CardHeader><CardTitle className="text-base">All Responses ({filteredResponses.length})</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">#</th>
                      <th className="text-left p-2 font-medium">Date</th>
                      <th className="text-left p-2 font-medium">Channel</th>
                      <th className="text-left p-2 font-medium">Collector</th>
                      {questions.map((q: any) => (
                        <th key={q.id} className="text-left p-2 font-medium max-w-[200px]">{q.text.length > 30 ? q.text.slice(0, 30) + "..." : q.text}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResponses.map((r: any, i: number) => (
                      <tr key={r.id} className="border-b">
                        <td className="p-2">{i + 1}</td>
                        <td className="p-2 text-muted-foreground whitespace-nowrap">{new Date(r.createdAt).toLocaleDateString()}</td>
                        <td className="p-2"><Badge variant={r.isOffline ? "warning" : "success"} className="text-xs">{r.isOffline ? "Offline" : "Online"}</Badge></td>
                        <td className="p-2 text-xs">{r.collector?.name || r.collector?.email || "—"}</td>
                        {questions.map((q: any) => {
                          const answer = r.answers.find((a: any) => a.questionId === q.id);
                          return <td key={q.id} className="p-2 max-w-[200px] truncate">{answer ? Array.isArray(answer.value) ? answer.value.join(", ") : String(answer.value) : "-"}</td>;
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
