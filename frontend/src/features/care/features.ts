import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
export type Features = {
  role: "CLIENT" | "NUTRITIONIST";
  tier: "BASIC" | "PREMIUM";
  inventoryAllowed: boolean;
  inventoryEnabled: boolean;
  reviewRequired: boolean;
};
export const useFeatures = () =>
  useQuery({
    queryKey: ["features"],
    queryFn: () => api<Features>("/api/features"),
    retry: false,
  });
