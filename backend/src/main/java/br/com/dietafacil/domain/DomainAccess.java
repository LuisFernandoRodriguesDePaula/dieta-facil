package br.com.dietafacil.domain;

import br.com.dietafacil.auth.AuthService;
import br.com.dietafacil.foods.FoodTypes.*;
import br.com.dietafacil.foods.QuantityConversion;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@Component
public class DomainAccess {
 public final JdbcTemplate db;
 private final AuthService users;
 public DomainAccess(JdbcTemplate db, AuthService users) { this.db=db; this.users=users; }
 public UUID owner(String email) { return users.currentUser(email).getId(); }
 public UUID lock(String email) {
  var id=owner(email);
  db.queryForObject("select id from users where id=? for update", UUID.class,id);
  return id;
 }
 public LocalDate today(String email) { return LocalDate.now(ZoneId.of(users.currentUser(email).getTimezone())); }
 public String timezone(String email) { return users.currentUser(email).getTimezone(); }
 public FoodRef food(UUID owner, UUID id, boolean active) {
  var rows=db.query("select * from foods where user_id=? and id=?", (r,n)-> new FoodRef(
   r.getObject("id",UUID.class),r.getString("name"),Unit.valueOf(r.getString("unit")),
   r.getString("category"),r.getString("purchase_frequency"),r.getTimestamp("archived_at")!=null),owner,id);
  if(rows.isEmpty()) throw error(404,"Alimento não encontrado.");
  var food=rows.getFirst();
  if(active && food.archived()) throw error(409,"Restaure o alimento antes de usá-lo em um novo cadastro.");
  return food;
 }
 public BigDecimal canonical(BigDecimal quantity, Unit input, FoodRef food) {
  try {
   if(input.dimension()!=food.unit().dimension()) throw error(400,"Unidade incompatível com o alimento.");
   var value=QuantityConversion.convert(quantity,input,food.unit().baseUnit());
   if(value.scale()>6 || value.precision()-value.scale()>13) throw error(400,"Quantidade fora dos limites suportados.");
   return value;
  } catch(IllegalArgumentException e) { throw error(400,e.getMessage()); }
 }
 public static ResponseStatusException error(int status,String message) {
  return new ResponseStatusException(HttpStatus.valueOf(status),message);
 }
 public record FoodRef(UUID id,String name,Unit unit,String category,String frequency,boolean archived) {}
}

