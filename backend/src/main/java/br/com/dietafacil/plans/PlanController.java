package br.com.dietafacil.plans;
import jakarta.validation.Valid;
import java.time.LocalDate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import br.com.dietafacil.domain.DomainAccess;
@RestController
public class PlanController {
 private final PlanService plans;private final DomainAccess access;
 public PlanController(PlanService plans,DomainAccess access){this.plans=plans;this.access=access;}
 @GetMapping("/api/plan") public PlanDtos.Plan plan(Authentication auth,@RequestParam(required=false) LocalDate date){return plans.plan(auth.getName(),date==null?access.today(auth.getName()):date);}
 @PutMapping("/api/plan") public PlanDtos.Plan save(Authentication auth,@Valid @RequestBody PlanDtos.Save input){return plans.save(auth.getName(),input);}
 @GetMapping("/api/schedule") public PlanDtos.Schedule schedule(Authentication auth,@RequestParam(required=false) LocalDate date){return plans.schedule(auth.getName(),date==null?access.today(auth.getName()):date);}
 @PostMapping("/api/schedule/skip") public PlanDtos.Schedule skip(Authentication auth,@Valid @RequestBody PlanDtos.Skip input){return plans.skip(auth.getName(),input);}
}

