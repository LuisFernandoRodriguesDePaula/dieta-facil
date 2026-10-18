package br.com.dietafacil.inventory;

import static br.com.dietafacil.inventory.InventoryDtos.*;

import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/inventory")
public class InventoryController {
  private final InventoryService stock;
  private final br.com.dietafacil.care.FeatureService features;

  public InventoryController(
      InventoryService stock, br.com.dietafacil.care.FeatureService features) {
    this.features = features;
    this.stock = stock;
  }

  @org.springframework.transaction.annotation.Transactional
  @PutMapping("/lots/{id}")
  public Snapshot storage(
      Authentication auth, @PathVariable java.util.UUID id, @Valid @RequestBody Storage input) {
    features.requireInventoryLocked(auth.getName());
    return stock.storage(auth.getName(), id, input);
  }

  @GetMapping
  public Snapshot snapshot(Authentication auth) {
    return stock.snapshot(auth.getName());
  }

  @org.springframework.transaction.annotation.Transactional
  @PutMapping("/knowledge")
  public Snapshot knowledge(Authentication auth, @Valid @RequestBody KnowledgeInput input) {
    features.requireInventoryLocked(auth.getName());
    return stock.knowledge(auth.getName(), input);
  }

  @org.springframework.transaction.annotation.Transactional
  @PostMapping("/entries")
  public Result entry(
      Authentication auth,
      @RequestHeader("Idempotency-Key") String key,
      @Valid @RequestBody Entry input) {
    features.requireInventoryLocked(auth.getName());
    return stock.entry(auth.getName(), key, input);
  }

  @org.springframework.transaction.annotation.Transactional
  @PostMapping("/discards")
  public Result discard(
      Authentication auth,
      @RequestHeader("Idempotency-Key") String key,
      @Valid @RequestBody Discard input) {
    features.requireInventoryLocked(auth.getName());
    return stock.discard(auth.getName(), key, input);
  }

  @org.springframework.transaction.annotation.Transactional
  @PostMapping("/preparations")
  public Result prepare(
      Authentication auth,
      @RequestHeader("Idempotency-Key") String key,
      @Valid @RequestBody Prepare input) {
    features.requireInventoryLocked(auth.getName());
    return stock.prepare(auth.getName(), key, input);
  }

  @org.springframework.transaction.annotation.Transactional
  @PostMapping("/consumptions")
  public Result consume(
      Authentication auth,
      @RequestHeader("Idempotency-Key") String key,
      @Valid @RequestBody Consume input) {
    features.requireInventoryLocked(auth.getName());
    return stock.consume(auth.getName(), key, input);
  }

  @org.springframework.transaction.annotation.Transactional
  @PostMapping("/reversals")
  public Result reverse(
      Authentication auth,
      @RequestHeader("Idempotency-Key") String key,
      @Valid @RequestBody Reversal input) {
    features.requireInventoryLocked(auth.getName());
    return stock.reverse(auth.getName(), key, input);
  }
}
