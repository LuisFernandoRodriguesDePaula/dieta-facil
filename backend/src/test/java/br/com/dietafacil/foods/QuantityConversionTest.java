package br.com.dietafacil.foods;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import static br.com.dietafacil.foods.FoodTypes.Unit.*;
import static org.assertj.core.api.Assertions.*;

class QuantityConversionTest {
    @Test
    void convertsMassAndVolumeExactlyWithoutFloatingPointOrRounding() {
        var grams = QuantityConversion.convert(new BigDecimal("1"), KG, G).add(new BigDecimal("500"));
        assertThat(QuantityConversion.convert(grams, G, KG)).isEqualByComparingTo("1.5");
        assertThat(QuantityConversion.convert(new BigDecimal("0.125"), L, ML)).isEqualByComparingTo("125");
        assertThat(QuantityConversion.convert(new BigDecimal("0.000001"), G, KG).toPlainString()).isEqualTo("0.000000001");
    }

    @Test
    void doesNotConvertIncompatibleDimensions() {
        assertThatThrownBy(() -> QuantityConversion.convert(BigDecimal.ONE, G, ML)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> QuantityConversion.convert(BigDecimal.ONE, UNIT, G)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void countRequiresIntegerAndPositiveQuantities() {
        assertThat(QuantityConversion.convert(new BigDecimal("2.000"), UNIT, UNIT)).isEqualByComparingTo("2");
        assertThatThrownBy(() -> QuantityConversion.convert(new BigDecimal("0.5"), UNIT, UNIT)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> QuantityConversion.convert(BigDecimal.ZERO, G, KG)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> QuantityConversion.convert(new BigDecimal("-1"), G, KG)).isInstanceOf(IllegalArgumentException.class);
    }
}
