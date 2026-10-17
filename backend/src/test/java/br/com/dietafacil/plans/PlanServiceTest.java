package br.com.dietafacil.plans;
import br.com.dietafacil.auth.*;
import br.com.dietafacil.foods.*;
import br.com.dietafacil.foods.FoodTypes.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import static org.assertj.core.api.Assertions.*;
@SpringBootTest
class PlanServiceTest {
 @Autowired AuthService auth; @Autowired FoodService foods; @Autowired PlanService plans;
 private String account(){var email="plan-"+UUID.randomUUID()+"@example.invalid";auth.register(new AuthDtos.Registration("Teste",email,"Senha-planejamento-2026!","America/Sao_Paulo"));return email;}
 private PlanDtos.MealInput meal(UUID id,UUID food,String name,Set<Integer> days){return new PlanDtos.MealInput(id,name,LocalTime.of(7,30),days,List.of(new PlanDtos.ItemInput(food,new BigDecimal("2"),Unit.UNIT,Basis.AS_SOLD)));}
 private UUID food(String email){return foods.create(email,new FoodDtos.Create("Ovos",Unit.UNIT,Category.PROTEIN,Frequency.WEEKLY)).id();}
 @Test void revisionsRespectDatesAndWeekdays() {
  var email=account();var today=LocalDate.now(ZoneId.of("America/Sao_Paulo"));var food=food(email);var key=UUID.randomUUID();
  var initial=plans.save(email,new PlanDtos.Save(0L,today,List.of(meal(key,food,"Café",Set.of(1)))));
  var monday=today.with(java.time.temporal.TemporalAdjusters.nextOrSame(DayOfWeek.MONDAY));
  assertThat(plans.schedule(email,monday).meals()).hasSize(1);
  assertThat(plans.schedule(email,monday.plusDays(1)).meals()).isEmpty();
  var next=monday.plusDays(7);
  plans.save(email,new PlanDtos.Save(initial.version(),next,List.of(meal(key,food,"Café novo",Set.of(1)))));
  assertThat(plans.schedule(email,monday).meals().getFirst().name()).isEqualTo("Café");
  assertThat(plans.schedule(email,next).meals().getFirst().name()).isEqualTo("Café novo");
  assertThatThrownBy(()->plans.save(email,new PlanDtos.Save(0L,today,List.of()))).hasMessageContaining("409");
 }
 @Test void skippedSnapshotSurvivesRevisionAndDoesNotMoveStock() {
  var email=account();var today=LocalDate.now(ZoneId.of("America/Sao_Paulo"));var food=food(email);var key=UUID.randomUUID();
  var initial=plans.save(email,new PlanDtos.Save(0L,today,List.of(meal(key,food,"Original",Set.of(today.getDayOfWeek().getValue())))));
  plans.skip(email,new PlanDtos.Skip(today,key,true));
  plans.save(email,new PlanDtos.Save(initial.version(),today,List.of(meal(key,food,"Alterada",Set.of(today.getDayOfWeek().getValue())))));
  assertThat(plans.schedule(email,today).meals().getFirst().name()).isEqualTo("Original");
  assertThat(plans.schedule(email,today).meals().getFirst().status()).isEqualTo("SKIPPED");
  plans.skip(email,new PlanDtos.Skip(today,key,false));
  assertThat(plans.schedule(email,today).meals().getFirst().name()).isEqualTo("Alterada");
 }
 @Test void foreignFoodCannotBeLinkedAndBadUnitsAreRejected() {
  var email=account();var other=account();var today=LocalDate.now(ZoneId.of("America/Sao_Paulo"));var foreign=food(other);
  assertThatThrownBy(()->plans.save(email,new PlanDtos.Save(0L,today,List.of(meal(null,foreign,"Outra",Set.of(1)))))).hasMessageContaining("404");
  assertThat(plans.plan(email,today).meals()).isEmpty();
  var own=food(email);
  var bad=new PlanDtos.MealInput(null,"Inválida",LocalTime.NOON,Set.of(1),List.of(new PlanDtos.ItemInput(own,BigDecimal.ONE,Unit.G,Basis.RAW)));
  assertThatThrownBy(()->plans.save(email,new PlanDtos.Save(0L,today,List.of(bad)))).hasMessageContaining("400");
  assertThatThrownBy(()->plans.save(email,new PlanDtos.Save(0L,today.minusDays(1),List.of()))).hasMessageContaining("400");
 }
}

