package br.com.dietafacil.foods;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import static br.com.dietafacil.foods.FoodTypes.*;

@Entity
@Table(name = "foods")
public class Food {
    @Id private UUID id;
    private UUID userId;
    private String name;
    @Enumerated(EnumType.STRING) private Unit unit;
    @Enumerated(EnumType.STRING) private Category category;
    @Enumerated(EnumType.STRING) private Frequency purchaseFrequency;
    private Instant archivedAt;
    private Instant createdAt;
    @Version private long version;

    protected Food() {}
    public Food(UUID userId, String name, Unit unit, Category category, Frequency frequency) {
        this.id = UUID.randomUUID();
        this.userId = userId;
        this.name = name;
        this.unit = unit;
        this.category = category;
        this.purchaseFrequency = frequency;
        this.createdAt = Instant.now();
    }
    public UUID getId() { return id; }
    public String getName() { return name; }
    public Unit getUnit() { return unit; }
    public Category getCategory() { return category; }
    public Frequency getPurchaseFrequency() { return purchaseFrequency; }
    public Instant getArchivedAt() { return archivedAt; }
    public long getVersion() { return version; }
    public void update(String name, Unit unit, Category category, Frequency frequency) {
        this.name = name;
        this.unit = unit;
        this.category = category;
        this.purchaseFrequency = frequency;
    }
    public void setArchived(boolean archived) { this.archivedAt = archived ? Instant.now() : null; }
}
