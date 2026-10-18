package br.com.dietafacil.plans;

import static br.com.dietafacil.foods.FoodTypes.*;
import static br.com.dietafacil.inventory.InventoryDtos.*;
import static br.com.dietafacil.plans.SubstitutionDtos.*;
import static org.assertj.core.api.Assertions.*;

import br.com.dietafacil.account.*;
import br.com.dietafacil.auth.*;
import br.com.dietafacil.domain.DomainAccess;
import br.com.dietafacil.foods.*;
import br.com.dietafacil.inventory.InventoryService;
import br.com.dietafacil.shopping.ShoppingService;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class SubstitutionServiceTest {
  @Autowired AuthService auth;
  @Autowired FoodService foods;
  @Autowired PlanService plans;
  @Autowired SubstitutionService swaps;
  @Autowired InventoryService stock;
  @Autowired ShoppingService shopping;
  @Autowired DomainAccess access;
  @Autowired AccountService accounts;

  record Fixture(String email, UUID meal, UUID eggs, UUID chicken, LocalDate date) {}

  @Test
  void accountDeletionRemovesRulesOverridesAndActionsOnlyForOwner() {
    var f = fixture();
    var other = fixture();
    configure(f);
    configure(other);
    swaps.swap(f.email, command(f, Scope.ONCE));
    var owner = access.owner(f.email);
    accounts.delete(f.email, new AccountDtos.Delete("Senha-ficticia-2026!", "EXCLUIR"));
    for (var table :
        List.of("meal_substitution_rules", "meal_overrides", "meal_substitution_actions"))
      assertThat(
              access.db.queryForObject(
                  "select count(*) from " + table + " where user_id=?", Long.class, owner))
          .isZero();
    assertThat(swaps.options(other.email, other.date, other.meal, 0).enabled()).isTrue();
  }

  Fixture fixture() {
    var email = "swap-" + UUID.randomUUID() + "@example.invalid";
    auth.register(new AuthDtos.Registration("Teste", "" + email, "Senha-ficticia-2026!", "UTC"));
    var eggs =
        foods
            .create(
                email, new FoodDtos.Create("Ovos", Unit.UNIT, Category.PROTEIN, Frequency.WEEKLY))
            .id();
    var chicken =
        foods
            .create(
                email, new FoodDtos.Create("Frango", Unit.G, Category.PROTEIN, Frequency.WEEKLY))
            .id();
    var date = LocalDate.now(ZoneOffset.UTC);
    var meal = UUID.randomUUID();
    plans.save(
        email,
        new PlanDtos.Save(0L, date, List.of(input(meal, eggs, "2", Unit.UNIT, Basis.AS_SOLD))));
    return new Fixture(email, meal, eggs, chicken, date);
  }

  PlanDtos.MealInput input(UUID meal, UUID food, String qty, Unit unit, Basis basis) {
    return new PlanDtos.MealInput(
        meal,
        "Café",
        LocalTime.of(7, 30),
        Set.of(1, 2, 3, 4, 5, 6, 7),
        List.of(new PlanDtos.ItemInput(food, new BigDecimal(qty), unit, basis)));
  }

  Options configure(Fixture f) {
    var old = swaps.options(f.email, f.date, f.meal, 0);
    return swaps.save(
        f.email,
        new RuleSave(
            f.date,
            f.meal,
            0,
            old.fingerprint(),
            old.version(),
            true,
            List.of(
                new PlanDtos.ItemInput(f.chicken, new BigDecimal("0.09"), Unit.KG, Basis.COOKED))));
  }

  Swap command(Fixture f, Scope scope) {
    var options = swaps.options(f.email, f.date, f.meal, 0);
    return new Swap(
        UUID.randomUUID(), f.date, f.meal, 0, options.fingerprint(), options.version(), 0, scope);
  }

  @Test
  void oneDaySwapUpdatesShoppingWithoutMovingStockAndUndoRestoresDemand() {
    var f = fixture();
    configure(f);
    var before = shopping.projection(f.email, f.date, f.date.plusDays(2));
    var command = command(f, Scope.ONCE);
    var result = swaps.swap(f.email, command);
    assertThat(swaps.swap(f.email, command).actionId()).isEqualTo(result.actionId());
    assertThat(plans.schedule(f.email, f.date).meals().getFirst().items().getFirst().foodId())
        .isEqualTo(f.chicken);
    assertThat(
            plans
                .schedule(f.email, f.date.plusDays(1))
                .meals()
                .getFirst()
                .items()
                .getFirst()
                .foodId())
        .isEqualTo(f.eggs);
    var after = shopping.projection(f.email, f.date, f.date.plusDays(2));
    assertThat(after.sourceHash()).isNotEqualTo(before.sourceHash());
    assertThat(after.rows())
        .anySatisfy(
            r -> {
              assertThat(r.foodId()).isEqualTo(f.chicken);
              assertThat(r.demand()).isEqualTo("90");
            });
    assertThat(stock.snapshot(f.email).history()).isEmpty();
    swaps.undo(f.email, result.actionId());
    assertThat(shopping.projection(f.email, f.date, f.date.plusDays(2)).rows())
        .isEqualTo(before.rows());
    assertThat(swaps.undo(f.email, result.actionId()).message()).contains("já desfeita");
  }

  @Test
  void recurringSwapPreservesScheduledRevisionAndUndoIsVersionGuarded() {
    var f = fixture();
    configure(f);
    plans.save(
        f.email,
        new PlanDtos.Save(
            1L, f.date.plusDays(3), List.of(input(f.meal, f.eggs, "3", Unit.UNIT, Basis.AS_SOLD))));
    var result = swaps.swap(f.email, command(f, Scope.NEXT));
    assertThat(
            plans
                .schedule(f.email, f.date.plusDays(1))
                .meals()
                .getFirst()
                .items()
                .getFirst()
                .foodId())
        .isEqualTo(f.chicken);
    assertThat(
            plans
                .schedule(f.email, f.date.plusDays(3))
                .meals()
                .getFirst()
                .items()
                .getFirst()
                .quantity())
        .isEqualTo("3");
    swaps.undo(f.email, result.actionId());
    assertThat(
            plans
                .schedule(f.email, f.date.plusDays(1))
                .meals()
                .getFirst()
                .items()
                .getFirst()
                .foodId())
        .isEqualTo(f.eggs);
    var again = swaps.swap(f.email, command(f, Scope.NEXT));
    var plan = plans.plan(f.email, f.date);
    plans.save(
        f.email,
        new PlanDtos.Save(
            plan.version(), f.date, List.of(input(f.meal, f.eggs, "4", Unit.UNIT, Basis.AS_SOLD))));
    assertThatThrownBy(() -> swaps.undo(f.email, again.actionId())).hasMessageContaining("409");
  }

  @Test
  void disabledRulesStaleSnapshotsAndForeignFoodsAreRejected() {
    var f = fixture();
    var other = fixture();
    var old = configure(f);
    var command = command(f, Scope.ONCE);
    swaps.save(
        f.email,
        new RuleSave(
            f.date,
            f.meal,
            0,
            old.fingerprint(),
            old.version(),
            false,
            List.of(
                new PlanDtos.ItemInput(f.chicken, new BigDecimal("90"), Unit.G, Basis.COOKED))));
    assertThatThrownBy(() -> swaps.swap(f.email, command)).hasMessageContaining("409");
    var current = swaps.options(f.email, f.date, f.meal, 0);
    assertThatThrownBy(
            () ->
                swaps.save(
                    f.email,
                    new RuleSave(
                        f.date,
                        f.meal,
                        0,
                        current.fingerprint(),
                        current.version(),
                        true,
                        List.of(
                            new PlanDtos.ItemInput(
                                other.chicken, new BigDecimal("90"), Unit.G, Basis.COOKED)))))
        .hasMessageContaining("404");
    var valid = configure(f);
    var stale = command(f, Scope.ONCE);
    plans.save(
        f.email,
        new PlanDtos.Save(
            1L, f.date, List.of(input(f.meal, f.eggs, "3", Unit.UNIT, Basis.AS_SOLD))));
    assertThat(swaps.options(f.email, f.date, f.meal, 0).enabled()).isFalse();
    assertThatThrownBy(() -> swaps.swap(f.email, stale)).hasMessageContaining("409");
    assertThatThrownBy(
            () ->
                swaps.save(
                    f.email,
                    new RuleSave(
                        f.date, f.meal, 0, valid.fingerprint(), valid.version(), false, List.of())))
        .hasMessageContaining("409");
    assertThatThrownBy(() -> swaps.options(other.email, f.date, f.meal, 0))
        .hasMessageContaining("404");
  }

  @Test
  void consumptionDebitsOnlyReplacementAndReverseKeepsDaySwap() {
    var f = fixture();
    configure(f);
    stock.entry(
        f.email,
        UUID.randomUUID().toString(),
        new Entry(
            f.chicken,
            Basis.COOKED,
            new BigDecimal("180"),
            Unit.G,
            Location.FRIDGE,
            Condition.PREPARED,
            f.date,
            null,
            ExpirySource.UNKNOWN,
            null,
            f.date,
            Knowledge.KNOWN));
    var swap = swaps.swap(f.email, command(f, Scope.ONCE));
    assertThat(swaps.options(f.email, f.date, f.meal, 0).source().foodId()).isEqualTo(f.chicken);
    var result =
        stock.consume(
            f.email,
            UUID.randomUUID().toString(),
            new Consume(
                f.date,
                f.meal,
                List.of(new Actual(f.chicken, Basis.COOKED, new BigDecimal("90"), Unit.G))));
    assertThat(stock.snapshot(f.email).lots().getFirst().quantity()).isEqualTo("90");
    assertThatThrownBy(() -> swaps.undo(f.email, swap.actionId())).hasMessageContaining("409");
    stock.reverse(f.email, UUID.randomUUID().toString(), new Reversal(result.operationId()));
    assertThat(plans.schedule(f.email, f.date).meals().getFirst().items().getFirst().foodId())
        .isEqualTo(f.chicken);
    swaps.undo(f.email, swap.actionId());
    assertThat(stock.snapshot(f.email).lots().getFirst().quantity()).isEqualTo("180");
  }

  @Test
  void cannotRewritePastOrSkippedMealsAndArchivedAlternativeIsBlocked() {
    var f = fixture();
    configure(f);
    var command = command(f, Scope.ONCE);
    plans.skip(f.email, new PlanDtos.Skip(f.date, f.meal, true));
    assertThatThrownBy(() -> swaps.swap(f.email, command)).hasMessageContaining("409");
    plans.skip(f.email, new PlanDtos.Skip(f.date, f.meal, false));
    access.db.update(
        "update foods set archived_at=? where id=?",
        java.sql.Timestamp.from(Instant.now()),
        f.chicken);
    assertThat(swaps.options(f.email, f.date, f.meal, 0).alternatives().getFirst().selectable())
        .isFalse();
    assertThatThrownBy(() -> swaps.swap(f.email, command)).hasMessageContaining("409");
    var yesterday = f.date.minusDays(1);
    assertThatThrownBy(
            () ->
                swaps.swap(
                    f.email,
                    new Swap(
                        UUID.randomUUID(),
                        yesterday,
                        f.meal,
                        0,
                        command.fingerprint(),
                        command.ruleVersion(),
                        0,
                        Scope.ONCE)))
        .hasMessageContaining("404");
  }
}
