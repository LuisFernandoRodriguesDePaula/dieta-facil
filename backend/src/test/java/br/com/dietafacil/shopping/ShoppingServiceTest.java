package br.com.dietafacil.shopping;
import br.com.dietafacil.auth.*;
import br.com.dietafacil.foods.*;
import br.com.dietafacil.inventory.*;
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
import static br.com.dietafacil.shopping.ShoppingDtos.*;
@SpringBootTest
class ShoppingServiceTest {
 @Autowired AuthService auth;@Autowired FoodService foods;@Autowired InventoryService stock;@Autowired PlanService plans;@Autowired ShoppingService shopping;
 String account(){var email="shopping-"+UUID.randomUUID()+"@example.invalid";auth.register(new AuthDtos.Registration("Teste",email,"Senha-de-teste-2026!","UTC"));return email;}
 UUID food(String email){return foods.create(email,new FoodDtos.Create("Ovos",Unit.UNIT,Category.PROTEIN,Frequency.WEEKLY)).id();}
 LocalDate today(){return LocalDate.now(ZoneOffset.UTC);}
 String key(){return UUID.randomUUID().toString();}
 void plan(String email,UUID food){plans.save(email,new PlanDtos.Save(0L,today(),List.of(new PlanDtos.MealInput(UUID.randomUUID(),"Café",LocalTime.of(8,0),Set.of(1,2,3,4,5,6,7),List.of(new PlanDtos.ItemInput(food,new BigDecimal("2"),Unit.UNIT,Basis.AS_SOLD))))));}
 Entry entry(UUID food,String qty,LocalDate expiry){return new Entry(food,Basis.AS_SOLD,new BigDecimal(qty),Unit.UNIT,Location.FRIDGE,Condition.SEALED,today(),expiry,expiry==null?ExpirySource.UNKNOWN:ExpirySource.LABEL,null,null,Knowledge.KNOWN);}
 @Test void projectionUsesExpiryAtEachOccurrenceAndDoesNotChangeStock(){
  var email=account();var food=food(email);plan(email,food);
  stock.entry(email,key(),entry(food,"12",today().plusDays(1)));
  var before=stock.snapshot(email);
  var projection=shopping.projection(email,today(),today().plusDays(7));var row=projection.rows().getFirst();
  assertThat(row.demand()).isEqualTo("14");assertThat(row.available()).isEqualTo("12");assertThat(row.covered()).isEqualTo("4");assertThat(row.shortage()).isEqualTo("10");assertThat(row.firstShortage()).isEqualTo(today().plusDays(2));
  assertThat(stock.snapshot(email)).isEqualTo(before);
  shopping.generate(email,new Generate(today(),today().plusDays(7)));
  assertThat(stock.snapshot(email)).isEqualTo(before);
 }
 @Test void receiptsArePartialIdempotentAndRecalculationPreservesManualAdjustment(){
  var email=account();var food=food(email);plan(email,food);
  var list=shopping.generate(email,new Generate(today(),today().plusDays(7)));
  var ref=ShoppingService.key(food,Basis.AS_SOLD);
  list=shopping.update(email,list.id(),new Update(list.version(),Map.of(ref,"20"),"DRAFT"));
  var key=key();var request=new Receipt(list.id(),entry(food,"6",null));
  var first=shopping.receipt(email,key,request);assertThat(shopping.receipt(email,key,request)).isEqualTo(first);
  list=shopping.get(email,list.id());assertThat(list.status()).isEqualTo("PARTIAL");assertThat(list.received()).containsEntry(ref,"6");assertThat(list.stale()).isTrue();
  assertThat(stock.snapshot(email).accounts().getFirst().knowledge()).isEqualTo(Knowledge.PARTIAL);
  list=shopping.recalculate(email,list.id(),new Recalculate(list.version()));
  assertThat(list.adjustments()).containsEntry(ref,"20");assertThat(list.projection().rows().getFirst().shortage()).isEqualTo("8");assertThat(list.stale()).isFalse();
  stock.reverse(email,key(),new Reversal(first.operationId()));
  assertThat(shopping.get(email,list.id()).received()).isEmpty();
 }
 @Test void foreignListAndFractionalCountAdjustmentAreRejected(){
  var email=account();var food=food(email);plan(email,food);var other=account();
  var list=shopping.generate(email,new Generate(today(),today().plusDays(7)));
  assertThatThrownBy(()->shopping.get(other,list.id())).isInstanceOf(ResponseStatusException.class).hasMessageContaining("404");
  assertThatThrownBy(()->shopping.update(email,list.id(),new Update(list.version(),Map.of(ShoppingService.key(food,Basis.AS_SOLD),"1.5"),"DRAFT"))).isInstanceOf(ResponseStatusException.class).hasMessageContaining("400");
 }
 @Test void concurrentRetriesCreateOnlyOneEntry() throws Exception{
  var email=account();var food=food(email);var key=key();var input=entry(food,"12",null);
  var gate=new java.util.concurrent.CountDownLatch(1);
  try(var executor=java.util.concurrent.Executors.newVirtualThreadPerTaskExecutor()){
   var first=executor.submit(()->{gate.await();return stock.entry(email,key,input);});
   var second=executor.submit(()->{gate.await();return stock.entry(email,key,input);});
   gate.countDown();assertThat(first.get(15,java.util.concurrent.TimeUnit.SECONDS)).isEqualTo(second.get(15,java.util.concurrent.TimeUnit.SECONDS));
  }
  assertThat(stock.snapshot(email).history()).hasSize(1);assertThat(stock.snapshot(email).lots().getFirst().quantity()).isEqualTo("12");
 }
}

