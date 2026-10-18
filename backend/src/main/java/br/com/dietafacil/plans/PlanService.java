package br.com.dietafacil.plans;

import static br.com.dietafacil.domain.DomainAccess.error;
import static br.com.dietafacil.plans.PlanDtos.*;

import br.com.dietafacil.domain.DomainAccess;
import br.com.dietafacil.foods.FoodTypes.*;
import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

@Service
@Transactional(readOnly = true)
public class PlanService {
  private final DomainAccess access;
  private final ObjectMapper json;

  public PlanService(DomainAccess access, ObjectMapper json) {
    this.access = access;
    this.json = json;
  }

  public Plan plan(String email, LocalDate date) {
    return plan(access.owner(email), date);
  }

  public Plan plan(UUID owner, LocalDate date) {
    var versions =
        access.db.queryForList("select version from diet_plans where user_id=?", Long.class, owner);
    var dates =
        access.db.query(
            "select effective_date from plan_revisions where user_id=? order by effective_date",
            (r, n) -> r.getObject(1, LocalDate.class),
            owner);
    var revisions =
        access.db.queryForList(
            "select id from plan_revisions where user_id=? and effective_date<=? order by"
                + " effective_date desc limit 1",
            UUID.class,
            owner,
            date);
    if (revisions.isEmpty())
      return new Plan(versions.isEmpty() ? 0 : versions.getFirst(), null, List.of(), dates);
    var revision = revisions.getFirst();
    var meals =
        access.db.query(
            "select * from plan_meals where revision_id=? and user_id=? order by local_time,id",
            (r, n) -> {
              var id = r.getObject("id", UUID.class);
              var days =
                  new TreeSet<>(
                      access.db.queryForList(
                          "select weekday from meal_days where meal_id=? order by weekday",
                          Integer.class,
                          id));
              var items =
                  access.db.query(
                      "select * from plan_items where meal_id=? order by id",
                      (i, k) ->
                          new Item(
                              i.getObject("food_id", UUID.class),
                              i.getString("food_name"),
                              i.getBigDecimal("quantity").stripTrailingZeros().toPlainString(),
                              Unit.valueOf(i.getString("unit")),
                              Basis.valueOf(i.getString("basis")),
                              i.getString("category"),
                              i.getString("frequency")),
                      id);
              return new Meal(
                  r.getObject("logical_id", UUID.class),
                  r.getString("name"),
                  r.getObject("local_time", LocalTime.class).toString(),
                  days,
                  items);
            },
            revision,
            owner);
    var effective =
        access.db.queryForObject(
            "select effective_date from plan_revisions where id=?", LocalDate.class, revision);
    return new Plan(versions.getFirst(), effective, meals, dates);
  }

  @Transactional
  public Plan save(String email, Save input) {
    var owner = access.lock(email);
    if (input.effectiveFrom().isBefore(access.today(email)))
      throw error(400, "A revisão deve começar hoje ou em uma data futura.");
    var old =
        access.db.queryForList("select version from diet_plans where user_id=?", Long.class, owner);
    long version = old.isEmpty() ? 0 : old.getFirst();
    if (version != input.version())
      throw error(409, "A dieta foi alterada em outra sessão. Recarregue antes de salvar.");
    if (old.isEmpty())
      access.db.update("insert into diet_plans(user_id,version) values (?,0)", owner);
    var keys = new HashSet<UUID>();
    for (var meal : input.meals())
      if (meal.id() != null && !keys.add(meal.id()))
        throw error(400, "Cada refeição precisa ter uma identificação diferente.");
    access.db.update(
        "delete from plan_revisions where user_id=? and effective_date=?",
        owner,
        input.effectiveFrom());
    var revision = UUID.randomUUID();
    access.db.update(
        "insert into plan_revisions values (?,?,?,?)",
        revision,
        owner,
        input.effectiveFrom(),
        Timestamp.from(Instant.now()));
    for (var meal : input.meals()) {
      var id = UUID.randomUUID();
      var logical = meal.id() == null ? UUID.randomUUID() : meal.id();
      access.db.update(
          "insert into plan_meals values (?,?,?,?,?,?)",
          id,
          revision,
          owner,
          logical,
          meal.name().strip(),
          LocalTime.parse(meal.time().toString()).withSecond(0).withNano(0));
      for (var day : meal.days()) access.db.update("insert into meal_days values (?,?)", id, day);
      for (var item : meal.items()) {
        var food = access.food(owner, item.foodId(), true);
        var quantity = access.canonical(item.quantity(), item.unit(), food);
        access.db.update(
            "insert into plan_items values (?,?,?,?,?,?,?,?,?,?)",
            UUID.randomUUID(),
            id,
            owner,
            food.id(),
            quantity,
            food.unit().baseUnit().name(),
            item.basis().name(),
            food.name(),
            food.category(),
            food.frequency());
      }
    }
    access.db.update("update diet_plans set version=version+1 where user_id=?", owner);
    return plan(owner, input.effectiveFrom());
  }

  public static UUID occurrenceId(UUID owner, UUID meal, LocalDate date) {
    return UUID.nameUUIDFromBytes(
        (owner + ":" + meal + ":" + date).getBytes(StandardCharsets.UTF_8));
  }

  public Schedule schedule(String email, LocalDate date) {
    return new Schedule(date, access.timezone(email), occurrences(access.owner(email), date));
  }

  public List<Occurrence> occurrences(UUID owner, LocalDate date) {
    var result = new LinkedHashMap<UUID, Occurrence>();
    for (var meal : plan(owner, date).meals())
      if (meal.days().contains(date.getDayOfWeek().getValue())) {
        var id = occurrenceId(owner, meal.id(), date);
        result.put(
            id,
            new Occurrence(id, meal.id(), date, meal.name(), meal.time(), "PENDING", meal.items()));
      }
    var stored =
        access.db.queryForList(
            "select snapshot from meal_occurrences where user_id=? and local_date=?",
            String.class,
            owner,
            date);
    for (var snapshot : stored) {
      var entry = json.readValue(snapshot, Occurrence.class);
      result.put(entry.id(), entry);
    }
    return result.values().stream()
        .sorted(Comparator.comparing(Occurrence::time).thenComparing(o -> o.id().toString()))
        .toList();
  }

  @Transactional
  public Schedule skip(String email, Skip input) {
    var owner = access.lock(email);
    if (input.date().isAfter(access.today(email)))
      throw error(400, "Marque como pulada apenas uma refeição de hoje ou do passado.");
    var occurrence =
        occurrences(owner, input.date()).stream()
            .filter(o -> o.mealId().equals(input.mealId()))
            .findFirst()
            .orElseThrow(() -> error(404, "Refeição não encontrada."));
    if (occurrence.status().equals("CONSUMED"))
      throw error(409, "Consumo já confirmado. Use o histórico para corrigir.");
    access.db.update(
        "delete from meal_occurrences where user_id=? and id=?", owner, occurrence.id());
    if (input.skipped())
      store(
          owner,
          new Occurrence(
              occurrence.id(),
              occurrence.mealId(),
              occurrence.date(),
              occurrence.name(),
              occurrence.time(),
              "SKIPPED",
              occurrence.items()));
    return schedule(email, input.date());
  }

  public void store(UUID owner, Occurrence occurrence) {
    access.db.update(
        "insert into meal_occurrences values (?,?,?,?,?,?)",
        occurrence.id(),
        owner,
        occurrence.mealId(),
        occurrence.date(),
        occurrence.status(),
        json.writeValueAsString(occurrence));
  }
}
