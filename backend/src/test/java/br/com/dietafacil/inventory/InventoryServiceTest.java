package br.com.dietafacil.inventory;
import br.com.dietafacil.auth.*;
import br.com.dietafacil.foods.*;
import br.com.dietafacil.plans.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.web.server.ResponseStatusException;
import static org.assertj.core.api.Assertions.*;
import static br.com.dietafacil.foods.FoodTypes.*;
import static br.com.dietafacil.inventory.InventoryDtos.*;
@SpringBootTest
class InventoryServiceTest {
 @Autowired AuthService auth;@Autowired FoodService foods;@Autowired InventoryService stock;@Autowired PlanService plans;
 String account(){var email="stock-"+UUID.randomUUID()+"@example.invalid";auth.register(new AuthDtos.Registration("Teste",email,"Senha-de-teste-2026!","UTC"));return email;}
 UUID food(String email){return foods.create(email,new FoodDtos.Create("Arroz",Unit.G,Category.GRAINS,Frequency.WEEKLY)).id();}
 String key(){return UUID.randomUUID().toString();}
 Entry entry(UUID food,Basis basis,String qty,LocalDate expiry,Knowledge knowledge){return new Entry(food,basis,new BigDecimal(qty),Unit.G,Location.FRIDGE,Condition.SEALED,LocalDate.now(ZoneOffset.UTC),expiry,expiry==null?ExpirySource.UNKNOWN:ExpirySource.LABEL,null,null,knowledge);}
 @Test void retryDoesNotDuplicateAndPayloadReuseConflicts(){
  var email=account();var food=food(email);var key=key();var input=entry(food,Basis.RAW,"1000",null,Knowledge.KNOWN);
  var first=stock.entry(email,key,input);assertThat(stock.entry(email,key,input)).isEqualTo(first);
  assertThat(stock.snapshot(email).lots()).singleElement().extracting(Lot::quantity).isEqualTo("1000");
  assertThatThrownBy(()->stock.entry(email,key,entry(food,Basis.RAW,"2000",null,Knowledge.KNOWN))).isInstanceOf(ResponseStatusException.class).hasMessageContaining("409");
 }
 @Test void preparesMeasuredOutputAndConsumptionDoesNotDebitRawAgain(){
  var email=account();var food=food(email);var today=LocalDate.now(ZoneOffset.UTC);
  stock.entry(email,key(),entry(food,Basis.RAW,"1000",today.plusDays(3),Knowledge.KNOWN));
  var output=new Entry(food,Basis.COOKED,new BigDecimal("600"),Unit.G,Location.FRIDGE,Condition.PREPARED,today,today.plusDays(1),ExpirySource.USER,null,today,Knowledge.PARTIAL);
  var prep=stock.prepare(email,key(),new Prepare(food,new BigDecimal("200"),Unit.G,output));
  var meal=UUID.randomUUID();
  plans.save(email,new PlanDtos.Save(0L,today,List.of(new PlanDtos.MealInput(meal,"Almoço",LocalTime.NOON,Set.of(today.getDayOfWeek().getValue()),List.of(new PlanDtos.ItemInput(food,new BigDecimal("300"),Unit.G,Basis.COOKED))))));
  var request=new Consume(today,meal,List.of(new Actual(food,Basis.COOKED,new BigDecimal("300"),Unit.G)));
  var key=key();var consumed=stock.consume(email,key,request);assertThat(stock.consume(email,key,request)).isEqualTo(consumed);
  var snapshot=stock.snapshot(email);
  assertThat(snapshot.lots().stream().filter(l->l.basis()==Basis.RAW).findFirst().orElseThrow().quantity()).isEqualTo("800");
  assertThat(snapshot.lots().stream().filter(l->l.basis()==Basis.COOKED).findFirst().orElseThrow().quantity()).isEqualTo("300");
  assertThatThrownBy(()->stock.reverse(email,key(),new Reversal(prep.operationId()))).isInstanceOf(ResponseStatusException.class).hasMessageContaining("409");
  stock.reverse(email,key(),new Reversal(consumed.operationId()));
  assertThat(plans.schedule(email,today).meals().getFirst().status()).isEqualTo("PENDING");
  stock.reverse(email,key(),new Reversal(prep.operationId()));
  assertThat(stock.snapshot(email).lots().stream().filter(l->l.basis()==Basis.RAW).findFirst().orElseThrow().quantity()).isEqualTo("1000");
 }
 @Test void ownershipAndInsufficientStockRollbackTheWholeOperation(){
  var first=account();var second=account();var food=food(first);
  var added=stock.entry(first,key(),entry(food,Basis.RAW,"100",null,Knowledge.PARTIAL));
  var lot=stock.snapshot(first).lots().getFirst();
  assertThatThrownBy(()->stock.entry(second,key(),entry(food,Basis.RAW,"10",null,Knowledge.KNOWN))).isInstanceOf(ResponseStatusException.class).hasMessageContaining("404");
  assertThatThrownBy(()->stock.discard(second,key(),new Discard(lot.id(),BigDecimal.ONE,Unit.G,"Teste"))).isInstanceOf(ResponseStatusException.class).hasMessageContaining("404");
  assertThatThrownBy(()->stock.discard(first,key(),new Discard(lot.id(),new BigDecimal("200"),Unit.G,"Teste"))).isInstanceOf(ResponseStatusException.class).hasMessageContaining("409");
  assertThat(stock.snapshot(first).history()).hasSize(1);
  assertThat(stock.snapshot(first).lots().getFirst().quantity()).isEqualTo("100");
  stock.reverse(first,key(),new Reversal(added.operationId()));
  assertThat(stock.snapshot(first).lots().getFirst().quantity()).isEqualTo("0");
 }
 @Test void fefoExcludesExpiredLotsAndLeavesUnknownExpiryLast(){
  var email=account();var food=food(email);var today=LocalDate.now(ZoneOffset.UTC);
  stock.entry(email,key(),entry(food,Basis.RAW,"50",today.minusDays(1),Knowledge.KNOWN));
  stock.entry(email,key(),entry(food,Basis.RAW,"100",today,Knowledge.KNOWN));
  stock.entry(email,key(),entry(food,Basis.RAW,"200",null,Knowledge.KNOWN));
  var meal=UUID.randomUUID();plans.save(email,new PlanDtos.Save(0L,today,List.of(new PlanDtos.MealInput(meal,"Jantar",LocalTime.NOON,Set.of(today.getDayOfWeek().getValue()),List.of(new PlanDtos.ItemInput(food,new BigDecimal("150"),Unit.G,Basis.RAW))))));
  stock.consume(email,key(),new Consume(today,meal,List.of(new Actual(food,Basis.RAW,new BigDecimal("150"),Unit.G))));
  var lots=stock.snapshot(email).lots();assertThat(lots.get(0).quantity()).isEqualTo("50");assertThat(lots.get(1).quantity()).isEqualTo("0");assertThat(lots.get(2).quantity()).isEqualTo("150");
 }
}


