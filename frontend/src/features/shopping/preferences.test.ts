import { it, expect } from "vitest";
import { nextPurchase } from "./preferences";
it("calcula a próxima segunda sem repetir o próprio dia", () => {
  expect(nextPurchase("2026-10-19", "WEEKLY", 1, 1)).toBe("2026-10-26");
  expect(nextPurchase("2026-10-18", "WEEKLY", 1, 1)).toBe("2026-10-19");
});
it("ajusta o dia 31 ao último dia do mês e atravessa o ano", () => {
  expect(nextPurchase("2026-01-31", "MONTHLY", 1, 31)).toBe("2026-02-28");
  expect(nextPurchase("2026-12-31", "MONTHLY", 1, 31)).toBe("2027-01-31");
});
