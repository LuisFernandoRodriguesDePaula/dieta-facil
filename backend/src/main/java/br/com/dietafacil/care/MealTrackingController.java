package br.com.dietafacil.care;

import static br.com.dietafacil.domain.DomainAccess.error;

import br.com.dietafacil.domain.DomainAccess;
import br.com.dietafacil.inventory.*;
import br.com.dietafacil.plans.*;
import br.com.dietafacil.plans.PlanDtos.ItemInput;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import tools.jackson.databind.ObjectMapper;

@RestController
public class MealTrackingController {
  private final DomainAccess access;
  private final PlanService plans;
  private final InventoryService stock;
  private final FeatureService features;
  private final ObjectMapper json;

  public MealTrackingController(
      DomainAccess access,
      PlanService plans,
      InventoryService stock,
      FeatureService features,
      ObjectMapper json) {
    this.access = access;
    this.plans = plans;
    this.stock = stock;
    this.features = features;
    this.json = json;
  }

  public record Checkin(
      @NotNull UUID requestId,
      @NotNull LocalDate date,
      @NotNull UUID mealId,
      @NotEmpty @Size(max = 40) List<@NotNull @Valid ItemInput> items) {}

  public record Undo(@NotNull UUID id) {}

  public record Result(UUID id, String mode, String message) {}

  @PostMapping("/api/meals/checkins")
  @Transactional
  public Result checkin(Authentication auth, @Valid @RequestBody Checkin input) {
    var email = auth.getName();
    var owner = access.lock(email);
    var request = json.writeValueAsString(input);
    var previous =
        access.db.queryForList(
            "select * from meal_checkins where id=? and user_id=?", input.requestId(), owner);
    if (!previous.isEmpty()) {
      if (!previous.getFirst().get("request").equals(request))
        throw error(409, "Registro já utilizado com outros dados.");
      return new Result(
          input.requestId(), (String) previous.getFirst().get("mode"), "Refeição já registrada.");
    }
    if (input.date().isAfter(access.today(email)))
      throw error(400, "A refeição ainda está no futuro.");
    var meal =
        plans.occurrences(owner, input.date()).stream()
            .filter(m -> m.mealId().equals(input.mealId()))
            .findFirst()
            .orElseThrow(() -> error(404, "Refeição não encontrada."));
    if (!meal.status().equals("PENDING")) throw error(409, "Esta refeição já foi registrada.");
    var expected =
        meal.items().stream()
            .map(
                i ->
                    i.foodId()
                        + ":"
                        + i.basis()
                        + ":"
                        + new BigDecimal(i.quantity()).stripTrailingZeros().toPlainString()
                        + ":"
                        + i.unit())
            .sorted()
            .toList();
    var received =
        input.items().stream()
            .map(
                i -> {
                  var f = access.food(owner, i.foodId(), false);
                  return i.foodId()
                      + ":"
                      + i.basis()
                      + ":"
                      + access
                          .canonical(i.quantity(), i.unit(), f)
                          .stripTrailingZeros()
                          .toPlainString()
                      + ":"
                      + f.unit().baseUnit();
                })
            .sorted()
            .toList();
    if (!expected.equals(received))
      throw error(409, "A dieta mudou. Atualize a tela antes de registrar.");
    boolean active = features.get(owner).inventoryEnabled();
    UUID operation = null;
    if (active)
      operation =
          stock
              .consume(
                  email,
                  input.requestId().toString(),
                  new InventoryDtos.Consume(
                      input.date(),
                      input.mealId(),
                      input.items().stream()
                          .map(
                              i ->
                                  new InventoryDtos.Actual(
                                      i.foodId(), i.basis(), i.quantity(), i.unit()))
                          .toList()))
              .operationId();
    else
      plans.store(
          owner,
          new PlanDtos.Occurrence(
              meal.id(),
              meal.mealId(),
              meal.date(),
              meal.name(),
              meal.time(),
              "CONSUMED",
              meal.items()));
    var mode = active ? "INVENTORY" : "ONLY";
    access.db.update(
        "insert into meal_checkins values (?,?,?,?,?,?,false)",
        input.requestId(),
        owner,
        meal.id(),
        request,
        mode,
        operation);
    return new Result(
        input.requestId(),
        mode,
        active
            ? "Refeição registrada e estoque atualizado."
            : "Refeição registrada. Nenhum item de estoque foi movimentado.");
  }

  @PostMapping("/api/meals/checkins/undo")
  @Transactional
  public Result undo(Authentication auth, @Valid @RequestBody Undo input) {
    var owner = access.lock(auth.getName());
    var rows =
        access.db.queryForList(
            "select * from meal_checkins where id=? and user_id=?", input.id(), owner);
    if (rows.isEmpty()) throw error(404, "Registro não encontrado.");
    var row = rows.getFirst();
    var mode = (String) row.get("mode");
    if (Boolean.TRUE.equals(row.get("undone")))
      return new Result(input.id(), mode, "Registro já desfeito.");
    if (mode.equals("INVENTORY")) {
      if (!features.get(owner).inventoryEnabled())
        throw error(
            409, "Reative o estoque após conferir os saldos para desfazer uma baixa anterior.");
      stock.reverse(
          auth.getName(),
          "undo-" + input.id(),
          new InventoryDtos.Reversal((UUID) row.get("operation_id")));
    } else if (access.db.update(
            "delete from meal_occurrences where user_id=? and id=? and status='CONSUMED'",
            owner,
            row.get("occurrence_id"))
        != 1) throw error(409, "Este registro já foi alterado.");
    access.db.update(
        "update meal_checkins set undone=true where id=? and user_id=?", input.id(), owner);
    return new Result(input.id(), mode, "Registro desfeito.");
  }
}
