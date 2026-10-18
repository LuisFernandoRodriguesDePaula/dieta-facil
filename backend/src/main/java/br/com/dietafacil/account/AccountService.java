package br.com.dietafacil.account;

import static br.com.dietafacil.domain.DomainAccess.error;

import br.com.dietafacil.auth.*;
import br.com.dietafacil.domain.DomainAccess;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.sql.Timestamp;
import java.time.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AccountService {
  private final DomainAccess access;
  private final AuthService auth;
  private final PasswordEncoder passwords;
  private final EmailOutbox email;
  private final String baseUrl;
  private final boolean requireVerification;

  public AccountService(
      DomainAccess access,
      AuthService auth,
      PasswordEncoder passwords,
      EmailOutbox email,
      @Value("${app.public-base-url:http://127.0.0.1:5173}") String baseUrl,
      @Value("${app.require-verified-email:false}") boolean requireVerification) {
    this.access = access;
    this.auth = auth;
    this.passwords = passwords;
    this.email = email;
    this.baseUrl = baseUrl.replaceAll("/+$", "");
    this.requireVerification = requireVerification;
    if (!this.baseUrl.matches("https?://[^/?#]+"))
      throw new IllegalArgumentException(
          "Defina uma origem pública válida para os links de acesso.");
  }

  public boolean localDelivery() {
    return email.localDelivery();
  }

  public boolean verificationRequired() {
    return requireVerification;
  }

  public AccountDtos.Status status(String address) {
    return new AccountDtos.Status(
        auth.currentUser(address).getEmailVerifiedAt() != null,
        requireVerification,
        email.available());
  }

  public static String hash(String token) {
    try {
      return HexFormat.of()
          .formatHex(
              MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)));
    } catch (NoSuchAlgorithmException ex) {
      throw new IllegalStateException(ex);
    }
  }

  @Transactional
  public void issue(String address, String purpose) {
    if (!email.available()) throw error(503, "O envio de e-mail ainda não foi configurado.");
    var normalized = AuthService.normalizeEmail(address);
    var ids = access.db.queryForList("select id from users where email=?", UUID.class, normalized);
    if (ids.isEmpty()) return;
    var owner = ids.getFirst();
    access.db.queryForObject("select id from users where id=? for update", UUID.class, owner);
    if (purpose.equals("VERIFY")
        && access.db.queryForObject(
                "select count(*) from users where id=? and email_verified_at is not null",
                Long.class,
                owner)
            > 0) return;
    var recent =
        access.db.queryForObject(
            "select count(*) from account_tokens where user_id=? and purpose=? and created_at>?",
            Long.class,
            owner,
            purpose,
            Timestamp.from(Instant.now().minusSeconds(60)));
    if (recent > 0) return;
    access.db.update("delete from account_tokens where user_id=? and purpose=?", owner, purpose);
    var bytes = new byte[32];
    new SecureRandom().nextBytes(bytes);
    var token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    var now = Instant.now();
    var expires = now.plusSeconds(purpose.equals("RESET") ? 1800 : 86400);
    access.db.update(
        "insert into account_tokens values (?,?,?,?,?,?)",
        UUID.randomUUID(),
        owner,
        hash(token),
        purpose,
        Timestamp.from(expires),
        Timestamp.from(now));
    var reset = purpose.equals("RESET");
    var link = baseUrl + (reset ? "/redefinir-senha" : "/confirmar-email") + "#token=" + token;
    email.queue(
        owner,
        new EmailOutbox.Message(
            normalized,
            reset ? "Redefina sua senha no Dieta Fácil" : "Confirme seu e-mail no Dieta Fácil",
            (reset
                    ? "Você solicitou redefinir a senha. O link vale por 30 minutos."
                    : "Confirme seu endereço. O link vale por 24 horas.")
                + "\n\n"
                + link
                + "\n\nSe não solicitou, ignore este e-mail."),
        expires);
  }

  private UUID consume(String token, String purpose) {
    var owners =
        access.db.queryForList(
            "select user_id from account_tokens where token_hash=? and purpose=?",
            UUID.class,
            hash(token),
            purpose);
    if (owners.isEmpty()) throw error(400, "Link inválido ou expirado. Solicite um novo.");
    var owner = owners.getFirst();
    access.db.queryForObject("select id from users where id=? for update", UUID.class, owner);
    var removed =
        access.db.update(
            "delete from account_tokens where user_id=? and token_hash=? and purpose=? and"
                + " expires_at>?",
            owner,
            hash(token),
            purpose,
            Timestamp.from(Instant.now()));
    if (removed != 1) throw error(400, "Link inválido ou expirado. Solicite um novo.");
    return owner;
  }

  @Transactional
  public void reset(AccountDtos.Reset input) {
    if (input.password().getBytes(StandardCharsets.UTF_8).length > 72)
      throw error(400, "A senha deve ter até 72 bytes em UTF-8.");
    var owner = consume(input.token(), "RESET");
    access.db.update(
        "update users set password_hash=?,credential_version=credential_version+1 where id=?",
        passwords.encode(input.password()),
        owner);
    access.db.update("delete from account_tokens where user_id=? and purpose='RESET'", owner);
  }

  @Transactional
  public void verify(String token) {
    var owner = consume(token, "VERIFY");
    access.db.update(
        "update users set email_verified_at=? where id=?", Timestamp.from(Instant.now()), owner);
  }

  @Transactional
  public void delete(String address, AccountDtos.Delete input) {
    if (input.password().getBytes(StandardCharsets.UTF_8).length > 72)
      throw error(400, "A senha de confirmação não está correta.");
    var owner = access.lock(address);
    if (!passwords.matches(input.password(), auth.currentUser(address).getPasswordHash()))
      throw error(400, "A senha de confirmação não está correta.");
    access.db.update("update inventory_operations set reversal_of=null where user_id=?", owner);
    for (var table :
        List.of(
            "meal_substitution_actions",
            "meal_overrides",
            "meal_substitution_rules",
            "email_outbox",
            "account_tokens",
            "shopping_receipts",
            "inventory_movements",
            "inventory_operations",
            "shopping_lists",
            "meal_occurrences",
            "plan_revisions",
            "diet_plans",
            "inventory_lots",
            "inventory_accounts",
            "demo_scenarios",
            "shopping_preferences",
            "foods")) access.db.update("delete from " + table + " where user_id=?", owner);
    access.db.update("delete from users where id=?", owner);
  }
}
