import { createContext, useContext } from "react";
export const DietApiContext = createContext("/api");
export const useDietApi = () => useContext(DietApiContext);
