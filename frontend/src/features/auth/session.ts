import { useQuery } from "@tanstack/react-query";
import { ApiError, api } from "../../lib/api";

export type Profile = {
  id: string;
  name: string;
  email: string;
  timezone: string;
  role: "CLIENT" | "NUTRITIONIST";
};
export const sessionKey = ["session"];
export function useSession() {
  return useQuery<Profile | null>({
    queryKey: sessionKey,
    queryFn: async () => {
      try {
        return await api<Profile>("/api/me");
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
    retry: false,
    staleTime: 0,
  });
}
