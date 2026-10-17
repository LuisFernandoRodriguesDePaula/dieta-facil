export type Unit = "G" | "KG" | "ML" | "L" | "UNIT";
export type Category =
  "PRODUCE" | "PROTEIN" | "GRAINS" | "DAIRY" | "PANTRY" | "OTHER";
export type Frequency = "WEEKLY" | "MONTHLY";
export type Basis = "RAW" | "COOKED" | "AS_SOLD";
export type Food = {
  id: string;
  name: string;
  unit: Unit;
  baseUnit: Unit;
  dimension: "MASS" | "VOLUME" | "COUNT";
  category: Category;
  purchaseFrequency: Frequency;
  archivedAt: string | null;
  version: number;
};
export type FoodListing = {
  items: Food[];
  page: number;
  totalPages: number;
  totalElements: number;
};
export const units: Record<Unit, string> = {
  G: "g",
  KG: "kg",
  ML: "ml",
  L: "L",
  UNIT: "unidade",
};
export const categories: Record<Category, string> = {
  PRODUCE: "Hortifruti",
  PROTEIN: "Proteínas",
  GRAINS: "Grãos e cereais",
  DAIRY: "Laticínios",
  PANTRY: "Despensa",
  OTHER: "Outros",
};
export const frequencies: Record<Frequency, string> = {
  WEEKLY: "Semanal",
  MONTHLY: "Mensal",
};
export const bases: Record<Basis, string> = {
  RAW: "Cru",
  COOKED: "Cozido / preparado",
  AS_SOLD: "Como vendido",
};
export function compatibleUnits(unit: Unit): Unit[] {
  return unit === "UNIT"
    ? ["UNIT"]
    : ["G", "KG"].includes(unit)
      ? ["G", "KG"]
      : ["ML", "L"];
}
