package br.com.dietafacil.foods;

import br.com.dietafacil.auth.AuthService;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional(readOnly = true)
public class FoodService {
    private final FoodRepository foods;
    private final AuthService users;
    private final br.com.dietafacil.domain.DomainAccess access;
    public FoodService(FoodRepository foods, AuthService users, br.com.dietafacil.domain.DomainAccess access) { this.foods = foods; this.users = users; this.access=access; }
    private UUID owner(String email) { return users.currentUser(email).getId(); }
    private Food owned(String email, UUID id) {
        return foods.findByIdAndUserId(id, owner(email)).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.NOT_FOUND, "Alimento não encontrado."));
    }
    private void checkVersion(Food food, Long version) {
        if (food.getVersion() != version) throw new ResponseStatusException(HttpStatus.CONFLICT,
            "Este alimento foi alterado em outra sessão. Recarregue o catálogo antes de editar.");
    }
    private String name(String value) { return value.strip().replaceAll("\\s+", " "); }

    public FoodDtos.Listing list(String email, String query, boolean archived, int page, int size) {
        var pageable = PageRequest.of(page, size, Sort.by("name").ascending().and(Sort.by("id")));
        var owner = owner(email);
        var result = archived
            ? foods.findByUserIdAndArchivedAtIsNotNullAndNameContainingIgnoreCase(owner, query.strip(), pageable)
            : foods.findByUserIdAndArchivedAtIsNullAndNameContainingIgnoreCase(owner, query.strip(), pageable);
        return new FoodDtos.Listing(result.map(FoodDtos.View::from).getContent(), page, result.getTotalPages(), result.getTotalElements());
    }
    public FoodDtos.View get(String email, UUID id) { return FoodDtos.View.from(owned(email, id)); }

    @Transactional
    public FoodDtos.View create(String email, FoodDtos.Create input) {
        var food = new Food(access.lock(email), name(input.name()), input.unit(), input.category(), input.purchaseFrequency());
        return FoodDtos.View.from(foods.saveAndFlush(food));
    }

    @Transactional
    public FoodDtos.View update(String email, UUID id, FoodDtos.Update input) {
        access.lock(email);
        var food = owned(email, id);
        checkVersion(food, input.version());
        if (food.getArchivedAt() != null) throw new ResponseStatusException(HttpStatus.CONFLICT, "Restaure o alimento antes de editar.");
        if (food.getUnit().dimension() != input.unit().dimension()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
            "A dimensão do alimento não pode mudar. Cadastre outro alimento para usar massa, volume ou contagem diferentes.");
        food.update(name(input.name()), input.unit(), input.category(), input.purchaseFrequency());
        return FoodDtos.View.from(foods.saveAndFlush(food));
    }

    @Transactional
    public FoodDtos.View archive(String email, UUID id, FoodDtos.Archive input) {
        access.lock(email);
        var food = owned(email, id);
        checkVersion(food, input.version());
        if ((food.getArchivedAt() != null) != input.archived()) food.setArchived(input.archived());
        return FoodDtos.View.from(foods.saveAndFlush(food));
    }

    public FoodDtos.Conversion convert(String email, UUID id, FoodDtos.Convert input) {
        var food = owned(email, id);
        if (food.getUnit().dimension() != input.from().dimension()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
            "A unidade de origem não corresponde à dimensão deste alimento.");
        try {
            var result = QuantityConversion.convert(input.quantity(), input.from(), input.to());
            return new FoodDtos.Conversion(result.toPlainString(), input.to(), input.basis());
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, exception.getMessage());
        }
    }
}

