import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
export type ShoppingPreferences = {
  cycle: string;
  weekday: number;
  monthDay: number;
  nextPurchase: string;
};
export function useShoppingPreferences(userId: string) {
  return useQuery({
    queryKey: ["shopping-preferences", userId],
    queryFn: () => api<ShoppingPreferences>("/api/shopping/preferences"),
    retry: false,
    staleTime: 0,
  });
}
export function nextPurchase(
  from: string,
  cycle: string,
  weekday: number,
  monthDay: number,
) {
  const date = new Date(from + "T12:00:00Z");
  if (cycle === "WEEKLY") {
    const delta = (weekday - date.getUTCDay() + 7) % 7 || 7;
    date.setUTCDate(date.getUTCDate() + delta);
  } else {
    const month = date.getUTCMonth(),
      year = date.getUTCFullYear();
    const candidate = new Date(
      Date.UTC(
        year,
        month,
        Math.min(monthDay, new Date(Date.UTC(year, month + 1, 0)).getUTCDate()),
        12,
      ),
    );
    if (candidate > date) return candidate.toISOString().slice(0, 10);
    date.setUTCDate(1);
    date.setUTCMonth(month + 1);
    date.setUTCDate(
      Math.min(
        monthDay,
        new Date(
          Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
        ).getUTCDate(),
      ),
    );
  }
  return date.toISOString().slice(0, 10);
}
