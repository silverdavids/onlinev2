import {
  adaptActiveMatchesResponse,
  adaptActiveMatchesResponseWithMeta,
} from "@/src/adapters/activeMatchesAdapters";
import { activeMatchesGet } from "@/src/api/activeMatchesApiClient";
import type {
  ActiveMatchesAdaptationResult,
  ActiveMatchViewModel,
} from "@/src/types/activeMatchesViewModels";

export const activeMatchesApi = {
  getActiveMatchesResult: async (
    signal?: AbortSignal
  ): Promise<ActiveMatchesAdaptationResult> => {
    const response = await activeMatchesGet<unknown>("/", { signal });
    return adaptActiveMatchesResponseWithMeta(response);
  },
  getActiveMatches: async (
    signal?: AbortSignal
  ): Promise<ActiveMatchViewModel[]> => {
    const response = await activeMatchesGet<unknown>("/", { signal });
    return adaptActiveMatchesResponse(response);
  },
};
