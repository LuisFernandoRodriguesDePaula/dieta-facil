package br.com.dietafacil.auth;

import br.com.dietafacil.profile.UserRepository;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.session.ChangeSessionIdAuthenticationStrategy;
import org.springframework.security.web.authentication.session.CompositeSessionAuthenticationStrategy;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfAuthenticationStrategy;
import org.springframework.security.web.csrf.HttpSessionCsrfTokenRepository;

@Configuration
public class SecurityConfig {
  @Bean
  PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder(12);
  }

  @Bean
  UserDetailsService userDetailsService(UserRepository users) {
    return email -> {
      var user =
          users
              .findByEmail(AuthService.normalizeEmail(email))
              .orElseThrow(() -> new UsernameNotFoundException("Credenciais inválidas."));
      return User.withUsername(user.getEmail())
          .password(user.getPasswordHash())
          .roles("USER")
          .build();
    };
  }

  @Bean
  AuthenticationManager authenticationManager(UserDetailsService details, PasswordEncoder encoder) {
    var provider = new DaoAuthenticationProvider(details);
    provider.setPasswordEncoder(encoder);
    return new ProviderManager(provider);
  }

  @Bean
  SecurityContextRepository securityContextRepository() {
    return new HttpSessionSecurityContextRepository();
  }

  @Bean
  HttpSessionCsrfTokenRepository csrfTokenRepository() {
    return new HttpSessionCsrfTokenRepository();
  }

  @Bean
  SessionAuthenticationStrategy sessionAuthenticationStrategy(HttpSessionCsrfTokenRepository csrf) {
    return new CompositeSessionAuthenticationStrategy(
        List.of(new ChangeSessionIdAuthenticationStrategy(), new CsrfAuthenticationStrategy(csrf)));
  }

  @Bean
  SecurityFilterChain securityFilterChain(
      HttpSecurity http,
      SecurityContextRepository contexts,
      HttpSessionCsrfTokenRepository csrf,
      UserRepository users,
      org.springframework.core.env.Environment env)
      throws Exception {
    return http.addFilterAfter(
            new br.com.dietafacil.account.CredentialSessionFilter(users),
            org.springframework.security.web.context.SecurityContextHolderFilter.class)
        .addFilterBefore(
            new br.com.dietafacil.account.AccessRateLimitFilter(
                env.getProperty("app.security.rate-limit-enabled", Boolean.class, false)),
            org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter
                .class)
        .headers(
            headers -> {
              headers.referrerPolicy(
                  policy ->
                      policy.policy(
                          org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter
                              .ReferrerPolicy.NO_REFERRER));
              if (env.acceptsProfiles(org.springframework.core.env.Profiles.of("prod")))
                headers.contentSecurityPolicy(
                    csp ->
                        csp.policyDirectives(
                            "default-src 'self'; script-src 'self'; style-src 'self'"
                                + " 'unsafe-inline' https://fonts.googleapis.com; font-src 'self'"
                                + " https://fonts.gstatic.com; img-src 'self' data:; connect-src"
                                + " 'self'; object-src 'none'; base-uri 'self'; form-action 'self';"
                                + " frame-ancestors 'none'"));
            })
        .authorizeHttpRequests(
            auth ->
                auth.requestMatchers(
                        org.springframework.http.HttpMethod.GET,
                        "/",
                        "/index.html",
                        "/assets/**",
                        "/favicon.svg",
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
                        "/sobre")
                    .permitAll()
                    .requestMatchers(
                        "/api/auth/forgot-password",
                        "/api/auth/reset-password",
                        "/api/auth/resend-verification",
                        "/api/auth/verify-email",
                        "/api/auth/csrf",
                        "/api/auth/register",
                        "/api/auth/login",
                        "/api/demo/**",
                        "/actuator/health",
                        "/error")
                    .permitAll()
                    .anyRequest()
                    .authenticated())
        .csrf(config -> config.csrfTokenRepository(csrf))
        .securityContext(context -> context.securityContextRepository(contexts))
        .requestCache(cache -> cache.disable())
        .exceptionHandling(
            errors ->
                errors
                    .authenticationEntryPoint(
                        (request, response, exception) ->
                            writeError(
                                response,
                                401,
                                "UNAUTHENTICATED",
                                "Entre novamente para continuar."))
                    .accessDeniedHandler(
                        (request, response, exception) ->
                            writeError(
                                response,
                                403,
                                "FORBIDDEN",
                                "Solicitação não autorizada. Atualize a página e tente"
                                    + " novamente.")))
        .logout(
            logout ->
                logout
                    .logoutUrl("/api/auth/logout")
                    .deleteCookies("JSESSIONID")
                    .logoutSuccessHandler(
                        (request, response, authentication) -> response.setStatus(204)))
        .build();
  }

  private static void writeError(
      HttpServletResponse response, int status, String code, String message) throws IOException {
    response.setStatus(status);
    response.setContentType("application/json;charset=UTF-8");
    response.getWriter().write("{\"code\":\"" + code + "\",\"message\":\"" + message + "\"}");
  }
}
