package br.com.dietafacil.shopping;

import static br.com.dietafacil.domain.DomainAccess.error;
import static br.com.dietafacil.inventory.InventoryService.plain;
import static br.com.dietafacil.shopping.ShoppingDtos.*;

import br.com.dietafacil.domain.DomainAccess;
import br.com.dietafacil.foods.FoodTypes.*;
import br.com.dietafacil.inventory.*;
import br.com.dietafacil.plans.PlanService;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.Timestamp;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import tools.jackson.databind.ObjectMapper;

@Service
@Transactional(readOnly = true)
public class ShoppingService {
  private final DomainAccess access;
  private final InventoryService stock;
  private final PlanService plans;
  private final ObjectMapper json;

  public ShoppingService(
      DomainAccess access, InventoryService stock, PlanService plans, ObjectMapper json) {
    this.access = access;
    this.stock = stock;
    this.plans = plans;
    this.json = json;
  }

  public Preferences preferences(String email) {
    var owner = access.owner(email);
    var today = access.today(email);
    var values =
        access.db.query(
            "select cycle,weekday,month_day from shopping_preferences where user_id=?",
            (r, n) -> new PreferencesInput(r.getString(1), r.getInt(2), r.getInt(3)),
            owner);
    var preference = values.isEmpty() ? new PreferencesInput("WEEKLY", 1, 1) : values.getFirst();
    LocalDate next;
    if (preference.cycle().equals("WEEKLY"))
      next =
          today.with(java.time.temporal.TemporalAdjusters.next(DayOfWeek.of(preference.weekday())));
    else {
      next = today.withDayOfMonth(Math.min(preference.monthDay(), today.lengthOfMonth()));
      if (!next.isAfter(today)) {
        var month = today.plusMonths(1);
        next = month.withDayOfMonth(Math.min(preference.monthDay(), month.lengthOfMonth()));
      }
    }
    return new Preferences(preference.cycle(), preference.weekday(), preference.monthDay(), next);
  }

  @Transactional
  public Preferences preferences(String email, PreferencesInput input) {
    var owner = access.lock(email);
    var count =
        access.db.update(
            "update shopping_preferences set cycle=?,weekday=?,month_day=? where user_id=?",
            input.cycle(),
            input.weekday(),
            input.monthDay(),
            owner);
    if (count == 0)
      access.db.update(
          "insert into shopping_preferences values (?,?,?,?)",
          owner,
          input.cycle(),
          input.weekday(),
          input.monthDay());
    return preferences(email);
  }

  public static String key(UUID food, Basis basis) {
    return food + ":" + basis;
  }

  private static String hash(String value) {
    try {
      return HexFormat.of()
          .formatHex(
              MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
    } catch (java.security.NoSuchAlgorithmException ex) {
      throw new IllegalStateException(ex);
    }
  }

  public String source(UUID owner) {
    var pieces = new ArrayList<Object>();
    pieces.add(
        access.db.queryForList(
            "select version from diet_plans where user_id=?", Long.class, owner));
    pieces.add(
        access.db.query(
            "select id,version from foods where user_id=? order by id",
            (r, n) -> r.getString(1) + ":" + r.getLong(2),
            owner));
    pieces.add(
        access.db.query(
            "select id,version from inventory_lots where user_id=? order by id",
            (r, n) -> r.getString(1) + ":" + r.getLong(2),
            owner));
    pieces.add(
        access.db.query(
            "select food_id,basis,knowledge from inventory_accounts where user_id=? order by"
                + " food_id,basis",
            (r, n) -> r.getString(1) + ":" + r.getString(2) + ":" + r.getString(3),
            owner));
    pieces.add(
        access.db.query(
            "select id,status from meal_occurrences where user_id=? order by id",
            (r, n) -> r.getString(1) + ":" + r.getString(2),
            owner));
    pieces.add(
        access.db.query(
            "select id,snapshot from meal_overrides where user_id=? order by id",
            (r, n) -> r.getString(1) + ":" + r.getString(2),
            owner));
    return hash(json.writeValueAsString(pieces));
  }

  private static final class Demand {
    UUID food;
    String name;
    Basis basis;
    Unit unit;
    String frequency;
    BigDecimal demand = BigDecimal.ZERO, available = BigDecimal.ZERO, covered = BigDecimal.ZERO;
    LocalDate first;
    boolean unknown;
  }

  @Transactional(isolation = Isolation.REPEATABLE_READ)
  public Projection projection(String email, LocalDate from, LocalDate until) {
    if (from.isBefore(access.today(email))
        || !until.isAfter(from)
        || until.isAfter(from.plusDays(366)))
      throw error(
          400,
          "Escolha um período a partir de hoje, com até 366 dias. A data final é a próxima compra e"
              + " não entra neste período.");
    return project(access.owner(email), from, until);
  }

  private Projection project(UUID owner, LocalDate from, LocalDate until) {
    var lots = stock.lots(owner);
    var remaining = new HashMap<UUID, BigDecimal>();
    for (var lot : lots) remaining.put(lot.id(), new BigDecimal(lot.quantity()));
    var demand = new TreeMap<String, Demand>();
    for (var date = from; date.isBefore(until); date = date.plusDays(1)) {
      for (var occurrence : plans.occurrences(owner, date))
        if (occurrence.status().equals("PENDING"))
          for (var item : occurrence.items()) {
            var ref = key(item.foodId(), item.basis());
            var row =
                demand.computeIfAbsent(
                    ref,
                    k -> {
                      var d = new Demand();
                      d.food = item.foodId();
                      d.name = item.name();
                      d.basis = item.basis();
                      d.unit = item.unit();
                      d.frequency = item.frequency();
                      return d;
                    });
            var quantity = new BigDecimal(item.quantity());
            row.demand = row.demand.add(quantity);
            var need = quantity;
            for (var lot : lots)
              if (lot.foodId().equals(row.food)
                  && lot.basis() == row.basis
                  && !lot.receivedDate().isAfter(date)
                  && (lot.expiry() == null || !lot.expiry().isBefore(date))) {
                var use = remaining.get(lot.id()).min(need);
                if (use.signum() > 0) {
                  remaining.put(lot.id(), remaining.get(lot.id()).subtract(use));
                  row.covered = row.covered.add(use);
                  if (lot.expiry() == null) row.unknown = true;
                  need = need.subtract(use);
                }
                if (need.signum() == 0) break;
              }
            if (need.signum() > 0 && row.first == null) row.first = date;
          }
    }
    var rows = new ArrayList<Row>();
    var warnings = new LinkedHashSet<String>();
    for (var row : demand.values()) {
      for (var lot : lots)
        if (lot.foodId().equals(row.food)
            && lot.basis() == row.basis
            && !lot.receivedDate().isAfter(from)
            && (lot.expiry() == null || !lot.expiry().isBefore(from)))
          row.available = row.available.add(new BigDecimal(lot.quantity()));
      var knowledge = stock.knowledge(owner, row.food, row.basis);
      if (knowledge != InventoryDtos.Knowledge.KNOWN)
        warnings.add(
            "Há saldos desconhecidos ou parciais. Confira seu estoque antes de finalizar as"
                + " compras.");
      if (row.unknown)
        warnings.add(
            "Parte da cobertura usa lotes sem validade informada. Essa cobertura é estimada.");
      rows.add(
          new Row(
              row.food,
              row.name,
              row.basis,
              row.unit,
              plain(row.demand),
              plain(row.available),
              plain(row.covered),
              plain(row.demand.subtract(row.covered)),
              row.first,
              knowledge.name(),
              row.unknown,
              row.frequency));
    }
    rows.sort(Comparator.comparing(Row::name).thenComparing(r -> r.basis().name()));
    if (rows.isEmpty())
      warnings.add(
          "Não há refeições pendentes no período. Cadastre uma dieta para gerar a necessidade.");
    return new Projection(from, until, rows, source(owner), List.copyOf(warnings));
  }

  @Transactional
  public ShoppingList generate(String email, Generate input) {
    var owner = access.lock(email);
    var projection = projection(email, input.from(), input.until());
    var id = UUID.randomUUID();
    access.db.update(
        "insert into shopping_lists values (?,?,?,?,?,?,?,?,0,?)",
        id,
        owner,
        input.from(),
        input.until(),
        projection.sourceHash(),
        json.writeValueAsString(projection),
        "{}",
        "DRAFT",
        Timestamp.from(Instant.now()));
    return get(email, id);
  }

  public List<ShoppingList> lists(String email) {
    var owner = access.owner(email);
    var ids =
        access.db.queryForList(
            "select id from shopping_lists where user_id=? order by created_at desc limit 30",
            UUID.class,
            owner);
    return ids.stream().map(id -> get(email, id)).toList();
  }

  public ShoppingList get(String email, UUID id) {
    var owner = access.owner(email);
    var rows =
        access.db.query(
            "select * from shopping_lists where user_id=? and id=?",
            (r, n) -> {
              var projection = json.readValue(r.getString("snapshot_json"), Projection.class);
              var adjustments = parseMap(r.getString("adjustments_json"));
              var received = new TreeMap<String, BigDecimal>();
              access.db.query(
                  "select food_id,basis,quantity from shopping_receipts receipt join"
                      + " inventory_operations op on op.id=receipt.operation_id where"
                      + " receipt.user_id=? and list_id=? and not exists(select 1 from"
                      + " inventory_operations rev where rev.reversal_of=op.id)",
                  (rs) -> {
                    received.merge(
                        rs.getString(1) + ":" + rs.getString(2),
                        rs.getBigDecimal(3),
                        BigDecimal::add);
                  },
                  owner,
                  id);
              var quantities = new TreeMap<String, String>();
              received.forEach((k, v) -> quantities.put(k, plain(v)));
              return new ShoppingList(
                  id,
                  r.getLong("version"),
                  r.getString("status"),
                  projection,
                  adjustments,
                  quantities,
                  !r.getString("source_hash").equals(source(owner))
                      || projection.from().isBefore(access.today(email)),
                  r.getTimestamp("created_at").toInstant());
            },
            owner,
            id);
    if (rows.isEmpty()) throw error(404, "Lista de compras não encontrada.");
    return rows.getFirst();
  }

  private Map<String, String> parseMap(String value) {
    var node = json.readTree(value);
    var result = new TreeMap<String, String>();
    node.properties().forEach(e -> result.put(e.getKey(), e.getValue().asText()));
    return result;
  }

  private ShoppingList editable(String email, UUID id, long version) {
    var list = get(email, id);
    if (list.version() != version)
      throw error(409, "Esta lista mudou em outra sessão. Recarregue.");
    if (list.status().equals("CANCELLED")) throw error(409, "Esta lista foi cancelada.");
    return list;
  }

  @Transactional
  public ShoppingList update(String email, UUID id, Update input) {
    var owner = access.lock(email);
    var list = editable(email, id, input.version());
    var allowed = new HashSet<String>();
    for (var row : list.projection().rows()) allowed.add(key(row.foodId(), row.basis()));
    for (var adjustment : input.adjustments().entrySet()) {
      if (!allowed.contains(adjustment.getKey()))
        throw error(400, "Ajuste não corresponde a um item da lista.");
      var row =
          list.projection().rows().stream()
              .filter(r -> key(r.foodId(), r.basis()).equals(adjustment.getKey()))
              .findFirst()
              .orElseThrow();
      var quantity = new BigDecimal(adjustment.getValue());
      if (quantity.signum() < 0
          || (row.unit() == Unit.UNIT && quantity.stripTrailingZeros().scale() > 0))
        throw error(400, "Quantidade ajustada inválida.");
    }
    access.db.update(
        "update shopping_lists set adjustments_json=?,status=?,version=version+1 where user_id=?"
            + " and id=?",
        json.writeValueAsString(input.adjustments()),
        input.status(),
        owner,
        id);
    return get(email, id);
  }

  @Transactional
  public ShoppingList recalculate(String email, UUID id, Recalculate input) {
    var owner = access.lock(email);
    var list = editable(email, id, input.version());
    var from =
        list.projection().from().isBefore(access.today(email))
            ? access.today(email)
            : list.projection().from();
    var until = list.projection().until();
    if (!until.isAfter(from)) throw error(409, "O período terminou. Gere uma nova lista.");
    var projection = project(owner, from, until);
    var adjustments = new TreeMap<String, String>();
    for (var row : projection.rows()) {
      var ref = key(row.foodId(), row.basis());
      if (list.adjustments().containsKey(ref)) adjustments.put(ref, list.adjustments().get(ref));
    }
    access.db.update(
        "update shopping_lists set"
            + " from_date=?,snapshot_json=?,source_hash=?,adjustments_json=?,version=version+1"
            + " where user_id=? and id=?",
        from,
        json.writeValueAsString(projection),
        projection.sourceHash(),
        json.writeValueAsString(adjustments),
        owner,
        id);
    return get(email, id);
  }

  @Transactional
  public InventoryDtos.Result receipt(String email, String requestKey, Receipt input) {
    var owner = access.lock(email);
    return stock.command(
        owner,
        requestKey,
        "PURCHASE",
        input,
        null,
        null,
        () -> {
          if (input.listId() != null) {
            var list = get(email, input.listId());
            if (list.status().equals("CANCELLED") || list.status().equals("COMPLETED"))
              throw error(409, "Esta lista já foi encerrada.");
          }
          var lot = stock.receive(owner, input.entry(), access.today(email), true);
          var operation =
              access.db.queryForObject(
                  "select id from inventory_operations where user_id=? and request_key=?",
                  UUID.class,
                  owner,
                  requestKey);
          var food = access.food(owner, input.entry().foodId(), false);
          var quantity = access.canonical(input.entry().quantity(), input.entry().unit(), food);
          access.db.update(
              "insert into shopping_receipts values (?,?,?,?,?,?,?)",
              UUID.randomUUID(),
              owner,
              input.listId(),
              operation,
              food.id(),
              input.entry().basis().name(),
              quantity);
          if (input.listId() != null)
            access.db.update(
                "update shopping_lists set status='PARTIAL',version=version+1 where user_id=? and"
                    + " id=?",
                owner,
                input.listId());
          return lot;
        });
  }
}
