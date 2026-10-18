import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { Food, FoodListing } from "./food-types";
async function loadFoods() {
  const result: Food[] = [];
  let page = 0;
  let total = 1;
  while (page < total) {
    const data = await api<FoodListing>("/api/foods?size=100&page=" + page);
    result.push(...data.items);
    total = data.totalPages;
    page++;
  }
  return result;
}
export function useFoods(userId: string) {
  return useQuery({
    queryKey: ["all-foods", userId],
    queryFn: loadFoods,
    retry: false,
    staleTime: 0,
  });
}
