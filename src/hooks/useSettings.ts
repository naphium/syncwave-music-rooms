import { queryOptions, useQuery } from "@tanstack/react-query";
import { DEFAULT_SETTINGS, getSettings } from "@/lib/settings.functions";

export const settingsQuery = queryOptions({ queryKey: ["settings"], queryFn: () => getSettings(), staleTime: 60_000 });
export function useSettings() {
  return useQuery(settingsQuery).data ?? DEFAULT_SETTINGS;
}
