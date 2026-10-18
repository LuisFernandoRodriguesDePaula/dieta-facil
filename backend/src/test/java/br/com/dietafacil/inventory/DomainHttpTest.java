package br.com.dietafacil.inventory;

import static org.assertj.core.api.Assertions.*;

import java.net.*;
import java.net.http.*;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class DomainHttpTest {
  @Value("${local.server.port}")
  int port;

  @org.springframework.beans.factory.annotation.Autowired
  br.com.dietafacil.care.FeatureService features;

  ObjectMapper json = new ObjectMapper();

  HttpClient client() {
    return HttpClient.newBuilder()
        .cookieHandler(new CookieManager(null, CookiePolicy.ACCEPT_ALL))
        .build();
  }

  HttpResponse<String> send(
      HttpClient client, String method, String path, Object body, String key, boolean withCsrf)
      throws Exception {
    var request =
        HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
            .header("Content-Type", "application/json");
    if (withCsrf) {
      var csrf = parse(send(client, "GET", "/api/auth/csrf", null, null, false));
      request.header(csrf.get("headerName").asText(), csrf.get("token").asText());
    }
    if (key != null) request.header("Idempotency-Key", key);
    return client.send(
        request
            .method(
                method,
                body == null
                    ? HttpRequest.BodyPublishers.noBody()
                    : HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)))
            .build(),
        HttpResponse.BodyHandlers.ofString());
  }

  JsonNode parse(HttpResponse<String> response) {
    return json.readTree(response.body());
  }

  HttpClient account() throws Exception {
    var client = client();
    var email = "domain-http-" + UUID.randomUUID() + "@example.invalid";
    assertThat(
            send(
                    client,
                    "POST",
                    "/api/auth/register",
                    Map.of(
                        "name",
                        "Teste",
                        "email",
                        email,
                        "password",
                        "Senha-de-teste-2026!",
                        "timezone",
                        "UTC",
                        "role",
                        "NUTRITIONIST"),
                    null,
                    true)
                .statusCode())
        .isEqualTo(201);
    assertThat(
            send(
                    client,
                    "POST",
                    "/api/auth/login",
                    Map.of("email", email, "password", "Senha-de-teste-2026!"),
                    null,
                    true)
                .statusCode())
        .isEqualTo(200);
    features.demoTier(email, "PREMIUM");
    features.inventory(email, true, true);
    return client;
  }

  @Test
  void protectedEndpointsAndNestedValidation() throws Exception {
    var anonymous = client();
    assertThat(send(anonymous, "GET", "/api/inventory", null, null, false).statusCode())
        .isEqualTo(401);
    assertThat(send(anonymous, "GET", "/api/plan", null, null, false).statusCode()).isEqualTo(401);
    var client = account();
    assertThat(send(client, "POST", "/api/onboarding/scenario", Map.of(), null, false).statusCode())
        .isEqualTo(403);
    var today = LocalDate.now(ZoneOffset.UTC);
    assertThat(
            send(
                    client,
                    "PUT",
                    "/api/plan",
                    Map.of(
                        "version",
                        0,
                        "effectiveFrom",
                        today,
                        "meals",
                        Arrays.asList((Object) null)),
                    null,
                    true)
                .statusCode())
        .isEqualTo(400);
    assertThat(send(client, "POST", "/api/onboarding/scenario", Map.of(), null, true).statusCode())
        .isEqualTo(200);
    assertThat(send(client, "POST", "/api/onboarding/scenario", Map.of(), null, true).statusCode())
        .isEqualTo(200);
    assertThat(parse(send(client, "GET", "/api/inventory", null, null, false)).get("lots").size())
        .isEqualTo(7);
  }

  @Test
  void idempotencyOwnershipAndStorageOverHttp() throws Exception {
    var first = account();
    var second = account();
    send(first, "POST", "/api/onboarding/scenario", Map.of(), null, true);
    var stock = parse(send(first, "GET", "/api/inventory", null, null, false));
    JsonNode eggs = null;
    for (var lot : stock.get("lots")) if (lot.get("name").asText().equals("Ovos")) eggs = lot;
    var body = new LinkedHashMap<String, Object>();
    body.put("foodId", eggs.get("foodId").asText());
    body.put("basis", "AS_SOLD");
    body.put("quantity", "2");
    body.put("unit", "UNIT");
    body.put("location", "FRIDGE");
    body.put("condition", "SEALED");
    body.put("receivedDate", LocalDate.now(ZoneOffset.UTC).toString());
    body.put("expirySource", "UNKNOWN");
    body.put("knowledge", "PARTIAL");
    var key = UUID.randomUUID().toString();
    var created = send(first, "POST", "/api/inventory/entries", body, key, true);
    assertThat(created.statusCode()).isEqualTo(200);
    assertThat(send(first, "POST", "/api/inventory/entries", body, key, true).body())
        .isEqualTo(created.body());
    body.put("quantity", "3");
    assertThat(send(first, "POST", "/api/inventory/entries", body, key, true).statusCode())
        .isEqualTo(409);
    assertThat(
            send(second, "POST", "/api/inventory/entries", body, UUID.randomUUID().toString(), true)
                .statusCode())
        .isEqualTo(404);
    body.put("quantity", "0.5");
    assertThat(
            send(first, "POST", "/api/inventory/entries", body, UUID.randomUUID().toString(), true)
                .statusCode())
        .isEqualTo(400);
    var storage =
        Map.of(
            "version",
            eggs.get("version").asLong(),
            "location",
            "FREEZER",
            "condition",
            "SEALED",
            "expiry",
            eggs.get("expiry").asText(),
            "expirySource",
            eggs.get("expirySource").asText());
    assertThat(
            send(
                    second,
                    "PUT",
                    "/api/inventory/lots/" + eggs.get("id").asText(),
                    storage,
                    null,
                    true)
                .statusCode())
        .isEqualTo(404);
    var updated =
        send(first, "PUT", "/api/inventory/lots/" + eggs.get("id").asText(), storage, null, true);
    assertThat(updated.statusCode()).isEqualTo(200);
    assertThat(
            send(
                    first,
                    "PUT",
                    "/api/inventory/lots/" + eggs.get("id").asText(),
                    storage,
                    null,
                    true)
                .statusCode())
        .isEqualTo(409);
    assertThat(
            send(
                    second,
                    "POST",
                    "/api/inventory/reversals",
                    Map.of("operationId", parse(created).get("operationId").asText()),
                    UUID.randomUUID().toString(),
                    true)
                .statusCode())
        .isEqualTo(404);
    assertThat(
            send(
                    first,
                    "POST",
                    "/api/inventory/reversals",
                    Map.of("operationId", UUID.randomUUID().toString()),
                    UUID.randomUUID().toString(),
                    true)
                .statusCode())
        .isEqualTo(404);
  }
}
