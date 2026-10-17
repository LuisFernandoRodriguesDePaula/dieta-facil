package br.com.dietafacil.demo;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalTime;

@Entity
@Table(name = "demo_meals")
public class DemoMeal {
    @Id
    private Long id;
    private String name;
    private LocalTime mealTime;
    private String description;
    private String items;

    protected DemoMeal() {}
    public Long getId() { return id; }
    public String getName() { return name; }
    public LocalTime getMealTime() { return mealTime; }
    public String getDescription() { return description; }
    public String getItems() { return items; }
}
