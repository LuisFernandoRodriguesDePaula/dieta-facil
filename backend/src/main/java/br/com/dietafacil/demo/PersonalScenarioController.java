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
  public Map<String, String> create(
      Authentication auth, @RequestParam(defaultValue = "basic") String type) {
    if (!Set.of("basic", "hypertrophy").contains(type)) throw error(400, "Cenário desconhecido.");
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
    if (type.equals("hypertrophy")) {
      createHypertrophy(email, today);
      access.db.update(
          "insert into demo_scenarios values (?,?)", owner, Timestamp.from(Instant.now()));
      return Map.of(
          "message",
          "Cenário fictício de hipertrofia carregado: adulto ilustrativo de 82 kg e 1,80 m, cinco"
              + " refeições. Não é prescrição individual. Validades não foram estimadas.");
    }
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

  private void createHypertrophy(String email, LocalDate today) {
    var eggs = food(email, "Ovos", Unit.UNIT, Category.PROTEIN);
    var oats = food(email, "Aveia", Unit.G, Category.GRAINS);
    var milk = food(email, "Leite integral", Unit.ML, Category.DAIRY);
    var banana = food(email, "Banana sem casca", Unit.G, Category.PRODUCE);
    var rice = food(email, "Arroz", Unit.G, Category.GRAINS);
    var beans = food(email, "Feijão", Unit.G, Category.GRAINS);
    var chicken = food(email, "Peito de frango", Unit.G, Category.PROTEIN);
    var broccoli = food(email, "Brócolis", Unit.G, Category.PRODUCE);
    var oil = food(email, "Azeite", Unit.ML, Category.PANTRY);
    var yogurt = food(email, "Iogurte natural", Unit.G, Category.DAIRY);
    var bread = food(email, "Pão integral", Unit.G, Category.GRAINS);
    var peanuts = food(email, "Pasta de amendoim sem açúcar", Unit.G, Category.PANTRY);
    var beef = food(email, "Carne bovina magra", Unit.G, Category.PROTEIN);
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
                        item(eggs, "3", Unit.UNIT, Basis.AS_SOLD),
                        item(oats, "60", Unit.G, Basis.AS_SOLD),
                        item(milk, "250", Unit.ML, Basis.AS_SOLD),
                        item(banana, "120", Unit.G, Basis.AS_SOLD))),
                meal(
                    "Lanche da manhã",
                    10,
                    30,
                    List.of(
                        item(yogurt, "170", Unit.G, Basis.AS_SOLD),
                        item(bread, "70", Unit.G, Basis.AS_SOLD),
                        item(peanuts, "20", Unit.G, Basis.AS_SOLD))),
                meal(
                    "Almoço",
                    12,
                    30,
                    List.of(
                        item(rice, "200", Unit.G, Basis.COOKED),
                        item(beans, "120", Unit.G, Basis.COOKED),
                        item(chicken, "90", Unit.G, Basis.COOKED),
                        item(broccoli, "100", Unit.G, Basis.COOKED),
                        item(oil, "10", Unit.ML, Basis.AS_SOLD))),
                meal(
                    "Lanche da tarde",
                    16,
                    30,
                    List.of(
                        item(banana, "120", Unit.G, Basis.AS_SOLD),
                        item(oats, "30", Unit.G, Basis.AS_SOLD),
                        item(milk, "200", Unit.ML, Basis.AS_SOLD))),
                meal(
                    "Jantar",
                    20,
                    0,
                    List.of(
                        item(rice, "200", Unit.G, Basis.COOKED),
                        item(beans, "120", Unit.G, Basis.COOKED),
                        item(beef, "90", Unit.G, Basis.COOKED),
                        item(broccoli, "100", Unit.G, Basis.COOKED),
                        item(oil, "10", Unit.ML, Basis.AS_SOLD))))));
    add(
        email,
        "hypertrophy-eggs",
        eggs,
        Basis.AS_SOLD,
        "12",
        Unit.UNIT,
        today,
        null,
        Location.FRIDGE);
    add(
        email,
        "hypertrophy-oats",
        oats,
        Basis.AS_SOLD,
        "1000",
        Unit.G,
        today,
        null,
        Location.PANTRY);
    add(
        email,
        "hypertrophy-milk",
        milk,
        Basis.AS_SOLD,
        "2000",
        Unit.ML,
        today,
        null,
        Location.FRIDGE);
    add(
        email,
        "hypertrophy-banana",
        banana,
        Basis.AS_SOLD,
        "480",
        Unit.G,
        today,
        null,
        Location.PANTRY);
    add(
        email,
        "hypertrophy-rice-raw",
        rice,
        Basis.RAW,
        "1000",
        Unit.G,
        today,
        null,
        Location.PANTRY);
    add(
        email,
        "hypertrophy-rice-cooked",
        rice,
        Basis.COOKED,
        "600",
        Unit.G,
        today,
        null,
        Location.FRIDGE);
    add(
        email,
        "hypertrophy-beans-raw",
        beans,
        Basis.RAW,
        "500",
        Unit.G,
        today,
        null,
        Location.PANTRY);
    add(
        email,
        "hypertrophy-beans-cooked",
        beans,
        Basis.COOKED,
        "480",
        Unit.G,
        today,
        null,
        Location.FRIDGE);
    add(
        email,
        "hypertrophy-chicken-raw",
        chicken,
        Basis.RAW,
        "600",
        Unit.G,
        today,
        null,
        Location.FREEZER);
    add(
        email,
        "hypertrophy-chicken-cooked",
        chicken,
        Basis.COOKED,
        "180",
        Unit.G,
        today,
        null,
        Location.FRIDGE);
    add(
        email,
        "hypertrophy-broccoli-raw",
        broccoli,
        Basis.RAW,
        "700",
        Unit.G,
        today,
        null,
        Location.FRIDGE);
    add(
        email,
        "hypertrophy-broccoli-cooked",
        broccoli,
        Basis.COOKED,
        "400",
        Unit.G,
        today,
        null,
        Location.FRIDGE);
    add(email, "hypertrophy-oil", oil, Basis.AS_SOLD, "250", Unit.ML, today, null, Location.PANTRY);
    add(
        email,
        "hypertrophy-yogurt",
        yogurt,
        Basis.AS_SOLD,
        "680",
        Unit.G,
        today,
        null,
        Location.FRIDGE);
    add(
        email,
        "hypertrophy-bread",
        bread,
        Basis.AS_SOLD,
        "350",
        Unit.G,
        today,
        null,
        Location.PANTRY);
    add(
        email,
        "hypertrophy-peanuts",
        peanuts,
        Basis.AS_SOLD,
        "200",
        Unit.G,
        today,
        null,
        Location.PANTRY);
    add(
        email,
        "hypertrophy-beef-raw",
        beef,
        Basis.RAW,
        "500",
        Unit.G,
        today,
        null,
        Location.FREEZER);
    add(
        email,
        "hypertrophy-beef-cooked",
        beef,
        Basis.COOKED,
        "180",
        Unit.G,
        today,
        null,
        Location.FRIDGE);
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
