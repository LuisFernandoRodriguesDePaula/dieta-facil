package br.com.dietafacil.foods;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import static br.com.dietafacil.foods.FoodTypes.*;

public final class FoodDtos {
    private FoodDtos() {}
    public record Create(
        @NotBlank @Size(max = 120) String name,
        @NotNull Unit unit, @NotNull Category category, @NotNull Frequency purchaseFrequency
    ) {}
    public record Update(
        @NotBlank @Size(max = 120) String name,
        @NotNull Unit unit, @NotNull Category category, @NotNull Frequency purchaseFrequency,
        @NotNull @PositiveOrZero Long version
    ) {}
    public record Archive(@NotNull Boolean archived, @NotNull @PositiveOrZero Long version) {}
    public record View(UUID id, String name, Unit unit, Unit baseUnit, Dimension dimension,
                       Category category, Frequency purchaseFrequency, Instant archivedAt, long version) {
        static View from(Food food) {
            return new View(food.getId(), food.getName(), food.getUnit(), food.getUnit().baseUnit(),
                food.getUnit().dimension(), food.getCategory(), food.getPurchaseFrequency(), food.getArchivedAt(), food.getVersion());
        }
    }
    public record Listing(List<View> items, int page, int totalPages, long totalElements) {}
    public record Convert(
        @NotNull @DecimalMin(value = "0", inclusive = false) @Digits(integer = 12, fraction = 6) BigDecimal quantity,
        @NotNull Unit from, @NotNull Unit to, @NotNull Basis basis
    ) {}
    public record Conversion(String quantity, Unit unit, Basis basis) {}
}
