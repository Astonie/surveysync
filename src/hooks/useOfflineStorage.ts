"use client";

import { useCallback } from "react";
import { db } from "@/offline/db";
import type { Question } from "@/types";

export function useOfflineStorage() {
  const saveSurveyLocally = useCallback(
    async (survey: {
      id: string;
      title: string;
      description: string | null;
      questions: Question[];
    }) => {
      await db.surveys.put({
        id: survey.id,
        title: survey.title,
        description: survey.description,
        questions: JSON.stringify(survey.questions),
        isPublished: true,
        syncedAt: new Date().toISOString(),
      });
    },
    []
  );

  const getSurveyLocally = useCallback(async (id: string) => {
    const survey = await db.surveys.get(id);
    if (!survey) return null;

    return {
      ...survey,
      questions: JSON.parse(survey.questions) as Question[],
    };
  }, []);

  const getAllLocalSurveys = useCallback(async () => {
    const surveys = await db.surveys.toArray();
    return surveys.map((s) => ({
      ...s,
      questions: JSON.parse(s.questions) as Question[],
    }));
  }, []);

  const saveResponseLocally = useCallback(
    async (response: {
      id: string;
      surveyId: string;
      answers: { questionId: string; value: string | number | string[] }[];
    }) => {
      await db.responses.put({
        id: response.id,
        surveyId: response.surveyId,
        answers: JSON.stringify(response.answers),
        createdAt: new Date().toISOString(),
        synced: false,
      });
    },
    []
  );

  const getUnsyncedResponses = useCallback(async () => {
    const responses = await db.responses.where("synced").equals(false as any).toArray();
    return responses.map((r) => ({
      ...r,
      answers: JSON.parse(r.answers),
    }));
  }, []);

  const markResponseSynced = useCallback(async (id: string) => {
    await db.responses.update(id, { synced: true });
  }, []);

  const getLocalResponseCount = useCallback(async (surveyId: string) => {
    const count = await db.responses.where("surveyId").equals(surveyId).count();
    return count;
  }, []);

  return {
    saveSurveyLocally,
    getSurveyLocally,
    getAllLocalSurveys,
    saveResponseLocally,
    getUnsyncedResponses,
    markResponseSynced,
    getLocalResponseCount,
  };
}
