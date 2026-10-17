package br.com.dietafacil.auth;

import br.com.dietafacil.profile.UserRepository;
import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class AuthHttpTest {
    @Value("${local.server.port}") private int port;
    @Autowired private UserRepository users;
    @Autowired private PasswordEncoder encoder;
    private final ObjectMapper json = new ObjectMapper();
    private static final String PASSWORD = "Senha-de-teste-2026!";

    @Test
    void registrationLoginRotationLogoutAndStaleSession() throws Exception {
        var client = client();
        var email = email();
        assertThat(send(client, "GET", "/api/me", null, null).statusCode()).isEqualTo(401);
        assertThat(send(client, "GET", "/api/demo/schedule", null, null).statusCode()).isEqualTo(200);
        var csrfResponse = send(client, "GET", "/api/auth/csrf", null, null);
        assertThat(csrfResponse.headers().firstValue("set-cookie").orElseThrow()).contains("HttpOnly", "SameSite=Lax");
        var token = token(csrfResponse);
        var initialCookie = cookies(client);
        var registration = send(client, "POST", "/api/auth/register", registration(email.toUpperCase()), token);
        assertThat(registration.statusCode()).isEqualTo(201);
        assertThat(registration.body()).doesNotContain("password", "hash", PASSWORD);
        assertThat(send(client, "GET", "/api/me", null, null).statusCode()).isEqualTo(401);
        var stored = users.findByEmail(email).orElseThrow();
        assertThat(stored.getPasswordHash()).isNotEqualTo(PASSWORD);
        assertThat(encoder.matches(PASSWORD, stored.getPasswordHash())).isTrue();
        var login = send(client, "POST", "/api/auth/login", Map.of("email", email, "password", PASSWORD), token);
        assertThat(login.statusCode()).isEqualTo(200);
        assertThat(cookies(client)).isNotEqualTo(initialCookie);
        assertThat(send(client, "GET", "/api/me", null, null).body()).contains(email);
        assertThat(send(client, "PATCH", "/api/me", Map.of("name", "Nome", "timezone", "UTC"), token).statusCode()).isEqualTo(403);
        var fresh = csrf(client);
        var logout = send(client, "POST", "/api/auth/logout", null, fresh);
        assertThat(logout.statusCode()).isEqualTo(204);
        assertThat(send(client, "GET", "/api/me", null, null).statusCode()).isEqualTo(401);
        var staleRequest = HttpRequest.newBuilder(uri("/api/me")).header("Cookie", "JSESSIONID=expired-session").GET().build();
        assertThat(HttpClient.newHttpClient().send(staleRequest, HttpResponse.BodyHandlers.ofString()).statusCode()).isEqualTo(401);
    }

    @Test
    void requiresCsrfAndRejectsInvalidDuplicateAndBadCredentials() throws Exception {
        var client = client();
        var email = email();
        assertThat(send(client, "POST", "/api/auth/register", registration(email), null).statusCode()).isEqualTo(403);
        assertThat(send(client, "POST", "/api/auth/login", Map.of("email", email, "password", PASSWORD), null).statusCode()).isEqualTo(403);
        var token = csrf(client);
        assertThat(send(client, "POST", "/api/auth/register", Map.of("name", " ", "email", "invalid", "password", "short", "timezone", "bad"), token).statusCode()).isEqualTo(400);
        var invalidTimezone = Map.of("name", "Teste", "email", email, "password", PASSWORD, "timezone", "Invalid/Timezone");
        assertThat(send(client, "POST", "/api/auth/register", invalidTimezone, token).statusCode()).isEqualTo(400);
        var unicodePassword = Map.of("name", "Teste", "email", email, "password", "á".repeat(40), "timezone", "UTC");
        assertThat(send(client, "POST", "/api/auth/register", unicodePassword, token).statusCode()).isEqualTo(400);
        assertThat(send(client, "POST", "/api/auth/register", registration(email), token).statusCode()).isEqualTo(201);
        assertThat(send(client, "POST", "/api/auth/register", registration(email.toUpperCase()), token).statusCode()).isEqualTo(409);
        var wrong = send(client, "POST", "/api/auth/login", Map.of("email", email, "password", "senha-errada"), token);
        var unknown = send(client, "POST", "/api/auth/login", Map.of("email", email(), "password", PASSWORD), token);
        assertThat(wrong.statusCode()).isEqualTo(401);
        assertThat(unknown.body()).isEqualTo(wrong.body());
        assertThat(send(client, "GET", "/api/me", null, null).statusCode()).isEqualTo(401);
    }

    @Test
    void profileIsBoundToSessionAndPersistsAcrossLogin() throws Exception {
        var first = client();
        var second = client();
        var emailA = email();
        var emailB = email();
        registerAndLogin(first, emailA);
        registerAndLogin(second, emailB);
        var profileB = parse(send(second, "GET", "/api/me", null, null));
        var update = send(first, "PATCH", "/api/me", Map.of("name", "Nome atualizado", "timezone", "America/Manaus", "id", profileB.get("id").asText(), "email", emailB), csrf(first));
        // Extra identity fields may be ignored or rejected, but can never select another account.
        assertThat(update.statusCode()).isIn(200, 400);
        if (update.statusCode() == 400) {
            assertThat(send(first, "PATCH", "/api/me", Map.of("name", "Nome atualizado", "timezone", "America/Manaus"), csrf(first)).statusCode()).isEqualTo(200);
        }
        assertThat(parse(send(first, "GET", "/api/me", null, null)).get("name").asText()).isEqualTo("Nome atualizado");
        assertThat(parse(send(second, "GET", "/api/me", null, null)).get("name").asText()).isEqualTo("Pessoa de teste");
        assertThat(send(first, "GET", "/api/me/" + profileB.get("id").asText(), null, null).statusCode()).isEqualTo(404);
        var anotherSession = client();
        assertThat(send(anotherSession, "POST", "/api/auth/login", Map.of("email", emailA, "password", PASSWORD), csrf(anotherSession)).statusCode()).isEqualTo(200);
        assertThat(parse(send(anotherSession, "GET", "/api/me", null, null)).get("timezone").asText()).isEqualTo("America/Manaus");
    }

    private HttpClient client() { return HttpClient.newBuilder().cookieHandler(new CookieManager(null, CookiePolicy.ACCEPT_ALL)).build(); }
    private URI uri(String path) { return URI.create("http://127.0.0.1:" + port + path); }
    private String email() { return "test-" + UUID.randomUUID() + "@example.invalid"; }
    private Map<String, String> registration(String email) { return Map.of("name", "Pessoa de teste", "email", email, "password", PASSWORD, "timezone", "America/Sao_Paulo"); }
    private String cookies(HttpClient client) { return ((CookieManager) client.cookieHandler().orElseThrow()).getCookieStore().getCookies().toString(); }
    private JsonNode parse(HttpResponse<String> response) { return json.readTree(response.body()); }
    private String token(HttpResponse<String> response) { return parse(response).get("token").asText(); }
    private String csrf(HttpClient client) throws Exception { return token(send(client, "GET", "/api/auth/csrf", null, null)); }
    private void registerAndLogin(HttpClient client, String email) throws Exception {
        assertThat(send(client, "POST", "/api/auth/register", registration(email), csrf(client)).statusCode()).isEqualTo(201);
        assertThat(send(client, "POST", "/api/auth/login", Map.of("email", email, "password", PASSWORD), csrf(client)).statusCode()).isEqualTo(200);
    }
    private HttpResponse<String> send(HttpClient client, String method, String path, Object body, String csrf) throws Exception {
        var request = HttpRequest.newBuilder(uri(path));
        if (csrf != null) request.header("X-CSRF-TOKEN", csrf);
        if (body != null) request.header("Content-Type", "application/json");
        request.method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)));
        return client.send(request.build(), HttpResponse.BodyHandlers.ofString());
    }
}
