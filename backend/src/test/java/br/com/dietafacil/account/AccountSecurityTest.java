package br.com.dietafacil.account;

import static org.assertj.core.api.Assertions.*;

import br.com.dietafacil.auth.*;
import br.com.dietafacil.demo.PersonalScenarioController;
import br.com.dietafacil.inventory.*;
import br.com.dietafacil.profile.UserRepository;
import java.net.*;
import java.net.http.*;
import java.nio.file.*;
import java.sql.Timestamp;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.*;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.*;

@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = {
      "app.mail.worker-enabled=false",
      "app.mail.encryption-key=test-only-not-a-production-secret",
      "app.mail.directory=../.local/test-mail"
    })
class AccountSecurityTest {
  @Value("${local.server.port}")
  int port;

  @Autowired AccountService accounts;
  @Autowired AuthService auth;
  @Autowired EmailOutbox outbox;
  @Autowired JdbcTemplate db;
  @Autowired UserRepository users;
  @Autowired PasswordEncoder passwords;
  @Autowired PersonalScenarioController scenarios;
  @Autowired InventoryService stock;
  ObjectMapper json = new ObjectMapper();

  String account() {
    var email = "security-" + UUID.randomUUID() + "@example.invalid";
    auth.register(new AuthDtos.Registration("Teste", email, "Senha-anterior-2026!", "UTC"));
    return email;
  }

  UUID owner(String email) {
    return users.findByEmail(email).orElseThrow().getId();
  }

  String token(String email) {
    var payload =
        db.queryForObject(
            "select payload from email_outbox where user_id=? and payload<>'' order by created_at"
                + " desc limit 1",
            String.class,
            owner(email));
    return outbox.decrypt(payload).body().split("#token=")[1].split("\\s")[0];
  }

  HttpClient client() {
    return HttpClient.newBuilder()
        .cookieHandler(new CookieManager(null, CookiePolicy.ACCEPT_ALL))
        .build();
  }

  HttpResponse<String> request(
      HttpClient client, String method, String path, Object input, boolean csrf) throws Exception {
    var req =
        HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
            .header("Content-Type", "application/json");
    if (csrf) {
      var response = request(client, "GET", "/api/auth/csrf", null, false);
      var token = json.readTree(response.body());
      req.header(token.get("headerName").asText(), token.get("token").asText());
    }
    return client.send(
        req.method(
                method,
                input == null
                    ? HttpRequest.BodyPublishers.noBody()
                    : HttpRequest.BodyPublishers.ofString(json.writeValueAsString(input)))
            .build(),
        HttpResponse.BodyHandlers.ofString());
  }

  @Test
  void resetIsSingleUseHashedAndEndsExistingSessions() throws Exception {
    var email = account();
    var client = client();
    assertThat(
            request(
                    client,
                    "POST",
                    "/api/auth/login",
                    Map.of("email", email, "password", "Senha-anterior-2026!"),
                    true)
                .statusCode())
        .isEqualTo(200);
    var known = request(client, "POST", "/api/auth/forgot-password", Map.of("email", email), true);
    var unknown =
        request(
            client,
            "POST",
            "/api/auth/forgot-password",
            Map.of("email", "unknown-" + UUID.randomUUID() + "@example.invalid"),
            true);
    assertThat(known.statusCode()).isEqualTo(202);
    assertThat(unknown.body()).isEqualTo(known.body());
    var token = token(email);
    assertThat(
            db.queryForObject(
                "select token_hash from account_tokens where user_id=?",
                String.class,
                owner(email)))
        .isEqualTo(AccountService.hash(token))
        .doesNotContain(token);
    assertThat(
            db.queryForObject(
                "select payload from email_outbox where user_id=?", String.class, owner(email)))
        .doesNotContain(token, email);
    assertThat(
            request(
                    client,
                    "POST",
                    "/api/auth/reset-password",
                    Map.of("token", token, "password", "Senha-nova-2026!"),
                    true)
                .statusCode())
        .isEqualTo(200);
    assertThat(request(client, "GET", "/api/me", null, false).statusCode()).isEqualTo(401);
    assertThat(
            request(
                    client,
                    "POST",
                    "/api/auth/reset-password",
                    Map.of("token", token, "password", "Outra-senha-2026!"),
                    true)
                .statusCode())
        .isEqualTo(400);
    assertThat(
            request(
                    client,
                    "POST",
                    "/api/auth/login",
                    Map.of("email", email, "password", "Senha-anterior-2026!"),
                    true)
                .statusCode())
        .isEqualTo(401);
    assertThat(
            request(
                    client,
                    "POST",
                    "/api/auth/login",
                    Map.of("email", email, "password", "Senha-nova-2026!"),
                    true)
                .statusCode())
        .isEqualTo(200);
  }

  @Test
  void verificationTokenCannotResetPasswordAndExpiredTokenIsRejected() {
    var email = account();
    accounts.issue(email, "VERIFY");
    var token = token(email);
    assertThatThrownBy(() -> accounts.reset(new AccountDtos.Reset(token, "Outra-senha-2026!")))
        .isInstanceOf(ResponseStatusException.class)
        .hasMessageContaining("400");
    accounts.verify(token);
    assertThat(accounts.status(email).emailVerified()).isTrue();
    assertThatThrownBy(() -> accounts.verify(token))
        .isInstanceOf(ResponseStatusException.class)
        .hasMessageContaining("400");
    accounts.issue(email, "RESET");
    var reset = token(email);
    db.update(
        "update account_tokens set expires_at=? where user_id=?",
        Timestamp.from(Instant.now().minusSeconds(1)),
        owner(email));
    assertThatThrownBy(() -> accounts.reset(new AccountDtos.Reset(reset, "Outra-senha-2026!")))
        .isInstanceOf(ResponseStatusException.class)
        .hasMessageContaining("400");
  }

  @Test
  void deliveryClearsEncryptedPayloadAndHasCooldown() throws Exception {
    var email = account();
    accounts.issue(email, "RESET");
    accounts.issue(email, "RESET");
    assertThat(
            db.queryForObject(
                "select count(*) from email_outbox where user_id=?", Long.class, owner(email)))
        .isEqualTo(1);
    var id =
        db.queryForObject("select id from email_outbox where user_id=?", UUID.class, owner(email));
    outbox.sendPending();
    assertThat(db.queryForObject("select payload from email_outbox where id=?", String.class, id))
        .isEmpty();
    var path = Path.of("../.local/test-mail", id + ".json");
    assertThat(Files.readString(path)).contains(email, "#token=");
    Files.delete(path);
  }

  @Test
  void deletingPopulatedHypertrophyAccountKeepsOtherAccountsAndRequiresPassword() throws Exception {
    var email = account();
    var other = account();
    var id = owner(email);
    scenarios.create(
        UsernamePasswordAuthenticationToken.authenticated(email, "", List.of()), "hypertrophy");
    assertThat(stock.snapshot(email).lots()).hasSize(18);
    stock.reverse(
        email,
        UUID.randomUUID().toString(),
        new InventoryDtos.Reversal(stock.snapshot(email).history().getFirst().id()));
    assertThatThrownBy(
            () -> accounts.delete(email, new AccountDtos.Delete("Senha-errada-2026!", "EXCLUIR")))
        .isInstanceOf(ResponseStatusException.class);
    var client = client();
    request(
        client,
        "POST",
        "/api/auth/login",
        Map.of("email", email, "password", "Senha-anterior-2026!"),
        true);
    assertThat(
            request(
                    client,
                    "DELETE",
                    "/api/account",
                    Map.of("password", "Senha-anterior-2026!", "confirmation", "EXCLUIR"),
                    false)
                .statusCode())
        .isEqualTo(403);
    assertThat(
            request(
                    client,
                    "DELETE",
                    "/api/account",
                    Map.of("password", "Senha-anterior-2026!", "confirmation", "EXCLUIR"),
                    true)
                .statusCode())
        .isEqualTo(204);
    assertThat(users.findById(id)).isEmpty();
    assertThat(users.findByEmail(other)).isPresent();
    assertThat(request(client, "GET", "/api/me", null, false).statusCode()).isEqualTo(401);
  }
}
