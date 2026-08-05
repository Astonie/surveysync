import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";

const MARGIN = 48;
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const FONT_SIZE = 10;
const LINE_HEIGHT = 14;

export interface PdfReportQuestion {
  id: string;
  text: string;
  type: string;
}

export interface PdfReportAnswer {
  questionId: string;
  value: string | number | string[];
}

export interface PdfReportResponse {
  createdAt: string | Date;
  submittedBy?: string | null;
  isOffline?: boolean;
  answers: PdfReportAnswer[];
}

export interface PdfReportData {
  surveyTitle: string;
  surveyDescription?: string | null;
  generatedAt: Date;
  questions: PdfReportQuestion[];
  responses: PdfReportResponse[];
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = String(text).split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function addPage(doc: PDFDocument, font: PDFFont): PDFPage {
  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  page.drawText(
    "SurveySync",
    { x: MARGIN, y: PAGE_HEIGHT - 40, size: 9, font, color: rgb(0.4, 0.45, 0.55) }
  );
  return page;
}

function formatAnswer(value: string | number | string[]): string {
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

export async function buildResponsesPdf(data: PdfReportData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page = addPage(doc, font);
  let y = PAGE_HEIGHT - 88;

  const ensureSpace = (needed: number) => {
    if (y - needed < MARGIN) {
      page = addPage(doc, font);
      y = PAGE_HEIGHT - 64;
    }
  };

  page.drawText(data.surveyTitle, { x: MARGIN, y: y, size: 22, font: bold, color: rgb(0.1, 0.1, 0.2) });
  y -= 22;
  if (data.surveyDescription) {
    page.drawText(data.surveyDescription, {
      x: MARGIN,
      y,
      size: 10,
      font,
      color: rgb(0.3, 0.3, 0.38),
      maxWidth: CONTENT_WIDTH,
      lineHeight: 13,
    });
    y -= 26;
  }

  const generated = `Report generated ${data.generatedAt.toISOString()} - ${data.responses.length} response${data.responses.length === 1 ? "" : "s"}`;
  page.drawText(generated, { x: MARGIN, y, size: 9, font, color: rgb(0.45, 0.45, 0.5) });
  y -= 34;

  const questionById = new Map(data.questions.map((q) => [q.id, q]));

  data.responses.forEach((response, index) => {
    const title = `Response ${index + 1}`;
    const subtitleLines = [
      `Submitted: ${new Date(response.createdAt).toISOString()}`,
      response.submittedBy ? `Collected by: ${response.submittedBy}` : "Collected by: Self (public link)",
      response.isOffline ? "Channel: Offline" : "Channel: Online",
    ];
    const titleHeight = 16 + subtitleLines.length * 12 + 8;
    ensureSpace(titleHeight + 40);

    page.drawText(title, { x: MARGIN, y, size: 12, font: bold, color: rgb(0.15, 0.15, 0.3) });
    y -= 16;
    for (const line of subtitleLines) {
      page.drawText(line, { x: MARGIN, y, size: 9, font, color: rgb(0.45, 0.45, 0.5) });
      y -= 12;
    }
    y -= 6;

    for (const answer of response.answers) {
      const question = questionById.get(answer.questionId);
      const questionText = question ? question.text : answer.questionId;
      const questionLines = wrapText(questionText, font, FONT_SIZE, CONTENT_WIDTH);
      const answerLines = wrapText(formatAnswer(answer.value), font, FONT_SIZE, CONTENT_WIDTH);
      const blockHeight = questionLines.length * LINE_HEIGHT + answerLines.length * LINE_HEIGHT + 6;
      ensureSpace(blockHeight + 6);

      page.drawText("Q:", { x: MARGIN, y, size: FONT_SIZE, font: bold, color: rgb(0.2, 0.2, 0.25) });
      for (const line of questionLines) {
        page.drawText(line, { x: MARGIN + 20, y, size: FONT_SIZE, font: bold, color: rgb(0.2, 0.2, 0.25) });
        y -= LINE_HEIGHT;
      }
      page.drawText("A:", { x: MARGIN, y, size: FONT_SIZE, font, color: rgb(0.25, 0.4, 0.3) });
      for (const line of answerLines) {
        page.drawText(line, { x: MARGIN + 20, y, size: FONT_SIZE, font, color: rgb(0.25, 0.4, 0.3) });
        y -= LINE_HEIGHT;
      }
      y -= 4;
    }
    y -= 10;
  });

  return doc.save();
}
