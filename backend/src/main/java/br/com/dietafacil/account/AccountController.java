package br.com.dietafacil.account;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
public class AccountController {
  private final AccountService accounts;

  public AccountController(AccountService accounts) {
    this.accounts = accounts;
  }

  private Map<String, String> accepted() {
    return Map.of(
        "message",
        accounts.localDelivery()
            ? "Se houver uma conta elegível, geraremos um link. Neste ambiente local, consulte a"
                  + " pasta .local/mail do projeto."
            : "Se houver uma conta elegível, enviaremos um link. Confira também a pasta de spam.");
  }

  @PostMapping("/api/auth/forgot-password")
  @ResponseStatus(HttpStatus.ACCEPTED)
  public Map<String, String> forgot(@Valid @RequestBody AccountDtos.Email input) {
    accounts.issue(input.email(), "RESET");
    return accepted();
  }

  @PostMapping("/api/auth/resend-verification")
  @ResponseStatus(HttpStatus.ACCEPTED)
  public Map<String, String> resend(@Valid @RequestBody AccountDtos.Email input) {
    accounts.issue(input.email(), "VERIFY");
    return accepted();
  }

  @PostMapping("/api/auth/reset-password")
  public Map<String, String> reset(@Valid @RequestBody AccountDtos.Reset input) {
    accounts.reset(input);
    return Map.of("message", "Senha atualizada. Entre novamente nos seus dispositivos.");
  }

  @PostMapping("/api/auth/verify-email")
  public Map<String, String> verify(@Valid @RequestBody AccountDtos.Token input) {
    accounts.verify(input.token());
    return Map.of("message", "E-mail confirmado. Você já pode entrar.");
  }

  @GetMapping("/api/account/status")
  public AccountDtos.Status status(Authentication auth) {
    return accounts.status(auth.getName());
  }

  @DeleteMapping("/api/account")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(
      Authentication auth,
      @Valid @RequestBody AccountDtos.Delete input,
      HttpServletRequest request) {
    accounts.delete(auth.getName(), input);
    var session = request.getSession(false);
    if (session != null) session.invalidate();
    SecurityContextHolder.clearContext();
  }
}
