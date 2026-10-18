package br.com.dietafacil.plans;

import br.com.dietafacil.foods.FoodTypes.*;
import br.com.dietafacil.plans.PlanDtos.ItemInput;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.util.*;

public final class SubstitutionDtos {
  private SubstitutionDtos() {}

  public enum Scope {
    ONCE,
    NEXT
  }

  public record RuleSave(
      @NotNull LocalDate date,
      @NotNull UUID mealId,
      @Min(0) int itemIndex,
      @NotBlank String fingerprint,
      @PositiveOrZero long version,
      boolean enabled,
      @NotNull @Size(max = 10) List<@NotNull @Valid ItemInput> alternatives) {}

  public record Alternative(
      PlanDtos.Item item,
      String available,
      String knowledge,
      boolean selectable,
      String blockedReason) {}

  public record Options(
      String fingerprint,
      long version,
      boolean enabled,
      PlanDtos.Item source,
      List<Alternative> alternatives) {}

  public record Swap(
      @NotNull UUID requestId,
      @NotNull LocalDate date,
      @NotNull UUID mealId,
      @Min(0) int itemIndex,
      @NotBlank String fingerprint,
      @PositiveOrZero long ruleVersion,
      @Min(0) int alternativeIndex,
      @NotNull Scope scope) {}

  public record Undo(@NotNull UUID actionId) {}

  public record Result(UUID actionId, String message) {}
}
