import { Dexie, type Table } from "dexie";

interface OfflineSurveyRecord {
  id: string;
  title: string;
  description: string | null;
  sections: string;
  status: string;
  syncedAt: string | null;
}

interface OfflineResponseRecord {
  id: string;
  surveyId: string;
  answers: string;
  createdAt: string;
  synced: boolean;
}

interface SessionRecord {
  key: "current";
  user: string;
  expiresAt: string;
  updatedAt: string;
}

interface CacheRecord {
  key: string;
  value: string;
  updatedAt: string;
}

export type { OfflineSurveyRecord, OfflineResponseRecord, SessionRecord, CacheRecord };

interface SyncQueueRecord {
  id?: number;
  entityType: string;
  entityId: string;
  action: string;
  payload: string;
  createdAt: string;
  attempts: number;
}

class SurveySyncDB extends Dexie {
  surveys!: Table<OfflineSurveyRecord>;
  responses!: Table<OfflineResponseRecord>;
  syncQueue!: Table<SyncQueueRecord>;
  session!: Table<SessionRecord>;
  cache!: Table<CacheRecord>;

  constructor() {
    super("survey-sync");
    this.version(1).stores({
      surveys: "id, status",
      responses: "id, surveyId, synced",
      syncQueue: "++id, entityType, entityId",
    });
    this.version(2).stores({
      surveys: "id, status",
      responses: "id, surveyId, synced",
      syncQueue: "++id, entityType, entityId",
      session: "key",
      cache: "key",
    });
  }
}

export const db = new SurveySyncDB();
