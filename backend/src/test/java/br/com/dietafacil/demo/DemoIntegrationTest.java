package br.com.dietafacil.demo;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class DemoIntegrationTest {
    @Autowired private DemoController controller;

    @Test
    void loadsMigratedMealsInTimeOrderAndIdentifiesDemo() {
        var response = controller.schedule();
        assertThat(response.demo()).isTrue();
        assertThat(response.notice()).contains("fictício");
        assertThat(response.meals()).hasSize(4);
        assertThat(response.meals()).extracting(DemoController.Meal::time).isSorted();
        assertThat(response.meals().getFirst().items()).contains("Ovos mexidos · 2 unidades");
    }
}
