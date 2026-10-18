package br.com.dietafacil.care;

import org.springframework.context.annotation.Profile;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@Profile("!prod")
public class DemoFeaturesController {
  private final FeatureService features;

  public DemoFeaturesController(FeatureService features) {
    this.features = features;
  }

  public record Tier(String tier) {}

  @PostMapping("/api/demo/features")
  public FeatureService.Features tier(Authentication auth, @RequestBody Tier input) {
    return features.demoTier(auth.getName(), input.tier());
  }
}
