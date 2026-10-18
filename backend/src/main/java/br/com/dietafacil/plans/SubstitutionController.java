package br.com.dietafacil.plans;

import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
public class SubstitutionController {
  private final SubstitutionService service;

  public SubstitutionController(SubstitutionService service) {
    this.service = service;
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
    return service.swap(auth.getName(), input);
  }

  @PostMapping("/api/schedule/substitute/undo")
  public SubstitutionDtos.Result undo(
      Authentication auth, @Valid @RequestBody SubstitutionDtos.Undo input) {
    return service.undo(auth.getName(), input.actionId());
  }
}
