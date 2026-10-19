package br.com.dietafacil.care;

import static org.assertj.core.api.Assertions.*;

import br.com.dietafacil.auth.*;
import br.com.dietafacil.domain.DomainAccess;
import br.com.dietafacil.foods.*;
import br.com.dietafacil.foods.FoodTypes.*;
import br.com.dietafacil.inventory.*;
import br.com.dietafacil.inventory.InventoryDtos.*;
import br.com.dietafacil.plans.*;
import java.math.BigDecimal;
import java.net.*;
import java.net.http.*;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.*;
import org.springframework.boot.test.context.SpringBootTest;
import tools.jackson.databind.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class CareWorkflowTest {
  @Value("${local.server.port}")
  int port;

  @Autowired AuthService auth;
  @Autowired CareService care;
  @Autowired FeatureService features;
  @Autowired DomainAccess access;
  @Autowired PlanService plans;
  @Autowired FoodService foods;
  @Autowired InventoryService stock;
  @Autowired br.com.dietafacil.account.AccountService accounts;
  ObjectMapper json = new ObjectMapper();

  record Person(String email, UUID id, HttpClient http) {}

  Person person(String role) throws Exception {
    var email = "care-" + UUID.randomUUID() + "@example.invalid";
    var profile =
        auth.register(
            new AuthDtos.Registration(
                "Pessoa fictícia", email, "Senha-ficticia-2026!", "UTC", role));
    var http =
        HttpClient.newBuilder()
            .cookieHandler(new CookieManager(null, CookiePolicy.ACCEPT_ALL))
            .build();
    assertThat(
            request(
                    http,
                    "POST",
                    "/api/auth/login",
                    Map.of("email", email, "password", "Senha-ficticia-2026!"))
                .statusCode())
        .isEqualTo(200);
    return new Person(email, profile.id(), http);
  }

  HttpResponse<String> request(HttpClient client, String method, String path, Object body)
      throws Exception {
    var builder =
        HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
            .header("Content-Type", "application/json");
    if (!method.equals("GET")) {
      var csrf = json.readTree(request(client, "GET", "/api/auth/csrf", null).body());
      builder.header(csrf.get("headerName").asText(), csrf.get("token").asText());
    }
    return client.send(
        builder
            .method(
                method,
                body == null
                    ? HttpRequest.BodyPublishers.noBody()
                    : HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)))
            .build(),
        HttpResponse.BodyHandlers.ofString());
  }

  UUID link(Person pro, Person client) {
    care.invite(pro.email, new CareService.Invitation(client.email, "Cliente fictício"));
    var id = care.links(client.email, false).getFirst().id();
    care.accept(client.email, id);
    return id;
  }

  @Test
  void onlyAcceptedProfessionalCanWriteDietAndClientCannotEscalate() throws Exception {
    var pro = person("NUTRITIONIST");
    var client = person("CLIENT");
    var other = person("NUTRITIONIST");
    var stranger = person("CLIENT");
    care.invite(pro.email, new CareService.Invitation(client.email, "Cliente fictício"));
    var invitation = care.links(client.email, false).getFirst().id();
    String path = "/api/professional/clients/" + client.id;
    assertThat(
            request(pro.http, "GET", path + "/plan?date=" + LocalDate.now(ZoneOffset.UTC), null)
                .statusCode())
        .isEqualTo(404);
    assertThat(
            request(stranger.http, "POST", "/api/care/" + invitation + "/accept", Map.of())
                .statusCode())
        .isEqualTo(404);
    assertThat(
            request(client.http, "POST", "/api/care/" + invitation + "/accept", Map.of())
                .statusCode())
        .isEqualTo(200);
    var created =
        request(
            pro.http,
            "POST",
            path + "/foods",
            new FoodDtos.Create("Ovos", Unit.UNIT, Category.PROTEIN, Frequency.WEEKLY));
    assertThat(created.statusCode()).isEqualTo(200);
    var food = UUID.fromString(json.readTree(created.body()).get("id").asText());
    var today = LocalDate.now(ZoneOffset.UTC);
    var meal = UUID.randomUUID();
    var save =
        new PlanDtos.Save(
            0L,
            today,
            List.of(
                new PlanDtos.MealInput(
                    meal,
                    "Café",
                    LocalTime.of(8, 0),
                    Set.of(1, 2, 3, 4, 5, 6, 7),
                    List.of(
                        new PlanDtos.ItemInput(
                            food, new BigDecimal("2"), Unit.UNIT, Basis.AS_SOLD)))));
    assertThat(request(pro.http, "PUT", path + "/plan", save).statusCode()).isEqualTo(200);
    assertThat(request(client.http, "PUT", "/api/plan", save).statusCode()).isEqualTo(403);
    assertThat(
            request(
                    client.http,
                    "POST",
                    "/api/foods",
                    new FoodDtos.Create("Outro", Unit.G, Category.OTHER, Frequency.WEEKLY))
                .statusCode())
        .isEqualTo(403);
    assertThat(request(other.http, "GET", path + "/profile", null).statusCode()).isEqualTo(404);
    assertThat(
            request(
                    client.http,
                    "PATCH",
                    "/api/me",
                    Map.of("name", "Cliente", "timezone", "UTC", "role", "NUTRITIONIST"))
                .statusCode())
        .isEqualTo(200);
    assertThat(features.get(client.email).role()).isEqualTo("CLIENT");
    assertThat(
            request(
                    client.http,
                    "POST",
                    "/api/schedule/substitute",
                    new SubstitutionDtos.Swap(
                        UUID.randomUUID(),
                        today,
                        meal,
                        0,
                        "stale",
                        0,
                        0,
                        SubstitutionDtos.Scope.NEXT))
                .statusCode())
        .isEqualTo(403);
    assertThat(
            request(client.http, "POST", "/api/care/" + invitation + "/revoke", Map.of())
                .statusCode())
        .isEqualTo(204);
    assertThat(request(pro.http, "GET", path + "/plan?date=" + today, null).statusCode())
        .isEqualTo(404);
    assertThat(plans.plan(client.email, today).meals()).hasSize(1);
  }

  @Test
  void basicCheckinsFreezeStockAndNeverDebitRetroactively() throws Exception {
    var client = person("CLIENT");
    var today = LocalDate.now(ZoneOffset.UTC);
    var food =
        foods
            .create(
                client.email,
                new FoodDtos.Create("Ovos", Unit.UNIT, Category.PROTEIN, Frequency.WEEKLY))
            .id();
    var meal = UUID.randomUUID();
    var item = new PlanDtos.ItemInput(food, new BigDecimal("2"), Unit.UNIT, Basis.AS_SOLD);
    plans.save(
        client.email,
        new PlanDtos.Save(
            0L,
            today,
            List.of(
                new PlanDtos.MealInput(
                    meal,
                    "Café",
                    LocalTime.of(8, 0),
                    Set.of(1, 2, 3, 4, 5, 6, 7),
                    List.of(item)))));
    stock.entry(
        client.email,
        "fixture-" + UUID.randomUUID(),
        new Entry(
            food,
            Basis.AS_SOLD,
            new BigDecimal("10"),
            Unit.UNIT,
            Location.FRIDGE,
            Condition.SEALED,
            today,
            null,
            ExpirySource.UNKNOWN,
            null,
            null,
            Knowledge.KNOWN));
    assertThat(request(client.http, "GET", "/api/inventory", null).statusCode()).isEqualTo(403);
    assertThat(request(client.http, "GET", "/api/shopping/preferences", null).statusCode())
        .isEqualTo(403);
    var checkin = new MealTrackingController.Checkin(UUID.randomUUID(), today, meal, List.of(item));
    var result = request(client.http, "POST", "/api/meals/checkins", checkin);
    assertThat(result.statusCode()).isEqualTo(200);
    assertThat(json.readTree(result.body()).get("mode").asText()).isEqualTo("ONLY");
    assertThat(request(client.http, "POST", "/api/meals/checkins", checkin).statusCode())
        .isEqualTo(200);
    assertThat(stock.snapshot(client.email).lots().getFirst().quantity()).isEqualTo("10");
    features.demoTier(client.email, "PREMIUM");
    assertThat(
            request(
                    client.http,
                    "POST",
                    "/api/features/inventory",
                    Map.of("enabled", true, "reviewed", false))
                .statusCode())
        .isEqualTo(409);
    features.inventory(client.email, true, true);
    assertThat(stock.snapshot(client.email).lots().getFirst().quantity()).isEqualTo("10");
    assertThat(
            request(
                    client.http,
                    "POST",
                    "/api/meals/checkins/undo",
                    new MealTrackingController.Undo(checkin.requestId()))
                .statusCode())
        .isEqualTo(200);
    assertThat(stock.snapshot(client.email).lots().getFirst().quantity()).isEqualTo("10");
    var next = new MealTrackingController.Checkin(UUID.randomUUID(), today, meal, List.of(item));
    assertThat(request(client.http, "POST", "/api/meals/checkins", next).statusCode())
        .isEqualTo(200);
    assertThat(stock.snapshot(client.email).lots().getFirst().quantity()).isEqualTo("8");
    features.inventory(client.email, false, false);
    assertThat(
            request(
                    client.http,
                    "POST",
                    "/api/meals/checkins/undo",
                    new MealTrackingController.Undo(next.requestId()))
                .statusCode())
        .isEqualTo(409);
    assertThat(stock.snapshot(client.email).lots().getFirst().quantity()).isEqualTo("8");
    features.inventory(client.email, true, true);
    request(
        client.http,
        "POST",
        "/api/meals/checkins/undo",
        new MealTrackingController.Undo(next.requestId()));
    assertThat(stock.snapshot(client.email).lots().getFirst().quantity()).isEqualTo("10");
    features.demoTier(client.email, "BASIC");
    assertThat(features.get(client.email).inventoryEnabled()).isFalse();
  }

  @Test
  void activeCheckinsRemainIndependentAndOldUndoCannotRemoveNewRegistration() throws Exception {
    var client = person("CLIENT");
    var other = person("CLIENT");
    var today = LocalDate.now(ZoneOffset.UTC);
    var food =
        foods
            .create(
                client.email,
                new FoodDtos.Create("Ovos", Unit.UNIT, Category.PROTEIN, Frequency.WEEKLY))
            .id();
    var item = new PlanDtos.ItemInput(food, new BigDecimal("2"), Unit.UNIT, Basis.AS_SOLD);
    var first = UUID.randomUUID();
    var second = UUID.randomUUID();
    plans.save(
        client.email,
        new PlanDtos.Save(
            0L,
            today,
            List.of(
                new PlanDtos.MealInput(
                    first, "Café", LocalTime.of(8, 0), Set.of(1, 2, 3, 4, 5, 6, 7), List.of(item)),
                new PlanDtos.MealInput(
                    second,
                    "Almoço",
                    LocalTime.of(12, 0),
                    Set.of(1, 2, 3, 4, 5, 6, 7),
                    List.of(item)))));
    var a = new MealTrackingController.Checkin(UUID.randomUUID(), today, first, List.of(item));
    var b = new MealTrackingController.Checkin(UUID.randomUUID(), today, second, List.of(item));
    for (var input : List.of(a, b))
      assertThat(request(client.http, "POST", "/api/meals/checkins", input).statusCode())
          .isEqualTo(200);
    String path = "/api/meals/checkins?date=" + today;
    assertThat(json.readTree(request(client.http, "GET", path, null).body()).size()).isEqualTo(2);
    assertThat(json.readTree(request(other.http, "GET", path, null).body()).size()).isZero();
    assertThat(
            request(
                    client.http,
                    "POST",
                    "/api/meals/checkins/undo",
                    new MealTrackingController.Undo(a.requestId()))
                .statusCode())
        .isEqualTo(200);
    var remaining = json.readTree(request(client.http, "GET", path, null).body());
    assertThat(remaining.size()).isEqualTo(1);
    assertThat(remaining.get(0).get("id").asText()).isEqualTo(b.requestId().toString());
    assertThat(
            request(
                    client.http,
                    "POST",
                    "/api/meals/checkins/undo",
                    new MealTrackingController.Undo(b.requestId()))
                .statusCode())
        .isEqualTo(200);
    assertThat(json.readTree(request(client.http, "GET", path, null).body()).size()).isZero();
    var next = new MealTrackingController.Checkin(UUID.randomUUID(), today, first, List.of(item));
    assertThat(request(client.http, "POST", "/api/meals/checkins", next).statusCode())
        .isEqualTo(200);
    assertThat(
            request(
                    client.http,
                    "POST",
                    "/api/meals/checkins/undo",
                    new MealTrackingController.Undo(a.requestId()))
                .statusCode())
        .isEqualTo(200);
    remaining = json.readTree(request(client.http, "GET", path, null).body());
    assertThat(remaining.size()).isEqualTo(1);
    assertThat(remaining.get(0).get("id").asText()).isEqualTo(next.requestId().toString());
  }

  @Test
  void evaluationsAreMonthlyVersionedAndRemainReadableAfterRevocation() throws Exception {
    var pro = person("NUTRITIONIST");
    var client = person("CLIENT");
    var other = person("NUTRITIONIST");
    var link = link(pro, client);
    var today = LocalDate.now(ZoneOffset.UTC);
    var input =
        new CareService.EvaluationInput(
            today,
            0,
            new BigDecimal("82"),
            new BigDecimal("180"),
            null,
            "Treino",
            "Exemplo fictício");
    String path = "/api/professional/clients/" + client.id + "/results";
    assertThat(request(other.http, "PUT", path, input).statusCode()).isEqualTo(404);
    assertThat(request(pro.http, "PUT", path, input).statusCode()).isEqualTo(200);
    assertThat(request(pro.http, "PUT", path, input).statusCode()).isEqualTo(409);
    assertThat(request(client.http, "PUT", "/api/results", input).statusCode()).isNotEqualTo(200);
    assertThat(json.readTree(request(client.http, "GET", "/api/results", null).body()).size())
        .isEqualTo(1);
    care.revoke(client.email, link);
    assertThat(request(pro.http, "GET", path, null).statusCode()).isEqualTo(404);
    assertThat(
            json.readTree(request(client.http, "GET", "/api/results", null).body())
                .get(0)
                .get("weight")
                .decimalValue())
        .isEqualByComparingTo("82");
  }

  @Test
  void deletingProfessionalPreservesClientHistoryAndClientDeletionRemovesIt() throws Exception {
    var pro = person("NUTRITIONIST");
    var client = person("CLIENT");
    link(pro, client);
    care.evaluate(
        pro.email,
        client.id,
        new CareService.EvaluationInput(
            LocalDate.now(ZoneOffset.UTC),
            0,
            new BigDecimal("82"),
            null,
            null,
            "",
            "Exemplo fictício"));
    accounts.delete(
        pro.email,
        new br.com.dietafacil.account.AccountDtos.Delete("Senha-ficticia-2026!", "EXCLUIR"));
    assertThat(care.links(client.email, false)).isEmpty();
    assertThat(care.evaluations(client.id)).hasSize(1);
    assertThat(request(client.http, "GET", "/api/results", null).statusCode()).isEqualTo(200);
    accounts.delete(
        client.email,
        new br.com.dietafacil.account.AccountDtos.Delete("Senha-ficticia-2026!", "EXCLUIR"));
    assertThat(
            access.db.queryForObject(
                "select count(*) from care_evaluations where user_id=?", Long.class, client.id))
        .isZero();
  }
}
