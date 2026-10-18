package br.com.dietafacil.care;

import static br.com.dietafacil.domain.DomainAccess.error;

import br.com.dietafacil.auth.AuthService;
import br.com.dietafacil.domain.DomainAccess;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CareService {
  private final DomainAccess access;
  private final FeatureService features;

  public CareService(DomainAccess access, FeatureService features) {
    this.access = access;
    this.features = features;
  }

  public record Invitation(
      @NotBlank @Email @Size(max = 254) String email, @NotBlank @Size(max = 100) String name) {}

  public record EvaluationInput(
      @NotNull LocalDate date,
      @PositiveOrZero long version,
      @NotNull @DecimalMin("1") @DecimalMax("500") @Digits(integer = 3, fraction = 2)
          BigDecimal weight,
      @DecimalMin("1") @DecimalMax("300") @Digits(integer = 3, fraction = 2) BigDecimal height,
      @DecimalMin("1") @DecimalMax("300") @Digits(integer = 3, fraction = 2) BigDecimal waist,
      @NotNull @Size(max = 500) String goal,
      @NotNull @Size(max = 2000) String notes) {}

  public record Link(
      UUID id,
      UUID clientId,
      String name,
      String email,
      String professionalName,
      String status,
      Instant expiresAt) {}

  public record Evaluation(
      UUID id,
      LocalDate date,
      long version,
      String authorName,
      BigDecimal weight,
      BigDecimal height,
      BigDecimal waist,
      String goal,
      String notes) {}

  public List<Link> links(String email, boolean professional) {
    var owner = access.owner(email);
    if (professional) features.professional(email);
    return access.db.query(
        "select l.*,p.name as professional_name,c.name as client_name from professional_links l"
            + " join users p on p.id=l.professional_id left join users c on c.id=l.client_id where "
            + (professional
                ? "l.professional_id=?"
                : "(l.client_id=? or (l.recipient_email=? and l.status='PENDING' and"
                    + " l.expires_at>?))")
            + " order by l.status,l.display_name",
        (r, n) ->
            new Link(
                r.getObject("id", UUID.class),
                r.getObject("client_id", UUID.class),
                r.getString("client_name") == null
                    ? r.getString("display_name")
                    : r.getString("client_name"),
                r.getString("recipient_email"),
                r.getString("professional_name"),
                r.getString("status"),
                r.getTimestamp("expires_at").toInstant()),
        professional
            ? new Object[] {owner}
            : new Object[] {owner, email, Timestamp.from(Instant.now())});
  }

  @Transactional
  public List<Link> invite(String email, Invitation input) {
    features.professional(email);
    var owner = access.lock(email);
    var recipient = AuthService.normalizeEmail(input.email());
    if (recipient.equals(email)) throw error(400, "Escolha o e-mail do cliente.");
    var existing =
        access.db.queryForList(
            "select id,status from professional_links where professional_id=? and"
                + " recipient_email=?",
            owner,
            recipient);
    if (!existing.isEmpty() && existing.getFirst().get("status").equals("ACTIVE"))
      throw error(409, "Este cliente já está vinculado.");
    if (!existing.isEmpty())
      access.db.update("delete from professional_links where id=?", existing.getFirst().get("id"));
    access.db.update(
        "insert into professional_links values (?,?,null,?,?,'PENDING',?)",
        UUID.randomUUID(),
        owner,
        recipient,
        input.name().strip(),
        Timestamp.from(Instant.now().plusSeconds(7 * 86400)));
    return links(email, true);
  }

  @Transactional
  public List<Link> accept(String email, UUID id) {
    var owner = access.lock(email);
    if (!features.get(owner).role().equals("CLIENT"))
      throw error(403, "Use uma conta de cliente para aceitar o acompanhamento.");
    var rows =
        access.db.queryForList(
            "select * from professional_links where id=? and recipient_email=? and status='PENDING'"
                + " and expires_at>?",
            id,
            email,
            Timestamp.from(Instant.now()));
    if (rows.isEmpty()) throw error(404, "Convite não encontrado ou expirado.");
    if (access.db.queryForObject(
            "select count(*) from professional_links where client_id=? and status='ACTIVE'",
            Long.class,
            owner)
        > 0) throw error(409, "Revogue o vínculo atual antes de aceitar outro nutricionista.");
    access.db.update(
        "update professional_links set client_id=?,status='ACTIVE' where id=?", owner, id);
    return links(email, false);
  }

  @Transactional
  public void revoke(String email, UUID id) {
    var actor = access.owner(email);
    var rows =
        access.db.queryForList(
            "select * from professional_links where id=? and (professional_id=? or client_id=? or"
                + " recipient_email=?)",
            id,
            actor,
            actor,
            email);
    if (rows.isEmpty()) throw error(404, "Vínculo não encontrado.");
    var row = rows.getFirst();
    if (row.get("client_id") != null)
      access.db.queryForObject(
          "select id from users where id=? for update", UUID.class, row.get("client_id"));
    access.db.update("update professional_links set status='REVOKED' where id=?", id);
  }

  public String clientEmail(String professional, UUID client, boolean write) {
    features.professional(professional);
    if (write) {
      var owners =
          access.db.queryForList("select id from users where id=? for update", UUID.class, client);
      if (owners.isEmpty()) throw error(404, "Cliente não encontrado.");
    }
    var rows =
        access.db.queryForList(
            "select u.email from users u join professional_links l on l.client_id=u.id where"
                + " l.professional_id=? and l.client_id=? and l.status='ACTIVE'",
            String.class,
            access.owner(professional),
            client);
    if (rows.isEmpty()) throw error(404, "Cliente não vinculado ou acesso revogado.");
    return rows.getFirst();
  }

  public List<Evaluation> evaluations(UUID owner) {
    return access.db.query(
        "select * from care_evaluations where user_id=? order by observed_on desc",
        (r, n) ->
            new Evaluation(
                r.getObject("id", UUID.class),
                r.getObject("observed_on", LocalDate.class),
                r.getLong("version"),
                r.getString("author_name"),
                r.getBigDecimal("weight"),
                r.getBigDecimal("height"),
                r.getBigDecimal("waist"),
                r.getString("goal"),
                r.getString("notes")),
        owner);
  }

  @Transactional
  public List<Evaluation> evaluate(String professional, UUID client, EvaluationInput input) {
    var clientEmail = clientEmail(professional, client, true);
    if (input.date().isAfter(access.today(clientEmail)))
      throw error(400, "A avaliação não pode estar no futuro.");
    var month = input.date().withDayOfMonth(1);
    var old =
        access.db.queryForList(
            "select id,version from care_evaluations where user_id=? and month_date=?",
            client,
            month);
    var version = old.isEmpty() ? 0 : ((Number) old.getFirst().get("version")).longValue();
    if (version != input.version())
      throw error(409, "A avaliação mudou. Recarregue os resultados antes de salvar.");
    if (!old.isEmpty())
      access.db.update("delete from care_evaluations where id=?", old.getFirst().get("id"));
    var name =
        access.db.queryForObject(
            "select name from users where id=?", String.class, access.owner(professional));
    access.db.update(
        "insert into care_evaluations values (?,?,?,?,?,?,?,?,?,?,?,?)",
        old.isEmpty() ? UUID.randomUUID() : old.getFirst().get("id"),
        client,
        access.owner(professional),
        name,
        input.date(),
        month,
        version + 1,
        input.weight(),
        input.height(),
        input.waist(),
        input.goal().strip(),
        input.notes().strip());
    return evaluations(client);
  }
}
