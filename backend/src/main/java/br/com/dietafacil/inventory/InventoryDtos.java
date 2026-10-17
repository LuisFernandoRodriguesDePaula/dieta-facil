package br.com.dietafacil.inventory;

import br.com.dietafacil.foods.FoodTypes.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;

public final class InventoryDtos {
 private InventoryDtos() {}
 public enum Location { PANTRY,FRIDGE,FREEZER }
 public enum Condition { SEALED,OPENED,PREPARED }
 public enum ExpirySource { LABEL,USER,ESTIMATE,UNKNOWN }
 public enum Knowledge { KNOWN,UNKNOWN,PARTIAL }
 public record Entry(@NotNull UUID foodId,@NotNull Basis basis,
  @NotNull @DecimalMin(value="0",inclusive=false) @Digits(integer=12,fraction=6) BigDecimal quantity,
  @NotNull Unit unit,@NotNull Location location,@NotNull Condition condition,
  @NotNull LocalDate receivedDate,LocalDate expiry,@NotNull ExpirySource expirySource,
  LocalDate openedDate,LocalDate preparedDate,@NotNull Knowledge knowledge) {}
 public record KnowledgeInput(@NotNull UUID foodId,@NotNull Basis basis,@NotNull Knowledge knowledge) {}
 public record Discard(@NotNull UUID lotId,@NotNull @DecimalMin(value="0",inclusive=false) @Digits(integer=12,fraction=6) BigDecimal quantity,@NotNull Unit unit,@NotBlank @Size(max=200) String reason) {}
 public record Prepare(@NotNull UUID foodId,
  @NotNull @DecimalMin(value="0",inclusive=false) @Digits(integer=12,fraction=6) BigDecimal inputQuantity,
  @NotNull Unit inputUnit,@NotNull @Valid Entry output) {}
 public record Actual(@NotNull UUID foodId,@NotNull Basis basis,@NotNull @DecimalMin(value="0",inclusive=false) @Digits(integer=12,fraction=6) BigDecimal quantity,@NotNull Unit unit) {}
 public record Consume(@NotNull LocalDate date,@NotNull UUID mealId,@NotEmpty @Size(max=40) List<@NotNull @Valid Actual> items) {}
 public record Reversal(@NotNull UUID operationId) {}
 public record Lot(UUID id,UUID foodId,String name,Basis basis,String quantity,Unit unit,Location location,
  Condition condition,LocalDate receivedDate,LocalDate expiry,ExpirySource expirySource,
  LocalDate openedDate,LocalDate preparedDate,long version) {}
 public record Account(UUID foodId,String name,Basis basis,Knowledge knowledge,Unit unit,String quantity) {}
 public record Movement(UUID lotId,String foodName,Basis basis,String delta,Unit unit) {}
 public record Operation(UUID id,String kind,Instant createdAt,UUID sourceId,UUID reversalOf,boolean reversed,List<Movement> movements) {}
 public record Snapshot(List<Lot> lots,List<Account> accounts,List<Operation> history) {}
 public record Result(UUID operationId,String message) {}
}

