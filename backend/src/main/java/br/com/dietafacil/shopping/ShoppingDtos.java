package br.com.dietafacil.shopping;
import br.com.dietafacil.foods.FoodTypes.*;
import br.com.dietafacil.inventory.InventoryDtos;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.*;
import java.util.*;
public final class ShoppingDtos {
 private ShoppingDtos(){}
 public record Row(UUID foodId,String name,Basis basis,Unit unit,String demand,String available,String covered,String shortage,LocalDate firstShortage,String knowledge,boolean unknownExpiry,String frequency) {}
 public record Projection(LocalDate from,LocalDate until,List<Row> rows,String sourceHash,List<String> warnings) {}
 public record Generate(@NotNull LocalDate from,@NotNull LocalDate until) {}
 public record Update(@NotNull @PositiveOrZero Long version,@NotNull Map<@NotBlank String,@NotNull @Pattern(regexp="0|[0-9]{1,13}(\\.[0-9]{1,6})?") String> adjustments,@NotNull @Pattern(regexp="DRAFT|PARTIAL|COMPLETED|CANCELLED") String status) {}
 public record Recalculate(@NotNull @PositiveOrZero Long version) {}
 public record Receipt(UUID listId,@NotNull @Valid InventoryDtos.Entry entry) {}
 public record ShoppingList(UUID id,long version,String status,Projection projection,Map<String,String> adjustments,Map<String,String> received,boolean stale,Instant createdAt) {}
}

