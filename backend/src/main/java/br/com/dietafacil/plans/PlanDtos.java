package br.com.dietafacil.plans;

import br.com.dietafacil.foods.FoodTypes.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;

public final class PlanDtos {
 private PlanDtos() {}
 public record ItemInput(@NotNull UUID foodId,@NotNull @DecimalMin(value="0",inclusive=false) @Digits(integer=12,fraction=6) BigDecimal quantity,@NotNull Unit unit,@NotNull Basis basis) {}
 public record MealInput(UUID id,@NotBlank @Size(max=100) String name,@NotNull LocalTime time,
  @NotEmpty @Size(max=7) Set<@NotNull @Min(1) @Max(7) Integer> days,@NotEmpty @Size(max=40) List<@NotNull @Valid ItemInput> items) {}
 public record Save(@NotNull @PositiveOrZero Long version,@NotNull LocalDate effectiveFrom,@Size(max=20) @NotNull List<@NotNull @Valid MealInput> meals) {}
 public record Item(UUID foodId,String name,String quantity,Unit unit,Basis basis,String category,String frequency) {}
 public record Meal(UUID id,String name,String time,Set<Integer> days,List<Item> items) {}
 public record Plan(long version,LocalDate effectiveFrom,List<Meal> meals,List<LocalDate> revisionDates) {}
 public record Occurrence(UUID id,UUID mealId,LocalDate date,String name,String time,String status,List<Item> items) {}
 public record Schedule(LocalDate date,String timezone,List<Occurrence> meals) {}
 public record Skip(@NotNull LocalDate date,@NotNull UUID mealId,@NotNull Boolean skipped) {}
}


