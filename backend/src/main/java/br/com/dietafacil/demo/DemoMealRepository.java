package br.com.dietafacil.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DemoMealRepository extends JpaRepository<DemoMeal, Long> {
    List<DemoMeal> findAllByOrderByMealTimeAsc();
}
