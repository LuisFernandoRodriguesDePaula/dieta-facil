package br.com.dietafacil.care;

import br.com.dietafacil.inventory.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
public class FeatureController {
  private final FeatureService features;
  private final InventoryService stock;

  public FeatureController(FeatureService features, InventoryService stock) {
    this.features = features;
    this.stock = stock;
  }

  public record Activation(boolean enabled, boolean reviewed) {}

  @GetMapping("/api/features")
  public FeatureService.Features get(Authentication auth) {
    return features.get(auth.getName());
  }

  @PostMapping("/api/features/inventory")
  public FeatureService.Features activate(Authentication auth, @RequestBody Activation input) {
    return features.inventory(auth.getName(), input.enabled(), input.reviewed());
  }

  @GetMapping("/api/features/inventory-review")
  public InventoryDtos.Snapshot review(Authentication auth) {
    if (!features.get(auth.getName()).inventoryAllowed())
      throw br.com.dietafacil.domain.DomainAccess.error(403, "Recurso Premium.");
    return stock.snapshot(auth.getName());
  }
}
