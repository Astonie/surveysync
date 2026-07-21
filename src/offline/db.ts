import { Dexie, type Table } from "dexie";

interface OfflineSurveyRecord {
  id: string;
  title: string;
  description: string | null;
  questions: string;
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

  constructor() {
    super("survey-sync");
    this.version(1).stores({
      surveys: "id, status",
      responses: "id, surveyId, synced",
      syncQueue: "++id, entityType, entityId",
    });
  }
}

export const db = new SurveySyncDB();
