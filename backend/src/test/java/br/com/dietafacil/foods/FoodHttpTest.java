package br.com.dietafacil.foods;

import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class FoodHttpTest {
    @Value("${local.server.port}") private int port;
    private final ObjectMapper json = new ObjectMapper();
    private static final String PASSWORD = "Alimentos-teste-2026!";

    @Test
    void catalogPersistsAndSupportsSearchEditArchiveRestoreAndVersionConflict() throws Exception {
        var email = email();
        var user = account(email);
        var created = request(user, "POST", "/api/foods", food("Arroz  integral", "KG"));
        assertThat(created.statusCode()).isEqualTo(201);
        var initial = parse(created);
        assertThat(initial.get("name").asText()).isEqualTo("Arroz integral");
        assertThat(initial.get("baseUnit").asText()).isEqualTo("G");
        var path = "/api/foods/" + initial.get("id").asText();
        var nextSession = login(client(), email);
        assertThat(request(nextSession, "GET", path, null).statusCode()).isEqualTo(200);
        assertThat(parse(request(user, "GET", "/api/foods?q=INTEGRAL", null)).get("totalElements").asInt()).isEqualTo(1);
        assertThat(parse(request(user, "GET", "/api/foods?q=%25", null)).get("totalElements").asInt()).isEqualTo(0);
        request(user, "POST", "/api/foods", food("Feijão", "G"));
        var firstPage = parse(request(user, "GET", "/api/foods?size=1", null));
        assertThat(firstPage.get("totalPages").asInt()).isEqualTo(2);
        var update = new HashMap<String, Object>(food("Arroz integral atualizado", "G"));
        update.put("version", initial.get("version").asLong());
        var edited = request(user, "PATCH", path, update);
        assertThat(edited.statusCode()).isEqualTo(200);
        assertThat(request(user, "PATCH", path, update).statusCode()).isEqualTo(409);
        var version = parse(edited).get("version").asLong();
        var archived = request(user, "PATCH", path + "/archive", Map.of("archived", true, "version", version));
        assertThat(archived.statusCode()).isEqualTo(200);
        assertThat(parse(request(user, "GET", "/api/foods", null)).get("totalElements").asInt()).isEqualTo(1);
        assertThat(parse(request(user, "GET", "/api/foods?archived=true", null)).get("totalElements").asInt()).isEqualTo(1);
        assertThat(request(user, "GET", path, null).statusCode()).isEqualTo(200);
        update.put("version", parse(archived).get("version").asLong());
        assertThat(request(user, "PATCH", path, update).statusCode()).isEqualTo(409);
        assertThat(request(user, "PATCH", path + "/archive", Map.of("archived", false, "version", parse(archived).get("version").asLong())).statusCode()).isEqualTo(200);
        assertThat(parse(request(user, "GET", "/api/foods", null)).get("totalElements").asInt()).isEqualTo(2);
        assertThat(request(user, "DELETE", path, null).statusCode()).isEqualTo(405);
    }

    @Test
    void otherAccountCannotReadEditArchiveConvertOrChooseAnOwner() throws Exception {
        var first = account(email());
        var second = account(email());
        var owner = parse(request(first, "GET", "/api/me", null)).get("id").asText();
        var created = parse(request(first, "POST", "/api/foods", food("Privado", "G")));
        var path = "/api/foods/" + created.get("id").asText();
        assertThat(parse(request(second, "GET", "/api/foods", null)).get("totalElements").asInt()).isEqualTo(0);
        assertThat(request(second, "GET", path, null).statusCode()).isEqualTo(404);
        var input = new HashMap<String, Object>(food("Tentativa", "G"));
        input.put("version", 0);
        assertThat(request(second, "PATCH", path, input).statusCode()).isEqualTo(404);
        assertThat(request(second, "PATCH", path + "/archive", Map.of("archived", true, "version", 0)).statusCode()).isEqualTo(404);
        assertThat(request(second, "POST", path + "/convert", conversion("1", "G", "KG", "RAW")).statusCode()).isEqualTo(404);
        input.put("userId", owner);
        assertThat(request(second, "POST", "/api/foods", input).statusCode()).isEqualTo(201);
        assertThat(parse(request(first, "GET", "/api/foods", null)).get("totalElements").asInt()).isEqualTo(1);
        assertThat(parse(request(second, "GET", "/api/foods", null)).get("totalElements").asInt()).isEqualTo(1);
    }

    @Test
    void validatesInputsAndKeepsDimensionImmutableAndCsrfRequired() throws Exception {
        var user = account(email());
        assertThat(send(client(), "GET", "/api/foods", null, null).statusCode()).isEqualTo(401);
        assertThat(send(user, "POST", "/api/foods", food("Sem CSRF", "G"), null).statusCode()).isEqualTo(403);
        assertThat(request(user, "POST", "/api/foods", food(" ", "G")).statusCode()).isEqualTo(400);
        assertThat(request(user, "POST", "/api/foods", food("Teste", "INVALID")).statusCode()).isEqualTo(400);
        assertThat(request(user, "GET", "/api/foods?size=0", null).statusCode()).isEqualTo(400);
        assertThat(request(user, "GET", "/api/foods?page=-1", null).statusCode()).isEqualTo(400);
        assertThat(request(user, "GET", "/api/foods/not-a-uuid", null).statusCode()).isEqualTo(400);
        var created = parse(request(user, "POST", "/api/foods", food("Arroz", "G")));
        var input = new HashMap<String, Object>(food("Arroz", "ML")); input.put("version", 0);
        assertThat(request(user, "PATCH", "/api/foods/" + created.get("id").asText(), input).statusCode()).isEqualTo(400);
    }

    @Test
    void conversionIsExactMaintainsBasisAndRejectsIncompatibleOrFractionalCounts() throws Exception {
        var user = account(email());
        var food = parse(request(user, "POST", "/api/foods", food("Arroz", "G")));
        var path = "/api/foods/" + food.get("id").asText() + "/convert";
        var converted = request(user, "POST", path, conversion("1.5", "KG", "G", "COOKED"));
        assertThat(converted.statusCode()).isEqualTo(200);
        assertThat(parse(converted).get("quantity").asText()).isEqualTo("1500");
        assertThat(parse(converted).get("basis").asText()).isEqualTo("COOKED");
        assertThat(request(user, "POST", path, conversion("1", "G", "ML", "RAW")).statusCode()).isEqualTo(400);
        assertThat(request(user, "POST", path, conversion("1", "L", "ML", "RAW")).statusCode()).isEqualTo(400);
        assertThat(request(user, "POST", path, conversion("-1", "G", "KG", "RAW")).statusCode()).isEqualTo(400);
        var egg = parse(request(user, "POST", "/api/foods", food("Ovo", "UNIT")));
        assertThat(request(user, "POST", "/api/foods/" + egg.get("id").asText() + "/convert", conversion("0.5", "UNIT", "UNIT", "AS_SOLD")).statusCode()).isEqualTo(400);
    }

    private HttpClient client() { return HttpClient.newBuilder().cookieHandler(new CookieManager(null, CookiePolicy.ACCEPT_ALL)).build(); }
    private String email() { return "food-" + UUID.randomUUID() + "@example.invalid"; }
    private Map<String, Object> food(String name, String unit) { return Map.of("name", name, "unit", unit, "category", "GRAINS", "purchaseFrequency", "WEEKLY"); }
    private Map<String, String> conversion(String quantity, String from, String to, String basis) { return Map.of("quantity", quantity, "from", from, "to", to, "basis", basis); }
    private JsonNode parse(HttpResponse<String> response) { return json.readTree(response.body()); }
    private HttpClient account(String email) throws Exception {
        var user = client();
        assertThat(request(user, "POST", "/api/auth/register", Map.of("name", "Catálogo teste", "email", email, "password", PASSWORD, "timezone", "America/Sao_Paulo", "role", "NUTRITIONIST")).statusCode()).isEqualTo(201);
        return login(user, email);
    }
    private HttpClient login(HttpClient user, String email) throws Exception {
        assertThat(request(user, "POST", "/api/auth/login", Map.of("email", email, "password", PASSWORD)).statusCode()).isEqualTo(200);
        return user;
    }
    private HttpResponse<String> request(HttpClient user, String method, String path, Object input) throws Exception {
        String token = method.equals("GET") ? null : parse(send(user, "GET", "/api/auth/csrf", null, null)).get("token").asText();
        return send(user, method, path, input, token);
    }
    private HttpResponse<String> send(HttpClient user, String method, String path, Object input, String token) throws Exception {
        var request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path));
        if (token != null) request.header("X-CSRF-TOKEN", token);
        if (input != null) request.header("Content-Type", "application/json");
        request.method(method, input == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(json.writeValueAsString(input)));
        return user.send(request.build(), HttpResponse.BodyHandlers.ofString());
    }
}
