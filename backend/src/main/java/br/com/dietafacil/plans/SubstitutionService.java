package br.com.dietafacil.plans;

import static br.com.dietafacil.domain.DomainAccess.error;
import static br.com.dietafacil.plans.SubstitutionDtos.*;

import br.com.dietafacil.domain.DomainAccess;
import br.com.dietafacil.inventory.InventoryService;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

@Service
@Transactional(readOnly = true)
public class SubstitutionService {
  private final DomainAccess access;
  private final PlanService plans;
  private final InventoryService stock;
  private final ObjectMapper json;
  private final br.com.dietafacil.care.FeatureService features;

  public SubstitutionService(
      DomainAccess access,
      PlanService plans,
      InventoryService stock,
      ObjectMapper json,
      br.com.dietafacil.care.FeatureService features) {
    this.access = access;
    this.plans = plans;
    this.stock = stock;
    this.json = json;
    this.features = features;
  }

  private record Rule(long version, boolean enabled, String quantity, List<PlanDtos.Item> items) {}

  private Rule rule(UUID owner, UUID meal, PlanDtos.Item source) {
    var rules =
        access.db.query(
            "select * from meal_substitution_rules where user_id=? and logical_id=? and food_id=?"
                + " and basis=?",
            (r, n) ->
                new Rule(
                    r.getLong("version"),
                    r.getBoolean("enabled"),
                    r.getBigDecimal("source_quantity").stripTrailingZeros().toPlainString(),
                    List.of(json.readValue(r.getString("alternatives"), PlanDtos.Item[].class))),
            owner,
            meal,
            source.foodId(),
            source.basis().name());
    return rules.isEmpty() ? new Rule(0, false, source.quantity(), List.of()) : rules.getFirst();
  }

  private PlanDtos.Occurrence meal(UUID owner, LocalDate date, UUID meal) {
    return plans.occurrences(owner, date).stream()
        .filter(m -> m.mealId().equals(meal))
        .findFirst()
        .orElseThrow(() -> error(404, "Refeição não encontrada neste dia."));
  }

  private PlanDtos.Item item(PlanDtos.Occurrence meal, int index) {
    if (index < 0 || index >= meal.items().size())
      throw error(400, "Escolha um alimento da refeição.");
    var item = meal.items().get(index);
    if (meal.items().stream()
            .filter(i -> i.foodId().equals(item.foodId()) && i.basis() == item.basis())
            .count()
        != 1)
      throw error(
          409,
          "Agrupe as porções repetidas deste alimento na edição da dieta antes de configurar"
              + " trocas.");
    return item;
  }

  private String fingerprint(PlanDtos.Occurrence meal) {
    try {
      return HexFormat.of()
          .formatHex(
              MessageDigest.getInstance("SHA-256")
                  .digest(json.writeValueAsString(meal).getBytes(StandardCharsets.UTF_8)));
    } catch (java.security.NoSuchAlgorithmException ex) {
      throw new IllegalStateException(ex);
    }
  }

  public Options options(String email, LocalDate date, UUID mealId, int index) {
    var owner = access.owner(email);
    var occurrence = meal(owner, date, mealId);
    var source = item(occurrence, index);
    var rule = rule(owner, mealId, source);
    var inventoryActive = features.get(owner).inventoryEnabled();
    var lots =
        inventoryActive
            ? stock.lots(owner)
            : List.<br.com.dietafacil.inventory.InventoryDtos.Lot>of();
    var alternatives =
        rule.items().stream()
            .map(
                i -> {
                  var available =
                      lots.stream()
                          .filter(
                              l ->
                                  l.foodId().equals(i.foodId())
                                      && l.basis() == i.basis()
                                      && !l.receivedDate().isAfter(date)
                                      && (l.expiry() == null || !l.expiry().isBefore(date)))
                          .map(l -> new BigDecimal(l.quantity()))
                          .reduce(BigDecimal.ZERO, BigDecimal::add);
                  var knowledge =
                      inventoryActive
                          ? access.db.queryForList(
                              "select knowledge from inventory_accounts where user_id=? and"
                                  + " food_id=? and basis=?",
                              String.class,
                              owner,
                              i.foodId(),
                              i.basis().name())
                          : List.<String>of();
                  var archived = access.food(owner, i.foodId(), false).archived();
                  var present =
                      occurrence.items().stream()
                          .anyMatch(v -> v.foodId().equals(i.foodId()) && v.basis() == i.basis());
                  return new Alternative(
                      i,
                      inventoryActive ? available.stripTrailingZeros().toPlainString() : null,
                      !inventoryActive
                          ? "DISABLED"
                          : knowledge.isEmpty() ? "UNKNOWN" : knowledge.getFirst(),
                      !archived && !present,
                      archived ? "Alimento arquivado" : present ? "Já está nesta refeição" : null);
                })
            .toList();
    return new Options(
        fingerprint(occurrence),
        rule.version(),
        rule.enabled() && rule.quantity().equals(source.quantity()),
        source,
        alternatives);
  }

  private void editable(String email, LocalDate date, PlanDtos.Occurrence meal) {
    if (date.isBefore(access.today(email)))
      throw error(400, "Troque alimentos de hoje ou de um dia futuro.");
    if (!meal.status().equals("PENDING"))
      throw error(
          409, "A refeição já foi consumida ou pulada. Desfaça o registro antes de trocar.");
  }

  @Transactional
  public Options save(String email, RuleSave input) {
    var owner = access.lock(email);
    var occurrence = meal(owner, input.date(), input.mealId());
    editable(email, input.date(), occurrence);
    if (!fingerprint(occurrence).equals(input.fingerprint()))
      throw error(409, "A refeição mudou. Feche e abra o painel novamente.");
    var source = item(occurrence, input.itemIndex());
    access.food(owner, source.foodId(), true);
    var old = rule(owner, input.mealId(), source);
    if (old.version() != input.version())
      throw error(409, "As alternativas mudaram. Feche e abra o painel novamente.");
    if (input.enabled() && input.alternatives().isEmpty())
      throw error(400, "Cadastre uma alternativa antes de permitir trocas.");
    var alternatives = new ArrayList<PlanDtos.Item>();
    var keys = new HashSet<String>();
    for (var value : input.alternatives()) {
      var food = access.food(owner, value.foodId(), true);
      var key = food.id() + ":" + value.basis();
      if ((food.id().equals(source.foodId()) && value.basis() == source.basis()) || !keys.add(key))
        throw error(400, "Escolha alternativas diferentes do original e sem repetições.");
      var quantity = access.canonical(value.quantity(), value.unit(), food);
      alternatives.add(
          new PlanDtos.Item(
              food.id(),
              food.name(),
              quantity.stripTrailingZeros().toPlainString(),
              food.unit().baseUnit(),
              value.basis(),
              food.category(),
              food.frequency()));
    }
    access.db.update(
        "delete from meal_substitution_rules where user_id=? and logical_id=? and food_id=? and"
            + " basis=?",
        owner,
        input.mealId(),
        source.foodId(),
        source.basis().name());
    access.db.update(
        "insert into meal_substitution_rules values (?,?,?,?,?,?,?,?,?)",
        UUID.randomUUID(),
        owner,
        input.mealId(),
        source.foodId(),
        source.basis().name(),
        new BigDecimal(source.quantity()),
        input.enabled(),
        old.version() + 1,
        json.writeValueAsString(alternatives));
    return options(email, input.date(), input.mealId(), input.itemIndex());
  }

  @Transactional
  public Result swap(String email, Swap input) {
    var owner = access.lock(email);
    var request = json.writeValueAsString(input);
    var retries =
        access.db.queryForList(
            "select request from meal_substitution_actions where id=? and user_id=?",
            String.class,
            input.requestId(),
            owner);
    if (!retries.isEmpty()) {
      if (!retries.getFirst().equals(request))
        throw error(409, "A identificação desta troca já foi utilizada.");
      return new Result(input.requestId(), "Troca já registrada.");
    }
    var before = meal(owner, input.date(), input.mealId());
    editable(email, input.date(), before);
    if (!fingerprint(before).equals(input.fingerprint()))
      throw error(409, "A refeição mudou. Feche e abra o painel novamente.");
    var source = item(before, input.itemIndex());
    var rule = rule(owner, input.mealId(), source);
    if (!rule.enabled()
        || !rule.quantity().equals(source.quantity())
        || rule.version() != input.ruleVersion())
      throw error(409, "Troca bloqueada ou alternativas alteradas. Confira a configuração.");
    if (input.alternativeIndex() < 0 || input.alternativeIndex() >= rule.items().size())
      throw error(400, "Alternativa não encontrada.");
    var target = rule.items().get(input.alternativeIndex());
    access.food(owner, target.foodId(), true);
    if (before.items().stream()
        .anyMatch(i -> i.foodId().equals(target.foodId()) && i.basis() == target.basis()))
      throw error(409, "Essa alternativa já está na refeição. Ajuste as porções em Editar dieta.");
    var changed = new ArrayList<>(before.items());
    changed.set(input.itemIndex(), target);
    var after =
        new PlanDtos.Occurrence(
            before.id(),
            before.mealId(),
            before.date(),
            before.name(),
            before.time(),
            "PENDING",
            changed);
    String previous, current;
    long version = plans.plan(owner, input.date()).version();
    if (input.scope() == Scope.NEXT) {
      var plan = plans.plan(owner, input.date());
      var base =
          plan.meals().stream()
              .filter(m -> m.id().equals(input.mealId()))
              .findFirst()
              .orElseThrow(() -> error(409, "Esta refeição não está na dieta atual."));
      if (!base.items().equals(before.items()))
        throw error(
            409, "Há trocas só para este dia. Desfaça-as antes de alterar as próximas refeições.");
      previous = json.writeValueAsString(plan);
      var saved =
          plans.save(
              email,
              new PlanDtos.Save(
                  plan.version(), input.date(), inputs(plan, input.mealId(), changed)));
      version = saved.version();
      current = json.writeValueAsString(saved);
      access.db.update("delete from meal_overrides where user_id=? and id=?", owner, before.id());
    } else {
      var existing =
          access.db.queryForList(
              "select snapshot from meal_overrides where user_id=? and id=?",
              String.class,
              owner,
              before.id());
      previous = existing.isEmpty() ? "null" : existing.getFirst();
      current = json.writeValueAsString(after);
      override(owner, after);
    }
    access.db.update(
        "insert into meal_substitution_actions values (?,?,?,?,?,?,?,?,?,false)",
        input.requestId(),
        owner,
        request,
        input.scope().name(),
        input.date(),
        input.mealId(),
        previous,
        current,
        version);
    return new Result(
        input.requestId(),
        input.scope() == Scope.ONCE
            ? "Alimento trocado só nesta refeição."
            : "Dieta atualizada a partir deste dia, até a próxima revisão agendada.");
  }

  private List<PlanDtos.MealInput> inputs(
      PlanDtos.Plan plan, UUID changedMeal, List<PlanDtos.Item> changed) {
    return plan.meals().stream()
        .map(
            m ->
                new PlanDtos.MealInput(
                    m.id(),
                    m.name(),
                    java.time.LocalTime.parse(m.time()),
                    m.days(),
                    (m.id().equals(changedMeal) ? changed : m.items())
                        .stream()
                            .map(
                                i ->
                                    new PlanDtos.ItemInput(
                                        i.foodId(),
                                        new BigDecimal(i.quantity()),
                                        i.unit(),
                                        i.basis()))
                            .toList()))
        .toList();
  }

  private void override(UUID owner, PlanDtos.Occurrence meal) {
    access.db.update("delete from meal_overrides where id=? and user_id=?", meal.id(), owner);
    access.db.update(
        "insert into meal_overrides values (?,?,?,?)",
        meal.id(),
        owner,
        meal.date(),
        json.writeValueAsString(meal));
  }

  @Transactional
  public Result undo(String email, UUID id) {
    var owner = access.lock(email);
    var actions =
        access.db.queryForList(
            "select * from meal_substitution_actions where user_id=? and id=?", owner, id);
    if (actions.isEmpty()) throw error(404, "Troca não encontrada.");
    var row = actions.getFirst();
    if (Boolean.TRUE.equals(row.get("undone"))) return new Result(id, "Troca já desfeita.");
    var date = LocalDate.parse(row.get("local_date").toString());
    var mealId = UUID.fromString(row.get("logical_id").toString());
    var current = meal(owner, date, mealId);
    editable(email, date, current);
    if (row.get("scope").equals("ONCE")) {
      var after = json.readValue((String) row.get("after_json"), PlanDtos.Occurrence.class);
      if (!current.equals(after))
        throw error(
            409, "A refeição mudou desde a troca. Desfaça primeiro a alteração mais recente.");
      if (row.get("before_json").equals("null"))
        access.db.update(
            "delete from meal_overrides where user_id=? and id=?", owner, current.id());
      else
        override(owner, json.readValue((String) row.get("before_json"), PlanDtos.Occurrence.class));
    } else {
      var before = json.readValue((String) row.get("before_json"), PlanDtos.Plan.class);
      var after = json.readValue((String) row.get("after_json"), PlanDtos.Plan.class);
      var plan = plans.plan(owner, date);
      if (plan.version() != ((Number) row.get("plan_version")).longValue() || !plan.equals(after))
        throw error(409, "A dieta mudou desde a troca. Revise a dieta para não perder alterações.");
      if (!current
          .items()
          .equals(
              after.meals().stream()
                  .filter(m -> m.id().equals(mealId))
                  .findFirst()
                  .orElseThrow()
                  .items())) throw error(409, "Há outra troca neste dia. Desfaça-a primeiro.");
      plans.save(email, new PlanDtos.Save(plan.version(), date, inputs(before, null, List.of())));
    }
    access.db.update(
        "update meal_substitution_actions set undone=true where user_id=? and id=?", owner, id);
    return new Result(id, "Troca desfeita. O estoque não foi movimentado.");
  }

  public boolean singleOccurrenceAction(String email, UUID id) {
    var values =
        access.db.queryForList(
            "select scope from meal_substitution_actions where user_id=? and id=?",
            String.class,
            access.owner(email),
            id);
    if (values.isEmpty()) throw error(404, "Troca não encontrada.");
    return values.getFirst().equals("ONCE");
  }
}
