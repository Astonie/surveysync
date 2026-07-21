export type QuestionType =
  | "MULTIPLE_CHOICE"
  | "CHECKBOX"
  | "TEXT_INPUT"
  | "RATING_SCALE"
  | "DROPDOWN"
  | "DATE_INPUT";

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
  isPublished: boolean;
  isActive: boolean;
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
  isPublished: boolean;
  isActive: boolean;
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
