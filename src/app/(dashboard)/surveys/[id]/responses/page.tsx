"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ArrowLeft, Download, ExternalLink, Users, TrendingUp, Clock, BarChart3,
  FileText, Search, Filter, ChevronDown, ChevronUp, Hash, Percent,
  Star, MessageSquare, Activity, Target, Zap, BookOpen,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, AreaChart, Area,
} from "recharts";

const COLORS = ["#2563eb", "#16a34a", "#ea580c", "#9333ea", "#dc2626", "#0891b2", "#ca8a04", "#e11d48", "#7c3aed", "#059669"];

function computeStats(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = sum / sorted.length;
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];
  const mode = (() => {
    const freq: Record<number, number> = {};
    sorted.forEach((v) => { freq[v] = (freq[v] || 0) + 1; });
    const maxFreq = Math.max(...Object.values(freq));
    return Object.entries(freq).filter(([, f]) => f === maxFreq).map(([v]) => Number(v));
  })();
  const variance = sorted.reduce((acc, v) => acc + (v - mean) ** 2, 0) / sorted.length;
  const stdDev = Math.sqrt(variance);
  return { mean, median, mode, stdDev, min: sorted[0], max: sorted[sorted.length - 1], sum, count: sorted.length };
}

function basicSentiment(text: string): "positive" | "negative" | "neutral" {
  const positive = ["good", "great", "excellent", "amazing", "love", "best", "happy", "satisfied", "wonderful", "fantastic", "awesome", "perfect", "helpful", "useful", "impressed", "enjoy", "pleased", "recommend", "outstanding", "superb", "nice", "fine", "better", "thank", "appreciate"];
  const negative = ["bad", "terrible", "worst", "hate", "poor", "awful", "horrible", "disappointed", "frustrating", "useless", "waste", "annoying", "ugly", "slow", "broken", "fail", "problem", "issue", "complaint", "unhappy", "sad", "angry", "dislike", "unfair"];
  const lower = text.toLowerCase();
  const posCount = positive.filter((w) => lower.includes(w)).length;
  const negCount = negative.filter((w) => lower.includes(w)).length;
  if (posCount > negCount) return "positive";
  if (negCount > posCount) return "negative";
  return "neutral";
}

function extractWordFrequency(texts: string[], topN = 20) {
  const stopWords = new Set(["the", "a", "an", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "shall", "can", "need", "dare", "ought", "used", "to", "of", "in", "for", "on", "with", "at", "by", "from", "as", "into", "through", "during", "before", "after", "above", "below", "between", "out", "off", "over", "under", "again", "further", "then", "once", "here", "there", "when", "where", "why", "how", "all", "both", "each", "few", "more", "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very", "just", "because", "but", "and", "or", "if", "while", "about", "it", "its", "this", "that", "these", "those", "i", "me", "my", "we", "our", "you", "your", "he", "him", "his", "she", "her", "they", "them", "their", "what", "which", "who", "whom"]);
  const freq: Record<string, number> = {};
  texts.forEach((text) => {
    const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter((w) => w.length > 2 && !stopWords.has(w));
    words.forEach((w) => { freq[w] = (freq[w] || 0) + 1; });
  });
  return Object.entries(freq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, topN)
    .map(([word, count]) => ({ word, count }));
}

function extractThemes(texts: string[]) {
  const themes: Record<string, { keywords: string[]; count: number; examples: string[] }> = {
    "Quality": { keywords: ["quality", "well-made", "durable", "solid", "cheap", "flimsy", "sturdy", "material"], count: 0, examples: [] },
    "Value": { keywords: ["price", "value", "expensive", "affordable", "cost", "worth", "money", "budget", "overpriced"], count: 0, examples: [] },
    "Service": { keywords: ["service", "staff", "support", "help", "response", "team", "customer", "representative"], count: 0, examples: [] },
    "Experience": { keywords: ["experience", "process", "easy", "difficult", "simple", "complicated", "smooth", "hassle", "intuitive", "confusing"], count: 0, examples: [] },
    "Satisfaction": { keywords: ["satisfied", "happy", "pleased", "delighted", "disappointed", "unhappy", "enjoy", "love"], count: 0, examples: [] },
    "Recommendation": { keywords: ["recommend", "suggest", "refer", "advise", "tell", "share", "tell others"], count: 0, examples: [] },
    "Feature": { keywords: ["feature", "function", "capability", "option", "setting", "ability", "design", "look", "appearance"], count: 0, examples: [] },
    "Performance": { keywords: ["fast", "slow", "speed", "performance", "efficient", "reliable", "crash", "bug", "error", "issue"], count: 0, examples: [] },
  };

  texts.forEach((text) => {
    const lower = text.toLowerCase();
    Object.values(themes).forEach((theme) => {
      if (theme.keywords.some((kw) => lower.includes(kw))) {
        theme.count++;
        if (theme.examples.length < 3) theme.examples.push(text.length > 120 ? text.slice(0, 120) + "..." : text);
      }
    });
  });

  return Object.entries(themes)
    .filter(([, t]) => t.count > 0)
    .sort(([, a], [, b]) => b.count - a.count)
    .map(([name, data]) => ({ name, ...data }));
}

export default function AnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const [survey, setSurvey] = useState<any>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [collectorFilter, setCollectorFilter] = useState("");
  const [textSearch, setTextSearch] = useState("");
  const [expandedText, setExpandedText] = useState<Record<string, boolean>>({});

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

  const overviewStats = useMemo(() => {
    if (filteredResponses.length === 0) return null;
    const now = new Date();
    const dates = filteredResponses.map((r: any) => new Date(r.createdAt).getTime());
    const first = new Date(Math.min(...dates));
    const last = new Date(Math.max(...dates));
    const daysSinceFirst = Math.max(1, Math.ceil((now.getTime() - first.getTime()) / 86400000));
    const daysBetween = Math.max(1, Math.ceil((last.getTime() - first.getTime()) / 86400000) + 1);

    const responsesPerDay: Record<string, number> = {};
    filteredResponses.forEach((r: any) => {
      const day = new Date(r.createdAt).toLocaleDateString();
      responsesPerDay[day] = (responsesPerDay[day] || 0) + 1;
    });
    const timeline = Object.entries(responsesPerDay)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const responsesPerHour: Record<number, number> = {};
    for (let i = 0; i < 24; i++) responsesPerHour[i] = 0;
    filteredResponses.forEach((r: any) => {
      const hour = new Date(r.createdAt).getHours();
      responsesPerHour[hour]++;
    });
    const hourlyDistribution = Object.entries(responsesPerHour).map(([hour, count]) => ({
      hour: `${hour}:00`, count,
    }));

    const offlineCount = filteredResponses.filter((r: any) => r.isOffline).length;
    const onlineCount = filteredResponses.length - offlineCount;

    const completionRate = filteredResponses.length > 0
      ? Math.round(
          (filteredResponses.filter((r: any) => {
            const requiredQs = questions.filter((q: any) => q.required);
            return requiredQs.every((q: any) => r.answers.some((a: any) => a.questionId === q.id));
          }).length / filteredResponses.length) * 100
        )
      : 0;

    return {
      total: filteredResponses.length,
      overallTotal: responses.length,
      rate: (filteredResponses.length / daysSinceFirst).toFixed(1),
      avgPerDay: (filteredResponses.length / daysBetween).toFixed(1),
      timeline,
      hourlyDistribution,
      offlineCount,
      onlineCount,
      completionRate,
      firstDate: first.toLocaleDateString(),
      lastDate: last.toLocaleDateString(),
    };
  }, [filteredResponses, questions, responses.length]);

  const questionAnalytics = useMemo(() => {
    return questions.map((q: any) => {
      const answers = filteredResponses
        .map((r: any) => r.answers.find((a: any) => a.questionId === q.id))
        .filter(Boolean);

      const responseRate = filteredResponses.length > 0
        ? Math.round((answers.length / filteredResponses.length) * 100)
        : 0;

      if (["MULTIPLE_CHOICE", "CHECKBOX", "DROPDOWN"].includes(q.type)) {
        const counts: Record<string, number> = {};
        answers.forEach((a: any) => {
          const values = Array.isArray(a.value) ? a.value : [String(a.value)];
          values.forEach((v: string) => { counts[v] = (counts[v] || 0) + 1; });
        });
        const total = Object.values(counts).reduce((a, b) => a + b, 0);
        const distribution = Object.entries(counts)
          .map(([name, count]) => ({ name, count, percentage: total > 0 ? Math.round((count / total) * 100) : 0 }))
          .sort((a, b) => b.count - a.count);
        const mode = distribution.length > 0 ? distribution[0].name : null;

        return {
          ...q,
          analyticsType: "categorical" as const,
          responseRate,
          distribution,
          mode,
          uniqueOptions: distribution.length,
          totalSelections: total,
        };
      }

      if (q.type === "RATING_SCALE") {
        const values = answers.map((a: any) => Number(a.value)).filter((v) => !isNaN(v));
        const stats = computeStats(values);
        const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        values.forEach((v) => { distribution[v] = (distribution[v] || 0) + 1; });
        const distData = Object.entries(distribution).map(([score, count]) => ({
          score: Number(score),
          count,
          percentage: values.length > 0 ? Math.round((count / values.length) * 100) : 0,
        }));

        return {
          ...q,
          analyticsType: "rating" as const,
          responseRate,
          stats,
          distribution: distData,
        };
      }

      if (q.type === "TEXT_INPUT") {
        const textValues = answers.map((a: any) => String(a.value)).filter(Boolean);
        const avgLength = textValues.length > 0
          ? Math.round(textValues.reduce((sum, t) => sum + t.length, 0) / textValues.length)
          : 0;
        const sentiments = textValues.map((t) => basicSentiment(t));
        const sentimentBreakdown = {
          positive: sentiments.filter((s) => s === "positive").length,
          negative: sentiments.filter((s) => s === "negative").length,
          neutral: sentiments.filter((s) => s === "neutral").length,
        };
        const sentimentTotal = sentiments.length || 1;
        const sentimentData = [
          { name: "Positive", value: sentimentBreakdown.positive, percentage: Math.round((sentimentBreakdown.positive / sentimentTotal) * 100) },
          { name: "Neutral", value: sentimentBreakdown.neutral, percentage: Math.round((sentimentBreakdown.neutral / sentimentTotal) * 100) },
          { name: "Negative", value: sentimentBreakdown.negative, percentage: Math.round((sentimentBreakdown.negative / sentimentTotal) * 100) },
        ].filter((d) => d.value > 0);
        const wordFrequency = extractWordFrequency(textValues);
        const themes = extractThemes(textValues);

        return {
          ...q,
          analyticsType: "text" as const,
          responseRate,
          avgLength,
          totalWords: textValues.join(" ").split(/\s+/).length,
          uniqueResponses: new Set(textValues).size,
          sentimentData,
          sentimentBreakdown,
          wordFrequency,
          themes,
          responses: textValues,
        };
      }

      if (q.type === "DATE_INPUT") {
        const dateValues = answers.map((a: any) => new Date(String(a.value))).filter((d) => !isNaN(d.getTime()));
        const distribution: Record<string, number> = {};
        dateValues.forEach((d) => {
          const month = d.toLocaleDateString("en-US", { year: "numeric", month: "short" });
          distribution[month] = (distribution[month] || 0) + 1;
        });
        const distData = Object.entries(distribution)
          .map(([month, count]) => ({ month, count }))
          .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

        return {
          ...q,
          analyticsType: "date" as const,
          responseRate,
          distribution: distData,
        };
      }

      return { ...q, analyticsType: "unknown" as const, responseRate };
    });
  }, [questions, filteredResponses]);

  const overallSentiment = useMemo(() => {
    const textQs = questionAnalytics.filter((q: any) => q.analyticsType === "text");
    if (textQs.length === 0) return null;
    const total = { positive: 0, negative: 0, neutral: 0 };
    textQs.forEach((q: any) => {
      total.positive += q.sentimentBreakdown.positive;
      total.negative += q.sentimentBreakdown.negative;
      total.neutral += q.sentimentBreakdown.neutral;
    });
    return total;
  }, [questionAnalytics]);

  const crossTabulation = useMemo(() => {
    const catQs = questionAnalytics.filter((q: any) => q.analyticsType === "categorical" && q.distribution.length <= 10);
    if (catQs.length < 2) return null;
    const q1 = catQs[0];
    const q2 = catQs[1];
    const matrix: Record<string, Record<string, number>> = {};
    q1.distribution.forEach((d: any) => { matrix[d.name] = {}; q2.distribution.forEach((d2: any) => { matrix[d.name][d2.name] = 0; }); });

    filteredResponses.forEach((r: any) => {
      const a1 = r.answers.find((a: any) => a.questionId === q1.id);
      const a2 = r.answers.find((a: any) => a.questionId === q2.id);
      if (a1 && a2) {
        const v1 = String(Array.isArray(a1.value) ? a1.value[0] : a1.value);
        const v2 = String(Array.isArray(a2.value) ? a2.value[0] : a2.value);
        if (matrix[v1] && matrix[v1][v2] !== undefined) matrix[v1][v2]++;
      }
    });

    return {
      question1: q1.text,
      question2: q2.text,
      data: q1.distribution.map((d: any) => ({
        name: d.name,
        ...Object.fromEntries(q2.distribution.map((d2: any) => [d2.name, matrix[d.name]?.[d2.name] || 0])),
      })),
      categories: q2.distribution.map((d: any) => d.name),
    };
  }, [questionAnalytics, filteredResponses]);

  const exportCSV = useCallback(() => {
    if (!survey || filteredResponses.length === 0) return;
    const headers = ["Response ID", "Date", "Channel", "Collector", ...questions.map((q: any) => q.text)];
    const rows = filteredResponses.map((r: any) => [
      r.id, new Date(r.createdAt).toLocaleString(), r.isOffline ? "Offline" : "Online",
      r.collector?.email || "Self",
      ...questions.map((q: any) => {
        const answer = r.answers.find((a: any) => a.questionId === q.id);
        if (!answer) return "";
        if (Array.isArray(answer.value)) return answer.value.join(", ");
        return String(answer.value);
      }),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${survey.title.replace(/\s+/g, "_")}_analytics.csv`; a.click(); URL.revokeObjectURL(url);
  }, [survey, filteredResponses, questions]);

  if (loading) {
    return <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  if (!survey) return null;

  const activeFilters = [dateFrom, dateTo, collectorFilter].filter(Boolean).length;
  const responseCount = filteredResponses.length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Research Analytics</h1>
          <p className="text-sm text-muted-foreground">{survey.title} &middot; {responseCount} of {responses.length} responses{activeFilters > 0 ? ` (${activeFilters} filters active)` : ""}</p>
        </div>
        <Button variant="outline" onClick={exportCSV} disabled={responseCount === 0} className="gap-2">
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
            <div className="space-y-1 flex-1 min-w-[200px]">
              <Label className="text-xs">Search text responses</Label>
              <Input placeholder="Search in text answers..." value={textSearch} onChange={(e) => setTextSearch(e.target.value)} className="w-full" />
            </div>
            {(dateFrom || dateTo || collectorFilter || textSearch) && (
              <Button variant="ghost" size="sm" onClick={() => { setDateFrom(""); setDateTo(""); setCollectorFilter(""); setTextSearch(""); }}>
                <Filter className="h-3 w-3 mr-1" /> Clear All
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {responseCount === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">{responses.length === 0 ? "No responses collected yet." : "No responses match the current filters."}</p>
            {responses.length === 0 && (
              <Link href={`/collect/${survey.id}`} target="_blank">
                <Button><ExternalLink className="h-4 w-4 mr-2" /> Open Survey Form</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="overview">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="overview"><Activity className="h-4 w-4 mr-1" /> Overview</TabsTrigger>
            <TabsTrigger value="quantitative"><BarChart3 className="h-4 w-4 mr-1" /> Quantitative</TabsTrigger>
            <TabsTrigger value="qualitative"><MessageSquare className="h-4 w-4 mr-1" /> Qualitative</TabsTrigger>
            <TabsTrigger value="cross"><Target className="h-4 w-4 mr-1" /> Cross-Analysis</TabsTrigger>
            <TabsTrigger value="data"><FileText className="h-4 w-4 mr-1" /> Raw Data</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div><p className="text-xs text-muted-foreground">Responses</p><p className="text-3xl font-bold">{overviewStats?.total}</p></div>
                    <Users className="h-6 w-6 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div><p className="text-xs text-muted-foreground">Avg/Day</p><p className="text-3xl font-bold">{overviewStats?.avgPerDay}</p></div>
                    <TrendingUp className="h-6 w-6 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div><p className="text-xs text-muted-foreground">Completion</p><p className="text-3xl font-bold">{overviewStats?.completionRate}%</p></div>
                    <Target className="h-6 w-6 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div><p className="text-xs text-muted-foreground">Online</p><p className="text-3xl font-bold">{overviewStats?.onlineCount}</p></div>
                    <Zap className="h-6 w-6 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div><p className="text-xs text-muted-foreground">Offline</p><p className="text-3xl font-bold">{overviewStats?.offlineCount}</p></div>
                    <Clock className="h-6 w-6 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {overallSentiment && (
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-4 w-4" /> Overall Sentiment</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6">
                    <div className="flex-1 h-6 bg-secondary rounded-full overflow-hidden flex">
                      {overallSentiment.positive > 0 && (
                        <div className="h-full bg-green-500 transition-all" style={{ width: `${(overallSentiment.positive / (overallSentiment.positive + overallSentiment.neutral + overallSentiment.negative)) * 100}%` }} />
                      )}
                      {overallSentiment.neutral > 0 && (
                        <div className="h-full bg-gray-400 transition-all" style={{ width: `${(overallSentiment.neutral / (overallSentiment.positive + overallSentiment.neutral + overallSentiment.negative)) * 100}%` }} />
                      )}
                      {overallSentiment.negative > 0 && (
                        <div className="h-full bg-red-500 transition-all" style={{ width: `${(overallSentiment.negative / (overallSentiment.positive + overallSentiment.neutral + overallSentiment.negative)) * 100}%` }} />
                      )}
                    </div>
                    <div className="flex gap-4 text-xs">
                      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" /> Positive {overallSentiment.positive}</span>
                      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-gray-400" /> Neutral {overallSentiment.neutral}</span>
                      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> Negative {overallSentiment.negative}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {overviewStats && overviewStats.timeline.length > 1 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Response Trend</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={overviewStats.timeline}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Area type="monotone" dataKey="count" stroke="#2563eb" fill="#2563eb20" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {overviewStats && (
              <Card>
                <CardHeader><CardTitle className="text-base">Hourly Distribution</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={overviewStats.hourlyDistribution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#9333ea" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {collectors.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Collector Performance</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {collectors.map((c) => (
                      <div key={c.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{c.name}</p>
                            <p className="text-xs text-muted-foreground">{c.email}</p>
                          </div>
                          <Badge variant="secondary">{Math.round((c.count / responseCount) * 100)}%</Badge>
                        </div>
                        <p className="text-3xl font-bold mt-2">{c.count}</p>
                        <p className="text-xs text-muted-foreground">responses collected</p>
                        <div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${(c.count / responseCount) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader><CardTitle className="text-base">Question Summary</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {questionAnalytics.map((q: any, i: number) => (
                    <div key={q.id} className="flex items-center gap-4 p-3 border rounded-lg">
                      <span className="text-sm font-medium text-muted-foreground w-8">Q{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{q.text}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-xs">{q.type.replace(/_/g, " ")}</Badge>
                          <span className="text-xs text-muted-foreground">{q.responseRate}% response rate</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {q.analyticsType === "categorical" && <span className="text-sm font-medium">{q.mode}</span>}
                        {q.analyticsType === "rating" && q.stats && <span className="text-sm font-medium">{q.stats.mean.toFixed(1)} <Star className="h-3 w-3 inline" /></span>}
                        {q.analyticsType === "text" && <span className="text-sm text-muted-foreground">{q.responses.length} texts</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quantitative" className="space-y-6">
            {questionAnalytics.filter((q: any) => q.analyticsType === "categorical").map((q: any) => (
              <Card key={q.id}>
                <CardHeader>
                  <CardTitle className="text-base">{q.text}</CardTitle>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-xs">{q.type.replace(/_/g, " ")}</Badge>
                    <Badge variant="secondary" className="text-xs">{q.responseRate}% response rate</Badge>
                    <Badge variant="secondary" className="text-xs">{q.uniqueOptions} options</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={q.distribution}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>{q.distribution.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="space-y-3">
                      {q.distribution.map((item: any) => (
                        <div key={item.name} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium truncate" title={item.name}>{item.name}</span>
                            <span className="text-muted-foreground">{item.count} ({item.percentage}%)</span>
                          </div>
                          <div className="h-3 bg-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${item.percentage}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {questionAnalytics.filter((q: any) => q.analyticsType === "rating").map((q: any) => (
              <Card key={q.id}>
                <CardHeader>
                  <CardTitle className="text-base">{q.text}</CardTitle>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-xs">Rating Scale</Badge>
                    <Badge variant="secondary" className="text-xs">{q.responseRate}% response rate</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {q.stats && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="lg:col-span-1 space-y-4">
                        <div className="text-center p-4 bg-secondary/50 rounded-lg">
                          <p className="text-5xl font-bold text-primary">{q.stats.mean.toFixed(1)}</p>
                          <p className="text-sm text-muted-foreground mt-1">Mean Rating</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="text-center p-3 bg-secondary/50 rounded-lg">
                            <p className="text-2xl font-bold">{q.stats.median}</p>
                            <p className="text-xs text-muted-foreground">Median</p>
                          </div>
                          <div className="text-center p-3 bg-secondary/50 rounded-lg">
                            <p className="text-2xl font-bold">{q.stats.mode.join(", ")}</p>
                            <p className="text-xs text-muted-foreground">Mode</p>
                          </div>
                          <div className="text-center p-3 bg-secondary/50 rounded-lg">
                            <p className="text-2xl font-bold">{q.stats.stdDev.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">Std Dev</p>
                          </div>
                          <div className="text-center p-3 bg-secondary/50 rounded-lg">
                            <p className="text-2xl font-bold">{q.stats.min}–{q.stats.max}</p>
                            <p className="text-xs text-muted-foreground">Range</p>
                          </div>
                        </div>
                      </div>
                      <div className="lg:col-span-2">
                        <ResponsiveContainer width="100%" height={280}>
                          <BarChart data={q.distribution}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="score" />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Bar dataKey="count" radius={[4, 4, 0, 0]}>{q.distribution.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Bar>
                          </BarChart>
                        </ResponsiveContainer>
                        <div className="mt-3 space-y-2">
                          {q.distribution.map((d: any) => (
                            <div key={d.score} className="flex items-center gap-3">
                              <span className="text-sm font-medium w-8">{d.score}★</span>
                              <div className="flex-1 h-3 bg-secondary rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${d.percentage}%` }} />
                              </div>
                              <span className="text-xs text-muted-foreground w-20 text-right">{d.count} ({d.percentage}%)</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {questionAnalytics.filter((q: any) => q.analyticsType === "date").map((q: any) => (
              <Card key={q.id}>
                <CardHeader>
                  <CardTitle className="text-base">{q.text}</CardTitle>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-xs">Date</Badge>
                    <Badge variant="secondary" className="text-xs">{q.responseRate}% response rate</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={q.distribution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#0891b2" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="qualitative" className="space-y-6">
            {questionAnalytics.filter((q: any) => q.analyticsType === "text").length === 0 && (
              <Card>
                <CardContent className="py-8 text-center">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No text questions in this survey.</p>
                </CardContent>
              </Card>
            )}

            {questionAnalytics.filter((q: any) => q.analyticsType === "text").map((q: any) => {
              const displayResponses = textSearch
                ? q.responses.filter((r: string) => r.toLowerCase().includes(textSearch.toLowerCase()))
                : q.responses;
              return (
                <Card key={q.id}>
                  <CardHeader>
                    <CardTitle className="text-base">{q.text}</CardTitle>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-xs">Text Input</Badge>
                      <Badge variant="secondary" className="text-xs">{q.responses.length} responses</Badge>
                      <Badge variant="secondary" className="text-xs">Avg {q.avgLength} chars</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="space-y-3">
                        <p className="text-sm font-medium">Sentiment Analysis</p>
                        {q.sentimentData.length > 0 ? (
                          <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                              <Pie data={q.sentimentData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}>
                                {q.sentimentData.map((_: any, i: number) => (
                                  <Cell key={i} fill={q.sentimentData[i].name === "Positive" ? "#16a34a" : q.sentimentData[i].name === "Negative" ? "#dc2626" : "#9ca3af"} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <p className="text-sm text-muted-foreground">No data</p>
                        )}
                      </div>
                      <div className="space-y-3">
                        <p className="text-sm font-medium">Key Themes</p>
                        <div className="space-y-2">
                          {q.themes.length > 0 ? q.themes.map((t: any) => (
                            <div key={t.name} className="p-2 bg-secondary/50 rounded-lg">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">{t.name}</span>
                                <Badge variant="secondary" className="text-xs">{t.count}</Badge>
                              </div>
                            </div>
                          )) : (
                            <p className="text-sm text-muted-foreground">No themes detected</p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-3">
                        <p className="text-sm font-medium">Top Words</p>
                        <div className="space-y-1">
                          {q.wordFrequency.slice(0, 10).map((w: any) => (
                            <div key={w.word} className="flex items-center gap-2">
                              <span className="text-sm w-24 truncate">{w.word}</span>
                              <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                                <div className="h-full bg-primary/70 rounded-full" style={{ width: `${(w.count / q.wordFrequency[0].count) * 100}%` }} />
                              </div>
                              <span className="text-xs text-muted-foreground w-6 text-right">{w.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium">Individual Responses ({displayResponses.length})</p>
                        {textSearch && <p className="text-xs text-muted-foreground">Filtered by: &quot;{textSearch}&quot;</p>}
                      </div>
                      <div className="space-y-2 max-h-[500px] overflow-y-auto">
                        {displayResponses.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No matching responses</p>
                        ) : (
                          displayResponses.map((text: string, i: number) => {
                            const sentiment = basicSentiment(text);
                            const sentimentColor = sentiment === "positive" ? "border-l-green-500" : sentiment === "negative" ? "border-l-red-500" : "border-l-gray-300";
                            return (
                              <div key={i} className={`text-sm p-3 bg-secondary/50 rounded-lg border-l-4 ${sentimentColor}`}>
                                <div className="flex items-start justify-between gap-2">
                                  <p className="flex-1">{textSearch ? highlightText(text, textSearch) : text}</p>
                                  <Badge variant={sentiment === "positive" ? "success" : sentiment === "negative" ? "destructive" : "secondary"} className="text-xs shrink-0">
                                    {sentiment}
                                  </Badge>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="cross" className="space-y-6">
            {!crossTabulation ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Target className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">Cross-analysis requires at least 2 categorical questions with 10 or fewer options each.</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Cross-Tabulation</CardTitle>
                  <p className="text-sm text-muted-foreground">{crossTabulation.question1} vs {crossTabulation.question2}</p>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 font-medium">{crossTabulation.question1}</th>
                          {crossTabulation.categories.map((cat: string) => (
                            <th key={cat} className="text-center p-2 font-medium">{cat}</th>
                          ))}
                          <th className="text-center p-2 font-medium">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {crossTabulation.data.map((row: any) => {
                          const rowTotal = crossTabulation.categories.reduce((sum: number, cat: string) => sum + (row[cat] || 0), 0);
                          return (
                            <tr key={row.name} className="border-b">
                              <td className="p-2 font-medium">{row.name}</td>
                              {crossTabulation.categories.map((cat: string) => (
                                <td key={cat} className="text-center p-2">
                                  <span className={row[cat] > 0 ? "font-medium" : "text-muted-foreground"}>{row[cat] || 0}</span>
                                </td>
                              ))}
                              <td className="text-center p-2 font-medium">{rowTotal}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader><CardTitle className="text-base">Question Comparison</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {questionAnalytics.filter((q: any) => q.analyticsType === "categorical").length >= 2 && (
                    <ResponsiveContainer width="100%" height={350}>
                      <RadarChart data={
                        questionAnalytics
                          .filter((q: any) => q.analyticsType === "categorical")
                          .slice(0, 2)
                          .flatMap((q: any, qi: number) =>
                            q.distribution.slice(0, 5).map((d: any) => ({
                              subject: d.name.length > 15 ? d.name.slice(0, 15) + "..." : d.name,
                              [`Q${qi + 1}`]: d.percentage,
                            }))
                          )
                      }>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                        <PolarRadiusAxis tick={{ fontSize: 10 }} />
                        <Radar name="Q1" dataKey="Q1" stroke="#2563eb" fill="#2563eb20" />
                        <Radar name="Q2" dataKey="Q2" stroke="#16a34a" fill="#16a34a20" />
                        <Legend />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  )}
                  <div className="space-y-4">
                    <p className="text-sm font-medium">Key Insights</p>
                    {questionAnalytics.filter((q: any) => q.analyticsType === "rating").map((q: any) => (
                      <div key={q.id} className="p-3 bg-secondary/50 rounded-lg">
                        <p className="text-sm font-medium">{q.text}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {q.stats && `Mean: ${q.stats.mean.toFixed(1)} | Median: ${q.stats.median} | SD: ${q.stats.stdDev.toFixed(2)} | n=${q.stats.count}`}
                        </p>
                      </div>
                    ))}
                    {questionAnalytics.filter((q: any) => q.analyticsType === "categorical").map((q: any) => (
                      <div key={q.id} className="p-3 bg-secondary/50 rounded-lg">
                        <p className="text-sm font-medium">{q.text}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Top choice: {q.mode} ({q.distribution[0]?.percentage}%) | {q.uniqueOptions} unique options
                        </p>
                      </div>
                    ))}
                    {overallSentiment && (
                      <div className="p-3 bg-secondary/50 rounded-lg">
                        <p className="text-sm font-medium">Text Response Summary</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {overallSentiment.positive} positive | {overallSentiment.neutral} neutral | {overallSentiment.negative} negative
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="data" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">All Responses ({filteredResponses.length})</CardTitle>
                  <Button variant="outline" size="sm" onClick={exportCSV} disabled={filteredResponses.length === 0} className="gap-1">
                    <Download className="h-3 w-3" /> Export CSV
                  </Button>
                </div>
              </CardHeader>
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
                        <tr key={r.id} className="border-b hover:bg-secondary/30">
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
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function highlightText(text: string, search: string) {
  if (!search) return text;
  const parts = text.split(new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === search.toLowerCase() ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}
