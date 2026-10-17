package br.com.dietafacil.demo;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping("/api/demo")
public class DemoController {
    private final DemoMealRepository meals;
    public DemoController(DemoMealRepository meals) { this.meals = meals; }

    @GetMapping("/schedule")
    public Schedule schedule() {
        var result = meals.findAllByOrderByMealTimeAsc().stream()
            .map(meal -> new Meal(meal.getId(), meal.getName(),
                meal.getMealTime().toString(), meal.getDescription(),
                Arrays.asList(meal.getItems().split("\\|"))))
            .toList();
        return new Schedule(true, "Plano fictício para demonstrar o aplicativo. Não é uma recomendação alimentar.", result);
    }

    public record Schedule(boolean demo, String notice, List<Meal> meals) {}
    public record Meal(Long id, String name, String time, String description, List<String> items) {}
}
