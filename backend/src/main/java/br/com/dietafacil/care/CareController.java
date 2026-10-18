package br.com.dietafacil.care;

import br.com.dietafacil.domain.DomainAccess;
import br.com.dietafacil.foods.*;
import br.com.dietafacil.plans.*;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.*;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
public class CareController {
  private final CareService care;
  private final DomainAccess access;
  private final PlanService plans;
  private final FoodService foods;
  private final SubstitutionService substitutions;

  public CareController(
      CareService care,
      DomainAccess access,
      PlanService plans,
      FoodService foods,
      SubstitutionService substitutions) {
    this.care = care;
    this.access = access;
    this.plans = plans;
    this.foods = foods;
    this.substitutions = substitutions;
  }

  @GetMapping("/api/care")
  public List<CareService.Link> links(Authentication auth) {
    return care.links(auth.getName(), false);
  }

  @PostMapping("/api/care/{id}/accept")
  public List<CareService.Link> accept(Authentication auth, @PathVariable UUID id) {
    return care.accept(auth.getName(), id);
  }

  @PostMapping("/api/care/{id}/revoke")
  @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
  public void revoke(Authentication auth, @PathVariable UUID id) {
    care.revoke(auth.getName(), id);
  }

  @GetMapping("/api/results")
  public List<CareService.Evaluation> results(Authentication auth) {
    return care.evaluations(access.owner(auth.getName()));
  }

  @GetMapping("/api/professional/clients")
  public List<CareService.Link> clients(Authentication auth) {
    return care.links(auth.getName(), true);
  }

  public record ClientProfile(UUID id, String name, String timezone) {}

  @GetMapping("/api/professional/clients/{client}/profile")
  public ClientProfile profile(Authentication auth, @PathVariable UUID client) {
    care.clientEmail(auth.getName(), client, false);
    return access.db.queryForObject(
        "select id,name,timezone from users where id=?",
        (r, n) -> new ClientProfile(r.getObject(1, UUID.class), r.getString(2), r.getString(3)),
        client);
  }

  @PostMapping("/api/professional/clients")
  public List<CareService.Link> invite(
      Authentication auth, @Valid @RequestBody CareService.Invitation input) {
    return care.invite(auth.getName(), input);
  }

  @GetMapping("/api/professional/clients/{client}/plan")
  public PlanDtos.Plan plan(
      Authentication auth, @PathVariable UUID client, @RequestParam LocalDate date) {
    return plans.plan(care.clientEmail(auth.getName(), client, false), date);
  }

  @PutMapping("/api/professional/clients/{client}/plan")
  @Transactional
  public PlanDtos.Plan save(
      Authentication auth, @PathVariable UUID client, @Valid @RequestBody PlanDtos.Save input) {
    return plans.save(care.clientEmail(auth.getName(), client, true), input);
  }

  @GetMapping("/api/professional/clients/{client}/schedule")
  public PlanDtos.Schedule schedule(
      Authentication auth, @PathVariable UUID client, @RequestParam LocalDate date) {
    return plans.schedule(care.clientEmail(auth.getName(), client, false), date);
  }

  @GetMapping("/api/professional/clients/{client}/foods")
  public FoodDtos.Listing foods(
      Authentication auth,
      @PathVariable UUID client,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "100") int size) {
    return foods.list(
        care.clientEmail(auth.getName(), client, false),
        "",
        false,
        Math.max(0, page),
        Math.max(1, Math.min(size, 100)));
  }

  @PostMapping("/api/professional/clients/{client}/foods")
  @Transactional
  public FoodDtos.View food(
      Authentication auth, @PathVariable UUID client, @Valid @RequestBody FoodDtos.Create input) {
    return foods.create(care.clientEmail(auth.getName(), client, true), input);
  }

  @GetMapping("/api/professional/clients/{client}/plan/substitutions")
  public SubstitutionDtos.Options options(
      Authentication auth,
      @PathVariable UUID client,
      @RequestParam LocalDate date,
      @RequestParam UUID mealId,
      @RequestParam int itemIndex) {
    return withoutStock(
        substitutions.options(
            care.clientEmail(auth.getName(), client, false), date, mealId, itemIndex));
  }

  @PutMapping("/api/professional/clients/{client}/plan/substitutions")
  @Transactional
  public SubstitutionDtos.Options rule(
      Authentication auth,
      @PathVariable UUID client,
      @Valid @RequestBody SubstitutionDtos.RuleSave input) {
    return withoutStock(substitutions.save(care.clientEmail(auth.getName(), client, true), input));
  }

  private SubstitutionDtos.Options withoutStock(SubstitutionDtos.Options value) {
    return new SubstitutionDtos.Options(
        value.fingerprint(),
        value.version(),
        value.enabled(),
        value.source(),
        value.alternatives().stream()
            .map(
                a ->
                    new SubstitutionDtos.Alternative(
                        a.item(), null, "DISABLED", a.selectable(), a.blockedReason()))
            .toList());
  }

  @GetMapping("/api/professional/clients/{client}/results")
  public List<CareService.Evaluation> evaluations(Authentication auth, @PathVariable UUID client) {
    care.clientEmail(auth.getName(), client, false);
    return care.evaluations(client);
  }

  @PutMapping("/api/professional/clients/{client}/results")
  public List<CareService.Evaluation> evaluate(
      Authentication auth,
      @PathVariable UUID client,
      @Valid @RequestBody CareService.EvaluationInput input) {
    return care.evaluate(auth.getName(), client, input);
  }
}
