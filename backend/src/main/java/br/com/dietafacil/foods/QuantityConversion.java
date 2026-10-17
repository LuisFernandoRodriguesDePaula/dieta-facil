package br.com.dietafacil.foods;

import java.math.BigDecimal;
import static br.com.dietafacil.foods.FoodTypes.*;

/** Exact unit conversion only. Food state/rendiment is never inferred. */
public final class QuantityConversion {
    private QuantityConversion() {}
    public static BigDecimal convert(BigDecimal quantity, Unit from, Unit to) {
        if (quantity == null || quantity.signum() <= 0) {
            throw new IllegalArgumentException("Informe uma quantidade positiva.");
        }
        if (from == null || to == null || from.dimension() != to.dimension()) {
            throw new IllegalArgumentException("Não é possível converter unidades de dimensões diferentes.");
        }
        if (from.dimension() == Dimension.COUNT && quantity.stripTrailingZeros().scale() > 0) {
            throw new IllegalArgumentException("A quantidade em unidades deve ser inteira.");
        }
        return quantity.multiply(from.factor()).divide(to.factor()).stripTrailingZeros();
    }
}
