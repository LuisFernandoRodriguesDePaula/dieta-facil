package br.com.dietafacil.account;

import static org.assertj.core.api.Assertions.*;

import br.com.dietafacil.auth.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;

@SpringBootTest(
    properties = {
      "app.require-verified-email=true",
      "app.mail.mode=file",
      "app.mail.worker-enabled=false",
      "app.mail.encryption-key=verification-test-only-encryption"
    })
class VerificationGateTest {
  @Autowired AuthController auth;
  @Autowired AccountService accounts;
  @Autowired EmailOutbox outbox;
  @Autowired JdbcTemplate db;

  @AfterEach
  void clear() {
    SecurityContextHolder.clearContext();
  }

  @Test
  void registrationQueuesVerificationAndLoginRequiresValidEmailAfterPasswordCheck() {
    var address = "verification-" + UUID.randomUUID() + "@example.invalid";
    var password = "Senha-de-teste-2026!";
    var user = auth.register(new AuthDtos.Registration("Teste", address, password, "UTC"));
    assertThatThrownBy(
            () ->
                auth.login(
                    new AuthDtos.Login(address, password),
                    new MockHttpServletRequest(),
                    new MockHttpServletResponse()))
        .isInstanceOf(ResponseStatusException.class)
        .hasMessageContaining("403");
    var encrypted =
        db.queryForObject(
            "select payload from email_outbox where user_id=?", String.class, user.id());
    var token = outbox.decrypt(encrypted).body().split("#token=")[1].split("\\s")[0];
    accounts.verify(token);
    assertThat(
            auth.login(
                    new AuthDtos.Login(address, password),
                    new MockHttpServletRequest(),
                    new MockHttpServletResponse())
                .id())
        .isEqualTo(user.id());
  }
}
