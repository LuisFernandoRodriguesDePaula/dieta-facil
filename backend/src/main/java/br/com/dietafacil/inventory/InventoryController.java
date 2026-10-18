package br.com.dietafacil.inventory;

import static br.com.dietafacil.inventory.InventoryDtos.*;

import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/inventory")
public class InventoryController {
  private final InventoryService stock;

  public InventoryController(InventoryService stock) {
    this.stock = stock;
  }

  @PutMapping("/lots/{id}")
  public Snapshot storage(
      Authentication auth, @PathVariable java.util.UUID id, @Valid @RequestBody Storage input) {
    return stock.storage(auth.getName(), id, input);
  }

  @GetMapping
  public Snapshot snapshot(Authentication auth) {
    return stock.snapshot(auth.getName());
  }

  @PutMapping("/knowledge")
  public Snapshot knowledge(Authentication auth, @Valid @RequestBody KnowledgeInput input) {
    return stock.knowledge(auth.getName(), input);
  }

  @PostMapping("/entries")
  public Result entry(
      Authentication auth,
      @RequestHeader("Idempotency-Key") String key,
      @Valid @RequestBody Entry input) {
    return stock.entry(auth.getName(), key, input);
  }

  @PostMapping("/discards")
  public Result discard(
      Authentication auth,
      @RequestHeader("Idempotency-Key") String key,
      @Valid @RequestBody Discard input) {
    return stock.discard(auth.getName(), key, input);
  }

  @PostMapping("/preparations")
  public Result prepare(
      Authentication auth,
      @RequestHeader("Idempotency-Key") String key,
      @Valid @RequestBody Prepare input) {
    return stock.prepare(auth.getName(), key, input);
  }

  @PostMapping("/consumptions")
  public Result consume(
      Authentication auth,
      @RequestHeader("Idempotency-Key") String key,
      @Valid @RequestBody Consume input) {
    return stock.consume(auth.getName(), key, input);
  }

  @PostMapping("/reversals")
  public Result reverse(
      Authentication auth,
      @RequestHeader("Idempotency-Key") String key,
      @Valid @RequestBody Reversal input) {
    return stock.reverse(auth.getName(), key, input);
  }
}
