package br.com.dietafacil.foods;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FoodRepository extends JpaRepository<Food, UUID> {
    Optional<Food> findByIdAndUserId(UUID id, UUID userId);
    Page<Food> findByUserIdAndArchivedAtIsNullAndNameContainingIgnoreCase(UUID userId, String name, Pageable page);
    Page<Food> findByUserIdAndArchivedAtIsNotNullAndNameContainingIgnoreCase(UUID userId, String name, Pageable page);
}
