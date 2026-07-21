export type QuestionType =
  | "MULTIPLE_CHOICE"
  | "CHECKBOX"
  | "TEXT_INPUT"
  | "RATING_SCALE"
  | "DROPDOWN"
  | "DATE_INPUT";

export type SurveyStatus = "draft" | "active" | "paused" | "closed";

export interface Question {
  id: string;
  surveyId: string;
  type: QuestionType;
  text: string;
  required: boolean;
  options: string[] | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Survey {
  id: string;
  title: string;
  description: string | null;
  questions: Question[];
  responses: Response[];
  createdBy: string;
  status: SurveyStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface SurveyListItem {
  id: string;
  title: string;
  description: string | null;
  _count: {
    questions: number;
    responses: number;
  };
  status: SurveyStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Response {
  id: string;
  surveyId: string;
  answers: Answer[];
  submittedBy: string | null;
  isOffline: boolean;
  syncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Answer {
  id: string;
  responseId: string;
  questionId: string;
  value: string | number | string[];
  createdAt: Date;
}

export interface SyncLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  payload: unknown;
  syncedAt: Date | null;
  createdAt: Date;
}

export interface OfflineSurvey {
  id: string;
  title: string;
  description: string | null;
  questions: Question[];
  syncedAt: Date | null;
}

export interface OfflineResponse {
  id: string;
  surveyId: string;
  answers: { questionId: string; value: string | number | string[] }[];
  createdAt: Date;
  synced: boolean;
}

export type SyncStatus = "idle" | "syncing" | "error" | "success";

export interface SyncResult {
  success: boolean;
  pushed: number;
  pulled: number;
  conflicts: number;
  errors: string[];
}

export const SURVEY_STATUS_CONFIG: Record<SurveyStatus, { label: string; color: string; badge: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" }> = {
  draft: { label: "Draft", color: "text-gray-500", badge: "secondary" },
  active: { label: "Active", color: "text-green-600", badge: "success" },
  paused: { label: "Paused", color: "text-yellow-600", badge: "warning" },
  closed: { label: "Closed", color: "text-red-600", badge: "destructive" },
};
