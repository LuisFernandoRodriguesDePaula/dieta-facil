package br.com.dietafacil.foods;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/foods")
@Validated
public class FoodController {
    private final FoodService foods;
    public FoodController(FoodService foods) { this.foods = foods; }

    @GetMapping
    public FoodDtos.Listing list(Authentication auth,
        @RequestParam(defaultValue = "") @Size(max = 120) String q,
        @RequestParam(defaultValue = "false") boolean archived,
        @RequestParam(defaultValue = "0") @Min(0) @Max(100000) int page,
        @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return foods.list(auth.getName(), q, archived, page, size);
    }
    @GetMapping("/{id}")
    public FoodDtos.View get(Authentication auth, @PathVariable UUID id) { return foods.get(auth.getName(), id); }
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public FoodDtos.View create(Authentication auth, @Valid @RequestBody FoodDtos.Create input) { return foods.create(auth.getName(), input); }
    @PatchMapping("/{id}")
    public FoodDtos.View update(Authentication auth, @PathVariable UUID id, @Valid @RequestBody FoodDtos.Update input) { return foods.update(auth.getName(), id, input); }
    @PatchMapping("/{id}/archive")
    public FoodDtos.View archive(Authentication auth, @PathVariable UUID id, @Valid @RequestBody FoodDtos.Archive input) { return foods.archive(auth.getName(), id, input); }
    @PostMapping("/{id}/convert")
    public FoodDtos.Conversion convert(Authentication auth, @PathVariable UUID id, @Valid @RequestBody FoodDtos.Convert input) { return foods.convert(auth.getName(), id, input); }
}
