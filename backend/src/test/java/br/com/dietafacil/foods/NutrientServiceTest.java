package br.com.dietafacil.foods;
import static org.assertj.core.api.Assertions.*;
import br.com.dietafacil.auth.*;
import br.com.dietafacil.foods.FoodTypes.*;
import java.math.BigDecimal;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.web.server.ResponseStatusException;

@SpringBootTest
class NutrientServiceTest {
 @Autowired AuthService auth;
 @Autowired FoodService foods;
 @Autowired NutrientService nutrients;
 String owner(){var email="nutrients-"+UUID.randomUUID()+"@example.invalid";auth.register(new AuthDtos.Registration("Teste",email,"Senha-ficticia-2026!","UTC","NUTRITIONIST"));return email;}
 NutrientService.Input input(long version){return new NutrientService.Input(Basis.COOKED,new BigDecimal("100"),Unit.G,new BigDecimal("20"),null,BigDecimal.ZERO,new BigDecimal("100"),"Referência fictícia",version);}
 @Test void proportionalCalculationPreservesMissingAndKnownZero(){
  assertThat(NutrientService.portion(new BigDecimal("20"),new BigDecimal("0.150"),Unit.KG,input(0))).isEqualByComparingTo("30");
  assertThat(NutrientService.portion(null,BigDecimal.ONE,Unit.G,input(0))).isNull();
  assertThat(NutrientService.portion(BigDecimal.ZERO,BigDecimal.ONE,Unit.G,input(0))).isEqualByComparingTo("0");
  assertThatThrownBy(()->NutrientService.portion(BigDecimal.ONE,BigDecimal.ONE,Unit.ML,input(0))).isInstanceOf(IllegalArgumentException.class);
 }
 @Test void storesImmutableRevisionsAndRejectsStaleEditAndOtherOwner(){
  var a=owner();var b=owner();var food=foods.create(a,new FoodDtos.Create("Exemplo",Unit.G,Category.OTHER,Frequency.WEEKLY));
  assertThat(nutrients.get(a,food.id(),Basis.COOKED)).isEmpty();
  assertThat(nutrients.save(a,food.id(),input(0)).revision()).isEqualTo(1);
  assertThat(nutrients.save(a,food.id(),input(1)).revision()).isEqualTo(2);
  assertThatThrownBy(()->nutrients.save(a,food.id(),input(1))).isInstanceOfSatisfying(ResponseStatusException.class,e->assertThat(e.getStatusCode().value()).isEqualTo(409));
  assertThatThrownBy(()->nutrients.get(b,food.id(),Basis.COOKED)).isInstanceOfSatisfying(ResponseStatusException.class,e->assertThat(e.getStatusCode().value()).isEqualTo(404));
  assertThat(nutrients.get(a,food.id(),Basis.RAW)).isEmpty();
 }
}
