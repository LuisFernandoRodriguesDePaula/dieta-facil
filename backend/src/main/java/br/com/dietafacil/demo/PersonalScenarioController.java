package br.com.dietafacil.demo;

import static br.com.dietafacil.domain.DomainAccess.error;
import static br.com.dietafacil.foods.FoodTypes.*;
import static br.com.dietafacil.inventory.InventoryDtos.*;

import br.com.dietafacil.domain.DomainAccess;
import br.com.dietafacil.foods.*;
import br.com.dietafacil.inventory.*;
import br.com.dietafacil.plans.*;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.*;
import java.util.*;
import org.springframework.context.annotation.Profile;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@Profile("!prod")
public class PersonalScenarioController {
  private final DomainAccess access;
  private final FoodService foods;
  private final InventoryService stock;
  private final PlanService plans;

  public PersonalScenarioController(
      DomainAccess access, FoodService foods, InventoryService stock, PlanService plans) {
    this.access = access;
    this.foods = foods;
    this.stock = stock;
    this.plans = plans;
  }

  @PostMapping("/api/onboarding/scenario")
  @Transactional
  public Map<String, String> create(Authentication auth) {
    var email = auth.getName();
    var owner = access.lock(email);
    if (access.db.queryForObject(
            "select count(*) from demo_scenarios where user_id=?", Long.class, owner)
        > 0) return Map.of("message", "O cenário fictício já foi carregado nesta conta.");
    if (foods.list(email, "", false, 0, 1).totalElements() > 0
        || foods.list(email, "", true, 0, 1).totalElements() > 0
        || !plans.plan(email, access.today(email)).revisionDates().isEmpty())
      throw error(409, "Use uma conta vazia para carregar o cenário fictício.");
    var today = access.today(email);
    var eggs = food(email, "Ovos", Unit.UNIT, Category.PROTEIN);
    var rice = food(email, "Arroz", Unit.G, Category.GRAINS);
    var chicken = food(email, "Frango", Unit.G, Category.PROTEIN);
    var banana = food(email, "Banana", Unit.UNIT, Category.PRODUCE);
    var oats = food(email, "Aveia", Unit.G, Category.GRAINS);
    plans.save(
        email,
        new PlanDtos.Save(
            0L,
            today,
            List.of(
                meal(
                    "Café da manhã",
                    7,
                    30,
                    List.of(
                        item(eggs, "2", Unit.UNIT, Basis.AS_SOLD),
                        item(oats, "40", Unit.G, Basis.AS_SOLD))),
                meal(
                    "Almoço",
                    12,
                    30,
                    List.of(
                        item(rice, "150", Unit.G, Basis.COOKED),
                        item(chicken, "150", Unit.G, Basis.COOKED))),
                meal("Lanche", 16, 0, List.of(item(banana, "1", Unit.UNIT, Basis.AS_SOLD))),
                meal(
                    "Jantar",
                    19,
                    30,
                    List.of(
                        item(rice, "150", Unit.G, Basis.COOKED),
                        item(chicken, "150", Unit.G, Basis.COOKED))))));
    add(
        email,
        "demo-eggs",
        eggs,
        Basis.AS_SOLD,
        "8",
        Unit.UNIT,
        today,
        today.plusDays(5),
        Location.FRIDGE);
    add(email, "demo-rice-raw", rice, Basis.RAW, "1000", Unit.G, today, null, Location.PANTRY);
    add(
        email,
        "demo-rice-cooked",
        rice,
        Basis.COOKED,
        "300",
        Unit.G,
        today,
        today.plusDays(1),
        Location.FRIDGE);
    add(
        email,
        "demo-chicken-raw",
        chicken,
        Basis.RAW,
        "600",
        Unit.G,
        today,
        today.plusDays(2),
        Location.FRIDGE);
    add(
        email,
        "demo-chicken-cooked",
        chicken,
        Basis.COOKED,
        "200",
        Unit.G,
        today,
        today.plusDays(1),
        Location.FRIDGE);
    add(
        email,
        "demo-banana",
        banana,
        Basis.AS_SOLD,
        "3",
        Unit.UNIT,
        today,
        today.plusDays(2),
        Location.PANTRY);
    add(email, "demo-oats", oats, Basis.AS_SOLD, "500", Unit.G, today, null, Location.PANTRY);
    access.db.update(
        "insert into demo_scenarios values (?,?)", owner, Timestamp.from(Instant.now()));
    return Map.of(
        "message",
        "Cenário fictício carregado. Quantidades e validades são exemplos para demonstração, não"
            + " orientações alimentares.");
  }

  private UUID food(String email, String name, Unit unit, Category category) {
    return foods.create(email, new FoodDtos.Create(name, unit, category, Frequency.WEEKLY)).id();
  }

  private PlanDtos.ItemInput item(UUID food, String qty, Unit unit, Basis basis) {
    return new PlanDtos.ItemInput(food, new BigDecimal(qty), unit, basis);
  }

  private PlanDtos.MealInput meal(
      String name, int hour, int minute, List<PlanDtos.ItemInput> items) {
    return new PlanDtos.MealInput(
        UUID.randomUUID(), name, LocalTime.of(hour, minute), Set.of(1, 2, 3, 4, 5, 6, 7), items);
  }

  private void add(
      String email,
      String key,
      UUID food,
      Basis basis,
      String qty,
      Unit unit,
      LocalDate today,
      LocalDate expiry,
      Location location) {
    var prepared = basis == Basis.COOKED;
    stock.entry(
        email,
        key,
        new Entry(
            food,
            basis,
            new BigDecimal(qty),
            unit,
            location,
            prepared ? Condition.PREPARED : Condition.SEALED,
            today,
            expiry,
            expiry == null ? ExpirySource.UNKNOWN : ExpirySource.USER,
            null,
            prepared ? today : null,
            Knowledge.KNOWN));
  }
}
