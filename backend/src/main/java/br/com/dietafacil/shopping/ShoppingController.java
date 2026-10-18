package br.com.dietafacil.shopping;

import static br.com.dietafacil.shopping.ShoppingDtos.*;

import br.com.dietafacil.inventory.InventoryDtos;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/shopping")
public class ShoppingController {
  private final ShoppingService shopping;
  private final br.com.dietafacil.care.FeatureService features;

  public ShoppingController(
      ShoppingService shopping, br.com.dietafacil.care.FeatureService features) {
    this.features = features;
    this.shopping = shopping;
  }

  @GetMapping("/preferences")
  public Preferences preferences(Authentication auth) {
    return shopping.preferences(auth.getName());
  }

  @org.springframework.transaction.annotation.Transactional
  @PutMapping("/preferences")
  public Preferences preferences(Authentication auth, @Valid @RequestBody PreferencesInput input) {
    features.requireInventoryLocked(auth.getName());
    return shopping.preferences(auth.getName(), input);
  }

  @GetMapping("/projection")
  public Projection projection(
      Authentication auth, @RequestParam LocalDate from, @RequestParam LocalDate until) {
    return shopping.projection(auth.getName(), from, until);
  }

  @GetMapping("/lists")
  public List<ShoppingList> lists(Authentication auth) {
    return shopping.lists(auth.getName());
  }

  @org.springframework.transaction.annotation.Transactional
  @PostMapping("/lists")
  public ShoppingList generate(Authentication auth, @Valid @RequestBody Generate input) {
    features.requireInventoryLocked(auth.getName());
    return shopping.generate(auth.getName(), input);
  }

  @GetMapping("/lists/{id}")
  public ShoppingList get(Authentication auth, @PathVariable UUID id) {
    return shopping.get(auth.getName(), id);
  }

  @org.springframework.transaction.annotation.Transactional
  @PutMapping("/lists/{id}")
  public ShoppingList update(
      Authentication auth, @PathVariable UUID id, @Valid @RequestBody Update input) {
    features.requireInventoryLocked(auth.getName());
    return shopping.update(auth.getName(), id, input);
  }

  @org.springframework.transaction.annotation.Transactional
  @PostMapping("/lists/{id}/recalculate")
  public ShoppingList recalculate(
      Authentication auth, @PathVariable UUID id, @Valid @RequestBody Recalculate input) {
    features.requireInventoryLocked(auth.getName());
    return shopping.recalculate(auth.getName(), id, input);
  }

  @org.springframework.transaction.annotation.Transactional
  @PostMapping("/receipts")
  public InventoryDtos.Result receipt(
      Authentication auth,
      @RequestHeader("Idempotency-Key") String key,
      @Valid @RequestBody Receipt input) {
    features.requireInventoryLocked(auth.getName());
    return shopping.receipt(auth.getName(), key, input);
  }
}
