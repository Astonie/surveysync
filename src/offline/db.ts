import Dexie, { type EntityTable } from "dexie";

export interface DexieSurvey {
  id: string;
  title: string;
  description: string | null;
  questions: string;
  isPublished: boolean;
  syncedAt: string | null;
}

export interface DexieResponse {
  id: string;
  surveyId: string;
  answers: string;
  createdAt: string;
  synced: boolean;
}

export interface DexieSyncQueue {
  id: number;
  entityType: string;
  entityId: string;
  action: string;
  payload: string;
  createdAt: string;
  attempts: number;
}

const db = new Dexie("SurveySyncDB") as Dexie & {
  surveys: EntityTable<DexieSurvey, "id">;
  responses: EntityTable<DexieResponse, "id">;
  syncQueue: EntityTable<DexieSyncQueue, "id">;
};

db.version(1).stores({
  surveys: "id, title, syncedAt",
  responses: "id, surveyId, synced, createdAt",
  syncQueue: "++id, entityType, entityId, action, createdAt",
});

export { db };
