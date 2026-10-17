package br.com.dietafacil.foods;

import java.math.BigDecimal;

public final class FoodTypes {
    private FoodTypes() {}
    public enum Dimension { MASS, VOLUME, COUNT }
    public enum Category { PRODUCE, PROTEIN, GRAINS, DAIRY, PANTRY, OTHER }
    public enum Frequency { WEEKLY, MONTHLY }
    public enum Basis { RAW, COOKED, AS_SOLD }
    public enum Unit {
        G(Dimension.MASS, "1"), KG(Dimension.MASS, "1000"),
        ML(Dimension.VOLUME, "1"), L(Dimension.VOLUME, "1000"),
        UNIT(Dimension.COUNT, "1");

        private final Dimension dimension;
        private final BigDecimal factor;
        Unit(Dimension dimension, String factor) {
            this.dimension = dimension;
            this.factor = new BigDecimal(factor);
        }
        public Dimension dimension() { return dimension; }
        public BigDecimal factor() { return factor; }
        public Unit baseUnit() {
            return switch (dimension) { case MASS -> G; case VOLUME -> ML; case COUNT -> UNIT; };
        }
    }
}
