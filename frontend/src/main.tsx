import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import AuthRoutes from "./features/auth/AuthRoutes.tsx";
import "./global-theme.css";
document.documentElement.classList.add("dieta-themed");
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000 } },
});
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
