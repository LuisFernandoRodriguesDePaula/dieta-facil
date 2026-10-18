package br.com.dietafacil.account;

import static br.com.dietafacil.domain.DomainAccess.error;

import java.net.URI;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.*;
import java.sql.Timestamp;
import java.time.*;
import java.util.*;
import javax.crypto.Cipher;
import javax.crypto.spec.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;

@Service
@EnableScheduling
public class EmailOutbox {
  private final JdbcTemplate db;
  private final ObjectMapper json;
  private final HttpClient sender =
      HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
  private final TransactionTemplate transaction;
  private final String mode, secret, from, apiKey;
  private final Path directory;
  private final boolean enabled;
  private byte[] localSecret;

  public record Message(String to, String subject, String body) {}

  public EmailOutbox(
      JdbcTemplate db,
      ObjectMapper json,
      TransactionTemplate transaction,
      Environment env,
      @Value("${app.mail.mode:file}") String mode,
      @Value("${app.mail.encryption-key:}") String secret,
      @Value("${app.mail.from:}") String from,
      @Value("${app.mail.api-key:}") String apiKey,
      @Value("${app.mail.directory:../.local/mail}") String directory,
      @Value("${app.mail.worker-enabled:true}") boolean enabled) {
    this.db = db;
    this.json = json;
    this.apiKey = apiKey;
    this.transaction = transaction;
    this.mode = mode;
    this.secret = secret;
    this.from = from;
    this.directory = Path.of(directory).toAbsolutePath().normalize();
    this.enabled = enabled;
    if (env.acceptsProfiles(org.springframework.core.env.Profiles.of("prod"))
        && mode.equals("file"))
      throw new IllegalStateException("E-mail por arquivo não é permitido no perfil prod.");
  }

  public boolean localDelivery() {
    return mode.equals("file");
  }

  public boolean available() {
    return mode.equals("file")
        || (mode.equals("brevo") && !secret.isBlank() && !from.isBlank() && !apiKey.isBlank());
  }

  private synchronized byte[] key() throws Exception {
    if (!secret.isBlank())
      return MessageDigest.getInstance("SHA-256").digest(secret.getBytes(StandardCharsets.UTF_8));
    if (!mode.equals("file")) throw error(503, "O envio de e-mail ainda não foi configurado.");
    if (localSecret == null) {
      Files.createDirectories(directory);
      var path = directory.resolve(".encryption-key");
      if (!Files.exists(path)) {
        var bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        try {
          Files.write(path, bytes, StandardOpenOption.CREATE_NEW);
        } catch (FileAlreadyExistsException ignored) {
        }
      }
      localSecret = Files.readAllBytes(path);
    }
    return localSecret;
  }

  private String encrypt(Message message) {
    try {
      var iv = new byte[12];
      new SecureRandom().nextBytes(iv);
      var cipher = Cipher.getInstance("AES/GCM/NoPadding");
      cipher.init(
          Cipher.ENCRYPT_MODE, new SecretKeySpec(key(), "AES"), new GCMParameterSpec(128, iv));
      return Base64.getEncoder().encodeToString(iv)
          + "."
          + Base64.getEncoder().encodeToString(cipher.doFinal(json.writeValueAsBytes(message)));
    } catch (Exception ex) {
      throw new IllegalStateException("Não foi possível preparar o e-mail.", ex);
    }
  }

  Message decrypt(String payload) {
    try {
      var parts = payload.split("\\.");
      var cipher = Cipher.getInstance("AES/GCM/NoPadding");
      cipher.init(
          Cipher.DECRYPT_MODE,
          new SecretKeySpec(key(), "AES"),
          new GCMParameterSpec(128, Base64.getDecoder().decode(parts[0])));
      return json.readValue(cipher.doFinal(Base64.getDecoder().decode(parts[1])), Message.class);
    } catch (Exception ex) {
      throw new IllegalStateException("Não foi possível abrir o e-mail pendente.", ex);
    }
  }

  public void queue(UUID owner, Message message, Instant expires) {
    if (!available()) throw error(503, "O envio de e-mail ainda não foi configurado.");
    var now = Timestamp.from(Instant.now());
    db.update(
        "insert into email_outbox values (?,?,?,0,?,?,?,null)",
        UUID.randomUUID(),
        owner,
        encrypt(message),
        now,
        Timestamp.from(expires),
        now);
  }

  @Scheduled(fixedDelayString = "${app.mail.poll-ms:10000}")
  public void dispatch() {
    if (!enabled) return;
    sendPending();
  }

  public void sendPending() {
    db.update(
        "update email_outbox set payload='' where expires_at<? and payload<>''",
        Timestamp.from(Instant.now()));
    var ids =
        db.queryForList(
            "select id from email_outbox where sent_at is null and payload<>'' and next_attempt<=?"
                + " and expires_at>? order by created_at limit 20",
            UUID.class,
            Timestamp.from(Instant.now()),
            Timestamp.from(Instant.now()));
    for (var id : ids)
      transaction.executeWithoutResult(
          status -> {
            var messages =
                db.query(
                    "select payload,attempts from email_outbox where id=? and sent_at is null and"
                        + " payload<>'' and expires_at>? for update",
                    (r, n) -> new Object[] {r.getString(1), r.getInt(2)},
                    id,
                    Timestamp.from(Instant.now()));
            if (messages.isEmpty()) return;
            var row = messages.getFirst();
            try {
              var message = decrypt((String) row[0]);
              if (mode.equals("file")) {
                Files.createDirectories(directory);
                Files.writeString(
                    directory.resolve(id + ".json"),
                    json.writerWithDefaultPrettyPrinter().writeValueAsString(message),
                    StandardOpenOption.CREATE,
                    StandardOpenOption.TRUNCATE_EXISTING);
              } else {
                var body =
                    Map.of(
                        "sender",
                        Map.of("name", "Dieta Fácil", "email", from),
                        "to",
                        List.of(Map.of("email", message.to())),
                        "subject",
                        message.subject(),
                        "textContent",
                        message.body());
                var request =
                    HttpRequest.newBuilder(URI.create("https://api.brevo.com/v3/smtp/email"))
                        .timeout(Duration.ofSeconds(10))
                        .header("api-key", apiKey)
                        .header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)))
                        .build();
                var response = sender.send(request, HttpResponse.BodyHandlers.discarding());
                if (response.statusCode() < 200 || response.statusCode() >= 300)
                  throw new IllegalStateException("O provedor não aceitou o envio.");
              }
              db.update(
                  "update email_outbox set payload='',sent_at=? where id=?",
                  Timestamp.from(Instant.now()),
                  id);
            } catch (Exception ex) {
              var attempt = (Integer) row[1] + 1;
              db.update(
                  "update email_outbox set attempts=?,next_attempt=? where id=?",
                  attempt,
                  Timestamp.from(
                      Instant.now().plusSeconds(Math.min(900, 30L * (1L << Math.min(attempt, 5))))),
                  id);
              // Tokens, recipients and provider errors are deliberately excluded from logs.
            }
          });
  }
}
