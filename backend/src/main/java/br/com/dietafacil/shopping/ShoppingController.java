package br.com.dietafacil.shopping;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import br.com.dietafacil.inventory.InventoryDtos;
import static br.com.dietafacil.shopping.ShoppingDtos.*;
@RestController
@RequestMapping("/api/shopping")
public class ShoppingController {
 private final ShoppingService shopping;
 public ShoppingController(ShoppingService shopping){this.shopping=shopping;}
 @GetMapping("/projection") public Projection projection(Authentication auth,@RequestParam LocalDate from,@RequestParam LocalDate until){return shopping.projection(auth.getName(),from,until);}
 @GetMapping("/lists") public List<ShoppingList> lists(Authentication auth){return shopping.lists(auth.getName());}
 @PostMapping("/lists") public ShoppingList generate(Authentication auth,@Valid @RequestBody Generate input){return shopping.generate(auth.getName(),input);}
 @GetMapping("/lists/{id}") public ShoppingList get(Authentication auth,@PathVariable UUID id){return shopping.get(auth.getName(),id);}
 @PutMapping("/lists/{id}") public ShoppingList update(Authentication auth,@PathVariable UUID id,@Valid @RequestBody Update input){return shopping.update(auth.getName(),id,input);}
 @PostMapping("/lists/{id}/recalculate") public ShoppingList recalculate(Authentication auth,@PathVariable UUID id,@Valid @RequestBody Recalculate input){return shopping.recalculate(auth.getName(),id,input);}
 @PostMapping("/receipts") public InventoryDtos.Result receipt(Authentication auth,@RequestHeader("Idempotency-Key") String key,@Valid @RequestBody Receipt input){return shopping.receipt(auth.getName(),key,input);}
}

