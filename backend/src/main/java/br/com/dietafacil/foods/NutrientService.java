package br.com.dietafacil.foods;

import br.com.dietafacil.care.CareService;
import br.com.dietafacil.domain.DomainAccess;
import br.com.dietafacil.plans.PlanService;
import br.com.dietafacil.foods.FoodTypes.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.*;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;

@Service
@Transactional(readOnly=true)
public class NutrientService {
 private final DomainAccess access;
 public NutrientService(DomainAccess access){this.access=access;}
 public record Input(@NotNull Basis basis,@NotNull @Positive @Digits(integer=12,fraction=6) BigDecimal referenceQuantity,@NotNull Unit unit,
 @PositiveOrZero @Digits(integer=12,fraction=6) BigDecimal protein,@PositiveOrZero @Digits(integer=12,fraction=6) BigDecimal carbs,
 @PositiveOrZero @Digits(integer=12,fraction=6) BigDecimal fat,@PositiveOrZero @Digits(integer=12,fraction=6) BigDecimal energy,
 @NotBlank @Size(max=250) String source,@NotNull @PositiveOrZero Long version){}
 public record View(long revision,Input values){}
 public List<View> get(String email,UUID food,Basis basis){
  var owner=access.owner(email);access.food(owner,food,false);
  return access.db.query("select * from food_nutrients where user_id=? and food_id=? and basis=? order by revision desc limit 1",(r,n)->new View(r.getLong("revision"),new Input(basis,r.getBigDecimal("reference_quantity"),Unit.valueOf(r.getString("unit")),r.getBigDecimal("protein"),r.getBigDecimal("carbs"),r.getBigDecimal("fat"),r.getBigDecimal("energy"),r.getString("source"),r.getLong("revision"))),owner,food,basis.name());
 }
 @Transactional public View save(String email,UUID food,Input i){
  var owner=access.lock(email);var f=access.food(owner,food,true);
  if(f.unit().dimension()!=i.unit().dimension())throw DomainAccess.error(400,"A referência deve usar a mesma dimensão do alimento.");
  try { QuantityConversion.convert(i.referenceQuantity(),i.unit(),i.unit()); }
  catch(IllegalArgumentException e){throw DomainAccess.error(400,e.getMessage());}
  var current=get(email,food,i.basis());long version=current.isEmpty()?0:current.getFirst().revision();
  if(version!=i.version())throw DomainAccess.error(409,"A composição mudou. Recarregue antes de salvar.");
  access.db.update("insert into food_nutrients(id,user_id,food_id,revision,basis,reference_quantity,unit,protein,carbs,fat,energy,source,created_at) values(?,?,?,?,?,?,?,?,?,?,?,?,?)",UUID.randomUUID(),owner,food,version+1,i.basis().name(),i.referenceQuantity(),i.unit().name(),i.protein(),i.carbs(),i.fat(),i.energy(),i.source().strip(),OffsetDateTime.now());
  return get(email,food,i.basis()).getFirst();
 }
 public static BigDecimal portion(BigDecimal value,BigDecimal quantity,Unit unit,Input reference){
  if(value==null)return null;
  var converted=QuantityConversion.convert(quantity,unit,reference.unit());
  return converted.multiply(value).divide(reference.referenceQuantity(),12,RoundingMode.HALF_UP);
 }
}

@RestController
class NutrientController {
 private final NutrientService nutrients;private final CareService care;private final PlanService plans;
 NutrientController(NutrientService nutrients,CareService care,PlanService plans){this.nutrients=nutrients;this.care=care;this.plans=plans;}
 @GetMapping("/api/professional/clients/{client}/foods/{food}/nutrients")
 public List<NutrientService.View> get(Authentication a,@PathVariable UUID client,@PathVariable UUID food,@RequestParam Basis basis){return nutrients.get(care.clientEmail(a.getName(),client,false),food,basis);}
 @PutMapping("/api/professional/clients/{client}/foods/{food}/nutrients")
 @Transactional public NutrientService.View save(Authentication a,@PathVariable UUID client,@PathVariable UUID food,@Valid @RequestBody NutrientService.Input input){return nutrients.save(care.clientEmail(a.getName(),client,true),food,input);}
 public record Total(String name,Map<String,BigDecimal> known,Map<String,Integer> missing){}
 @GetMapping("/api/professional/clients/{client}/nutrient-preview")
 public List<Total> preview(Authentication a,@PathVariable UUID client,@RequestParam LocalDate date){
  var email=care.clientEmail(a.getName(),client,false);var schedule=plans.schedule(email,date);var result=new ArrayList<Total>();
  for(var meal:schedule.meals()){
   var sums=new LinkedHashMap<String,BigDecimal>();var missing=new LinkedHashMap<String,Integer>();
   for(var key:List.of("protein","carbs","fat","energy")){sums.put(key,BigDecimal.ZERO);missing.put(key,0);}
   for(var item:meal.items()){
    var refs=nutrients.get(email,item.foodId(),item.basis());var r=refs.isEmpty()?null:refs.getFirst().values();
    BigDecimal[] values=r==null?new BigDecimal[4]:new BigDecimal[]{r.protein(),r.carbs(),r.fat(),r.energy()};int index=0;
    for(var key:sums.keySet()){var value=values[index++];if(value==null){missing.put(key,missing.get(key)+1);}else{sums.put(key,sums.get(key).add(NutrientService.portion(value,new BigDecimal(item.quantity()),item.unit(),r)));}}
   }
   result.add(new Total(meal.name(),sums,missing));
  }
  if(!result.isEmpty()){
   var day=new LinkedHashMap<String,BigDecimal>();var missing=new LinkedHashMap<String,Integer>();
   for(var key:List.of("protein","carbs","fat","energy")){day.put(key,BigDecimal.ZERO);missing.put(key,0);}
   for(var meal:result)for(var key:day.keySet()){day.put(key,day.get(key).add(meal.known().get(key)));missing.put(key,missing.get(key)+meal.missing().get(key));}
   result.add(new Total("Total do dia — prévia",day,missing));
  }
  return result;
 }
}
