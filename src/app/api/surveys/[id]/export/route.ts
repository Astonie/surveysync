import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import { buildXlsx, ExcelCell } from "@/lib/excel";
import { buildResponsesPdf, PdfReportResponse, PdfReportQuestion } from "@/lib/pdf";
import { JsonValue } from "@prisma/client/runtime/library";

const EXPORT_FORMATS = ["xlsx", "json", "pdf", "csv"] as const;
type ExportFormat = (typeof EXPORT_FORMATS)[number];

function safeFilename(title: string): string {
  const cleaned = title.replace(/[^a-z0-9_-]+/gi, "_").replace(/^_+|_+$/g, "");
  return cleaned || "survey";
}

function toCsvValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = Array.isArray(value) ? value.join(", ") : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function questionLabel(q: { text: string; id: string }): string {
  return q.text || q.id;
}

function toExcelValue(value: JsonValue): ExcelCell {
  if (value === null) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) return value.join(", ");
  return JSON.stringify(value);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const format = (request.nextUrl.searchParams.get("format") || "xlsx") as ExportFormat;
    if (!EXPORT_FORMATS.includes(format)) {
      return NextResponse.json({ error: "Invalid export format" }, { status: 400 });
    }

    const { id } = await params;
    const survey = await prisma.survey.findUnique({
      where: { id, createdBy: user.id },
      include: { questions: true },
    });
    if (!survey) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const from = request.nextUrl.searchParams.get("from");
    const to = request.nextUrl.searchParams.get("to");
    const collectorId = request.nextUrl.searchParams.get("collectorId");
    const where: Prisma.ResponseWhereInput = { surveyId: id };
    const dateFilter: Prisma.DateTimeFilter = {};
    if (from && !isNaN(new Date(`${from}T00:00:00`).getTime())) {
      dateFilter.gte = new Date(`${from}T00:00:00`);
    }
    if (to && !isNaN(new Date(`${to}T23:59:59.999`).getTime())) {
      dateFilter.lte = new Date(`${to}T23:59:59.999`);
    }
    if (dateFilter.gte !== undefined || dateFilter.lte !== undefined) {
      where.createdAt = dateFilter;
    }
    if (collectorId) {
      where.submittedById = collectorId;
    }

    const responses = await prisma.response.findMany({
      where,
      include: {
        answers: true,
        collector: { select: { id: true, email: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const questions = [...survey.questions].sort((a, b) => a.order - b.order);
    const filename = safeFilename(survey.title);
    const disposition = `attachment; filename="${filename}-responses.${format}"`;

    if (format === "json") {
      const data = {
        survey: {
          id: survey.id,
          title: survey.title,
          description: survey.description,
          status: survey.status,
          createdAt: survey.createdAt,
          updatedAt: survey.updatedAt,
        },
        questions: questions.map((q) => ({
          id: q.id,
          text: q.text,
          type: q.type,
          required: q.required,
          options: q.options,
        })),
        responses: responses.map((r) => ({
          id: r.id,
          submittedAt: r.createdAt,
          isOffline: r.isOffline,
          syncedAt: r.syncedAt,
          collector: r.collector ? { email: r.collector.email, name: r.collector.name } : null,
          answers: r.answers.map((a) => ({
            questionId: a.questionId,
            value: a.value,
          })),
        })),
        exportedAt: new Date().toISOString(),
      };
      return new NextResponse(JSON.stringify(data, null, 2), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": disposition,
        },
      });
    }

    if (format === "csv") {
      const headers = [
        "Response ID",
        "Date",
        "Channel",
        "Collector",
        ...questions.map(questionLabel),
      ];
      const rows = responses.map((r) => [
        r.id,
        r.createdAt.toISOString(),
        r.isOffline ? "Offline" : "Online",
        r.collector?.email || "Self",
        ...questions.map((q) => {
          const answer = r.answers.find((a) => a.questionId === q.id);
          if (!answer) return "";
          return Array.isArray(answer.value) ? answer.value.join(", ") : String(answer.value);
        }),
      ]);
      const csv = "\uFEFF" + [headers, ...rows].map((row) => row.map(toCsvValue).join(",")).join("\r\n");
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": disposition,
        },
      });
    }

    if (format === "xlsx") {
      const headerRow: ExcelCell[] = [
        "Response ID",
        "Date",
        "Channel",
        "Collector",
        ...questions.map(questionLabel),
      ];
      const dataRows: ExcelCell[][] = responses.map((r) => [
        r.id,
        r.createdAt,
        r.isOffline ? "Offline" : "Online",
        r.collector?.email || "Self",
        ...questions.map((q) => {
          const answer = r.answers.find((a) => a.questionId === q.id);
          if (!answer) return null;
          return toExcelValue(answer.value);
        }),
      ]);
      const buffer = buildXlsx([headerRow, ...dataRows]);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": disposition,
        },
      });
    }

    const pdfQuestions: PdfReportQuestion[] = questions.map((q) => ({
      id: q.id,
      text: q.text,
      type: q.type,
    }));
    const pdfResponses: PdfReportResponse[] = responses.map((r) => ({
      createdAt: r.createdAt,
      submittedBy: r.collector?.email || r.collector?.name,
      isOffline: r.isOffline,
      answers: r.answers.map((a) => ({
        questionId: a.questionId,
        value: a.value as string | number | string[],
      })),
    }));
    const pdf = await buildResponsesPdf({
      surveyTitle: survey.title,
      surveyDescription: survey.description,
      generatedAt: new Date(),
      questions: pdfQuestions,
      responses: pdfResponses,
    });
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": disposition,
      },
    });
  } catch (error) {
    console.error("Failed to export responses:", error);
    return NextResponse.json({ error: "Failed to export responses" }, { status: 500 });
  }
}
