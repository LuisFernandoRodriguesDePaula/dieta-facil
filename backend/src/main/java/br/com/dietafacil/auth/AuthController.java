package br.com.dietafacil.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

@RestController
public class AuthController {
  private final AuthService users;
  private final br.com.dietafacil.account.AccountService accounts;
  private final AuthenticationManager manager;
  private final SessionAuthenticationStrategy sessions;
  private final SecurityContextRepository contexts;

  public AuthController(
      AuthService users,
      AuthenticationManager manager,
      SessionAuthenticationStrategy sessions,
      SecurityContextRepository contexts,
      br.com.dietafacil.account.AccountService accounts) {
    this.accounts = accounts;
    this.users = users;
    this.manager = manager;
    this.sessions = sessions;
    this.contexts = contexts;
  }

  @GetMapping("/api/auth/csrf")
  public Map<String, String> csrf(CsrfToken token) {
    return Map.of("token", token.getToken(), "headerName", token.getHeaderName());
  }

  @PostMapping("/api/auth/register")
  @ResponseStatus(HttpStatus.CREATED)
  @org.springframework.transaction.annotation.Transactional
  public AuthDtos.Registered register(@Valid @RequestBody AuthDtos.Registration input) {
    var profile = users.register(input);
    if (accounts.verificationRequired()) accounts.issue(profile.email(), "VERIFY");
    return new AuthDtos.Registered(
        profile.id(),
        profile.name(),
        profile.email(),
        profile.timezone(),
        accounts.verificationRequired());
  }

  @PostMapping("/api/auth/login")
  public AuthDtos.Profile login(
      @Valid @RequestBody AuthDtos.Login input,
      HttpServletRequest request,
      HttpServletResponse response) {
    if (input.password().getBytes(StandardCharsets.UTF_8).length > 72) {
      throw new BadCredentialsException("Credenciais inválidas.");
    }
    var authentication =
        manager.authenticate(
            UsernamePasswordAuthenticationToken.unauthenticated(
                AuthService.normalizeEmail(input.email()), input.password()));
    var user = users.currentUser(authentication.getName());
    if (accounts.verificationRequired() && user.getEmailVerifiedAt() == null)
      throw new org.springframework.web.server.ResponseStatusException(
          HttpStatus.FORBIDDEN,
          "Confirme seu e-mail antes de entrar. Você pode solicitar um novo link.");
    sessions.onAuthentication(authentication, request, response);
    request.getSession().setAttribute("credentialVersion", user.getCredentialVersion());
    var context = SecurityContextHolder.createEmptyContext();
    context.setAuthentication(authentication);
    SecurityContextHolder.setContext(context);
    contexts.saveContext(context, request, response);
    return AuthDtos.Profile.from(users.currentUser(authentication.getName()));
  }

  @GetMapping("/api/me")
  public AuthDtos.Profile me(Authentication authentication) {
    return AuthDtos.Profile.from(users.currentUser(authentication.getName()));
  }

  @PatchMapping("/api/me")
  public AuthDtos.Profile update(
      Authentication authentication, @Valid @RequestBody AuthDtos.ProfileUpdate input) {
    return users.update(authentication.getName(), input);
  }
}
