package br.com.dietafacil.plans;

import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
public class SubstitutionController {
  private final SubstitutionService service;
  private final br.com.dietafacil.care.FeatureService features;

  public SubstitutionController(
      SubstitutionService service, br.com.dietafacil.care.FeatureService features) {
    this.service = service;
    this.features = features;
  }

  @GetMapping("/api/plan/substitutions")
  public SubstitutionDtos.Options options(
      Authentication auth,
      @RequestParam LocalDate date,
      @RequestParam UUID mealId,
      @RequestParam int itemIndex) {
    return service.options(auth.getName(), date, mealId, itemIndex);
  }

  @PutMapping("/api/plan/substitutions")
  public SubstitutionDtos.Options save(
      Authentication auth, @Valid @RequestBody SubstitutionDtos.RuleSave input) {
    return service.save(auth.getName(), input);
  }

  @PostMapping("/api/schedule/substitute")
  public SubstitutionDtos.Result swap(
      Authentication auth, @Valid @RequestBody SubstitutionDtos.Swap input) {
    if (features.get(auth.getName()).role().equals("CLIENT")
        && input.scope() != SubstitutionDtos.Scope.ONCE)
      throw br.com.dietafacil.domain.DomainAccess.error(
          403, "O cliente pode escolher uma alternativa apenas para esta refeição.");
    return service.swap(auth.getName(), input);
  }

  @PostMapping("/api/schedule/substitute/undo")
  public SubstitutionDtos.Result undo(
      Authentication auth, @Valid @RequestBody SubstitutionDtos.Undo input) {
    if (features.get(auth.getName()).role().equals("CLIENT")
        && !service.singleOccurrenceAction(auth.getName(), input.actionId()))
      throw br.com.dietafacil.domain.DomainAccess.error(
          403, "A revisão da dieta pertence ao nutricionista.");
    return service.undo(auth.getName(), input.actionId());
  }
}
