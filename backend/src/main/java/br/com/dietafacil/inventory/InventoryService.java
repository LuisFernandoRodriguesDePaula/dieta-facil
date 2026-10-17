package br.com.dietafacil.inventory;

import br.com.dietafacil.domain.DomainAccess;
import br.com.dietafacil.foods.FoodTypes.*;
import br.com.dietafacil.plans.PlanService;
import br.com.dietafacil.plans.PlanDtos;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.Timestamp;
import java.time.*;
import java.util.*;
import java.util.function.Supplier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;
import static br.com.dietafacil.domain.DomainAccess.error;
import static br.com.dietafacil.inventory.InventoryDtos.*;

@Service
@Transactional(readOnly=true)
public class InventoryService {
 private final DomainAccess access;
 private final ObjectMapper json;
 private final PlanService plans;
 public InventoryService(DomainAccess access,ObjectMapper json,PlanService plans){this.access=access;this.json=json;this.plans=plans;}
 public List<Lot> lots(UUID owner) {
  return access.db.query("select l.*,f.name,f.unit from inventory_lots l join foods f on f.id=l.food_id and f.user_id=l.user_id where l.user_id=? order by l.expiry nulls last,l.received_date,l.id",(r,n)->new Lot(r.getObject("id",UUID.class),r.getObject("food_id",UUID.class),r.getString("name"),Basis.valueOf(r.getString("basis")),plain(r.getBigDecimal("quantity")),Unit.valueOf(r.getString("unit")).baseUnit(),Location.valueOf(r.getString("location")),Condition.valueOf(r.getString("condition")),r.getObject("received_date",LocalDate.class),r.getObject("expiry",LocalDate.class),ExpirySource.valueOf(r.getString("expiry_source")),r.getObject("opened_date",LocalDate.class),r.getObject("prepared_date",LocalDate.class),r.getLong("version")),owner);
 }
 public Knowledge knowledge(UUID owner,UUID food,Basis basis){
  var rows=access.db.queryForList("select knowledge from inventory_accounts where user_id=? and food_id=? and basis=?",String.class,owner,food,basis.name());
  return rows.isEmpty()?Knowledge.UNKNOWN:Knowledge.valueOf(rows.getFirst());
 }
 public Snapshot snapshot(String email){
  var owner=access.owner(email);var lots=lots(owner);
  var accounts=access.db.query("select a.*,f.name,f.unit from inventory_accounts a join foods f on f.user_id=a.user_id and f.id=a.food_id where a.user_id=? order by f.name,a.basis",(r,n)->{
   var food=r.getObject("food_id",UUID.class);var basis=Basis.valueOf(r.getString("basis"));
   var quantity=lots.stream().filter(l->l.foodId().equals(food)&&l.basis()==basis).map(l->new BigDecimal(l.quantity())).reduce(BigDecimal.ZERO,BigDecimal::add);
   return new Account(food,r.getString("name"),basis,Knowledge.valueOf(r.getString("knowledge")),Unit.valueOf(r.getString("unit")).baseUnit(),plain(quantity));
  },owner);
  var history=access.db.query("select o.*,(select count(*) from inventory_operations rev where rev.reversal_of=o.id) as reversed from inventory_operations o where o.user_id=? order by o.created_at desc,o.id desc limit 100",(r,n)->{
   var id=r.getObject("id",UUID.class);
   var movements=access.db.query("select m.lot_id,m.delta,l.basis,f.name,f.unit from inventory_movements m join inventory_lots l on l.id=m.lot_id join foods f on f.id=l.food_id where m.operation_id=? and m.user_id=? order by m.id",(m,k)->new Movement(m.getObject("lot_id",UUID.class),m.getString("name"),Basis.valueOf(m.getString("basis")),plain(m.getBigDecimal("delta")),Unit.valueOf(m.getString("unit")).baseUnit()),id,owner);
   return new Operation(id,r.getString("kind"),r.getTimestamp("created_at").toInstant(),r.getObject("source_id",UUID.class),r.getObject("reversal_of",UUID.class),r.getInt("reversed")>0,movements);
  },owner);
  return new Snapshot(lots,accounts,history);
 }
 private void setKnowledge(UUID owner,UUID food,Basis basis,Knowledge knowledge){
  int updated=access.db.update("update inventory_accounts set knowledge=? where user_id=? and food_id=? and basis=?",knowledge.name(),owner,food,basis.name());
  if(updated==0)access.db.update("insert into inventory_accounts values (?,?,?,?)",owner,food,basis.name(),knowledge.name());
 }
 @Transactional public Snapshot knowledge(String email,KnowledgeInput input){
  var owner=access.lock(email);access.food(owner,input.foodId(),false);
  setKnowledge(owner,input.foodId(),input.basis(),input.knowledge());return snapshot(email);
 }
 // All commands lock the account before checking the key, so concurrent retries see the committed result.
 public Result command(UUID owner,String key,String kind,Object input,UUID source,UUID reversal,Supplier<UUID> action){
  if(key==null||!key.matches("[a-zA-Z0-9_-]{8,80}"))throw error(400,"Informe uma chave de operação válida.");
  String hash;
  try{hash=HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest((kind+":"+json.writeValueAsString(input)).getBytes(StandardCharsets.UTF_8)));}
  catch(java.security.NoSuchAlgorithmException ex){throw new IllegalStateException(ex);}
  var prior=access.db.query("select request_hash,result_json from inventory_operations where user_id=? and request_key=?",(r,n)->new String[]{r.getString(1),r.getString(2)},owner,key);
  if(!prior.isEmpty()){
   if(!prior.getFirst()[0].equals(hash))throw error(409,"Esta chave já foi usada com dados diferentes.");
   return json.readValue(prior.getFirst()[1],Result.class);
  }
  var id=UUID.randomUUID();var result=new Result(id,"Operação registrada.");
  access.db.update("insert into inventory_operations values (?,?,?,?,?,?,?,?,?,?)",id,owner,kind,key,hash,json.writeValueAsString(input),json.writeValueAsString(result),source,reversal,Timestamp.from(Instant.now()));
  // The operation is visible to its movement rows inside this transaction only.
  currentOperation.set(id);
  try{action.get();}finally{currentOperation.remove();}
  return result;
 }
 private final ThreadLocal<UUID> currentOperation=new ThreadLocal<>();
 private void move(UUID owner,UUID lot,BigDecimal delta){
  int changed=access.db.update("update inventory_lots set quantity=quantity+?,version=version+1 where user_id=? and id=? and quantity+?>=0",delta,owner,lot,delta);
  if(changed!=1)throw error(409,"Saldo insuficiente. Nenhuma movimentação foi aplicada.");
  access.db.update("insert into inventory_movements values (?,?,?,?,?)",UUID.randomUUID(),owner,currentOperation.get(),lot,delta);
 }
 public UUID receive(UUID owner,Entry input,LocalDate today,boolean purchase){
  var food=access.food(owner,input.foodId(),true);
  var quantity=access.canonical(input.quantity(),input.unit(),food);
  if(input.receivedDate().isAfter(today))throw error(400,"A entrada não pode estar no futuro.");
  if((input.expiry()==null)!=(input.expirySource()==ExpirySource.UNKNOWN))throw error(400,"Informe a validade e sua origem, ou selecione validade desconhecida.");
  if(input.openedDate()!=null&&(input.openedDate().isBefore(input.receivedDate())||input.openedDate().isAfter(today)))throw error(400,"Data de abertura inválida.");
  if(input.preparedDate()!=null&&(input.preparedDate().isBefore(input.receivedDate())||input.preparedDate().isAfter(today)))throw error(400,"Data de preparo inválida.");
  if(input.condition()==Condition.OPENED&&input.openedDate()==null)throw error(400,"Informe a data de abertura.");
  if(input.condition()==Condition.PREPARED&&input.preparedDate()==null)throw error(400,"Informe a data de preparo.");
  var id=UUID.randomUUID();
  access.db.update("insert into inventory_lots values (?,?,?,?,?,?,?,?,?,?,?,?,0)",id,owner,food.id(),input.basis().name(),BigDecimal.ZERO,input.location().name(),input.condition().name(),input.receivedDate(),input.expiry(),input.expirySource().name(),input.openedDate(),input.preparedDate());
  move(owner,id,quantity);
  var old=knowledge(owner,food.id(),input.basis());
  setKnowledge(owner,food.id(),input.basis(),purchase?(old==Knowledge.KNOWN?Knowledge.KNOWN:Knowledge.PARTIAL):input.knowledge());
  return id;
 }
 @Transactional public Result entry(String email,String key,Entry input){
  var owner=access.lock(email);
  return command(owner,key,"ENTRY",input,null,null,()->receive(owner,input,access.today(email),false));
 }
 @Transactional public Result discard(String email,String key,Discard input){
  var owner=access.lock(email);
  return command(owner,key,"DISCARD",input,null,null,()->{
   var lot=lots(owner).stream().filter(l->l.id().equals(input.lotId())).findFirst().orElseThrow(()->error(404,"Lote não encontrado."));
   var food=access.food(owner,lot.foodId(),false);
   move(owner,lot.id(),access.canonical(input.quantity(),input.unit(),food).negate());return lot.id();
  });
 }
 public void take(UUID owner,UUID food,Basis basis,BigDecimal quantity,LocalDate date){
  var available=lots(owner).stream().filter(l->l.foodId().equals(food)&&l.basis()==basis&&!l.receivedDate().isAfter(date)&&(l.expiry()==null||!l.expiry().isBefore(date))).toList();
  var remaining=quantity;
  for(var lot:available){
   var use=new BigDecimal(lot.quantity()).min(remaining);
   if(use.signum()>0){move(owner,lot.id(),use.negate());remaining=remaining.subtract(use);}
   if(remaining.signum()==0)return;
  }
  throw error(409,"Estoque insuficiente para o alimento e estado informados. Confira os lotes e suas validades.");
 }
 @Transactional public Result prepare(String email,String key,Prepare input){
  var owner=access.lock(email);var date=access.today(email);
  return command(owner,key,"PREPARE",input,null,null,()->{
   var food=access.food(owner,input.foodId(),true);
   if(!input.output().foodId().equals(food.id())||input.output().basis()!=Basis.COOKED||input.output().condition()!=Condition.PREPARED||!date.equals(input.output().preparedDate())||!date.equals(input.output().receivedDate()))
    throw error(400,"O preparo deve gerar um lote preparado do mesmo alimento, com as datas de hoje.");
   var quantity=access.canonical(input.inputQuantity(),input.inputUnit(),food);
   take(owner,food.id(),Basis.RAW,quantity,date);
   return receive(owner,input.output(),date,true);
  });
 }
 @Transactional public Result consume(String email,String key,Consume input){
  var owner=access.lock(email);var today=access.today(email);
  return command(owner,key,"CONSUME",input,PlanService.occurrenceId(owner,input.mealId(),input.date()),null,()->{
   if(input.date().isAfter(today))throw error(400,"Não confirme uma refeição futura.");
   var occurrence=plans.occurrences(owner,input.date()).stream().filter(o->o.mealId().equals(input.mealId())).findFirst().orElseThrow(()->error(404,"Refeição não encontrada."));
   if(!occurrence.status().equals("PENDING"))throw error(409,"Esta refeição já foi registrada ou pulada.");
   var expected=new HashSet<String>();for(var item:occurrence.items())expected.add(item.foodId()+":"+item.basis());
   var actual=new HashSet<String>();var items=new ArrayList<PlanDtos.Item>();
   for(var item:input.items()){
    var ref=item.foodId()+":"+item.basis();
    if(!expected.contains(ref))throw error(400,"O consumo deve usar os alimentos e estados previstos. Revise a dieta para substituições.");
    actual.add(ref);var food=access.food(owner,item.foodId(),false);
    var quantity=access.canonical(item.quantity(),item.unit(),food);
    take(owner,food.id(),item.basis(),quantity,input.date());
    items.add(new PlanDtos.Item(food.id(),food.name(),plain(quantity),food.unit().baseUnit(),item.basis(),food.category(),food.frequency()));
   }
   if(!actual.equals(expected))throw error(400,"Informe o consumo de todos os alimentos previstos.");
   plans.store(owner,new PlanDtos.Occurrence(occurrence.id(),occurrence.mealId(),occurrence.date(),occurrence.name(),occurrence.time(),"CONSUMED",items));
   return occurrence.id();
  });
 }
 @Transactional public Result reverse(String email,String key,Reversal input){
  var owner=access.lock(email);
  return command(owner,key,"REVERSAL",input,null,input.operationId(),()->{
   var original=access.db.query("select kind,source_id from inventory_operations where user_id=? and id=?",(r,n)->new Object[]{r.getString(1),r.getObject(2,UUID.class)},owner,input.operationId());
   if(original.isEmpty())throw error(404,"Operação não encontrada.");
   if(original.getFirst()[0].equals("REVERSAL"))throw error(409,"Não é possível estornar um estorno.");
   // Ignore this command's own row when detecting a previous reversal.
   var others=access.db.queryForObject("select count(*) from inventory_operations where reversal_of=? and id<>?",Long.class,input.operationId(),currentOperation.get());
   if(others!=0)throw error(409,"Esta operação já foi estornada.");
   var movements=access.db.query("select lot_id,delta from inventory_movements where operation_id=? and user_id=? order by lot_id",(r,n)->new Object[]{r.getObject(1,UUID.class),r.getBigDecimal(2)},input.operationId(),owner);
   for(var movement:movements)move(owner,(UUID)movement[0],((BigDecimal)movement[1]).negate());
   if(original.getFirst()[0].equals("CONSUME"))access.db.update("delete from meal_occurrences where user_id=? and id=? and status='CONSUMED'",owner,original.getFirst()[1]);
   return input.operationId();
  });
 }
 public static String plain(BigDecimal value){return value.stripTrailingZeros().toPlainString();}
}



