package br.com.dietafacil.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class SpaController {
  @GetMapping({
    "/",
    "/entrar",
    "/cadastro",
    "/recuperar-senha",
    "/redefinir-senha",
    "/confirmar-email",
    "/conta",
    "/conta/**",
    "/minha-dieta",
    "/alimentos",
    "/compras",
    "/preparo",
    "/sobre"
  })
  public String app() {
    return "forward:/index.html";
  }
}
