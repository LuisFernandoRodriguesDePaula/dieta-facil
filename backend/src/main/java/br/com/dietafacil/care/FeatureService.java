package br.com.dietafacil.care;

import static br.com.dietafacil.domain.DomainAccess.error;

import br.com.dietafacil.domain.DomainAccess;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FeatureService {
  private final DomainAccess access;

  public FeatureService(DomainAccess access) {
    this.access = access;
  }

  public record Features(
      String role,
      String tier,
      boolean inventoryAllowed,
      boolean inventoryEnabled,
      boolean reviewRequired) {}

  public Features get(String email) {
    return get(access.owner(email));
  }

  public Features get(UUID owner) {
    return access.db.queryForObject(
        "select account_role,subscription_tier,inventory_enabled,inventory_review_required from"
            + " users where id=?",
        (r, n) ->
            new Features(
                r.getString(1),
                r.getString(2),
                r.getString(2).equals("PREMIUM"),
                r.getString(2).equals("PREMIUM") && r.getBoolean(3),
                r.getBoolean(4)),
        owner);
  }

  public void professional(String email) {
    if (!get(email).role().equals("NUTRITIONIST"))
      throw error(403, "Esta ação pertence à área do nutricionista.");
  }

  @Transactional(propagation = org.springframework.transaction.annotation.Propagation.MANDATORY)
  public void requireInventoryLocked(String email) {
    var owner = access.lock(email);
    if (!get(owner).inventoryEnabled()) throw error(403, "O controle de estoque está desativado.");
  }

  @Transactional
  public Features inventory(String email, boolean enabled, boolean reviewed) {
    var owner = access.lock(email);
    var current = get(owner);
    if (!current.inventoryAllowed())
      throw error(403, "O controle de estoque faz parte do Premium.");
    if (enabled && !current.inventoryEnabled() && !reviewed)
      throw error(409, "Confira os saldos antes de ativar o estoque.");
    access.db.update(
        "update users set inventory_enabled=?,inventory_review_required=? where id=?",
        enabled,
        !enabled,
        owner);
    return get(owner);
  }

  @Transactional
  public Features demoTier(String email, String tier) {
    if (tier == null || !java.util.Set.of("BASIC", "PREMIUM").contains(tier))
      throw error(400, "Plano inválido.");
    var owner = access.lock(email);
    if (tier.equals("BASIC"))
      access.db.update(
          "update users set"
              + " subscription_tier=?,inventory_enabled=false,inventory_review_required=true where"
              + " id=?",
          tier,
          owner);
    else access.db.update("update users set subscription_tier=? where id=?", tier, owner);
    return get(owner);
  }
}
