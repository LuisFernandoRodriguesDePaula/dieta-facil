package br.com.dietafacil.auth;

import br.com.dietafacil.profile.UserRepository;
import java.io.IOException;
import java.util.List;
import jakarta.servlet.http.HttpServletResponse;
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
    PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(12); }

    @Bean
    UserDetailsService userDetailsService(UserRepository users) {
        return email -> {
            var user = users.findByEmail(AuthService.normalizeEmail(email))
                .orElseThrow(() -> new UsernameNotFoundException("Credenciais inválidas."));
            return User.withUsername(user.getEmail()).password(user.getPasswordHash()).roles("USER").build();
        };
    }

    @Bean
    AuthenticationManager authenticationManager(UserDetailsService details, PasswordEncoder encoder) {
        var provider = new DaoAuthenticationProvider(details);
        provider.setPasswordEncoder(encoder);
        return new ProviderManager(provider);
    }

    @Bean
    SecurityContextRepository securityContextRepository() { return new HttpSessionSecurityContextRepository(); }

    @Bean
    HttpSessionCsrfTokenRepository csrfTokenRepository() { return new HttpSessionCsrfTokenRepository(); }

    @Bean
    SessionAuthenticationStrategy sessionAuthenticationStrategy(HttpSessionCsrfTokenRepository csrf) {
        return new CompositeSessionAuthenticationStrategy(List.of(
            new ChangeSessionIdAuthenticationStrategy(), new CsrfAuthenticationStrategy(csrf)));
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, SecurityContextRepository contexts,
                                           HttpSessionCsrfTokenRepository csrf) throws Exception {
        return http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/csrf", "/api/auth/register", "/api/auth/login",
                    "/api/demo/**", "/actuator/health", "/error").permitAll()
                .anyRequest().authenticated())
            .csrf(config -> config.csrfTokenRepository(csrf))
            .securityContext(context -> context.securityContextRepository(contexts))
            .requestCache(cache -> cache.disable())
            .exceptionHandling(errors -> errors
                .authenticationEntryPoint((request, response, exception) ->
                    writeError(response, 401, "UNAUTHENTICATED", "Entre novamente para continuar."))
                .accessDeniedHandler((request, response, exception) ->
                    writeError(response, 403, "FORBIDDEN", "Solicitação não autorizada. Atualize a página e tente novamente.")))
            .logout(logout -> logout.logoutUrl("/api/auth/logout")
                .deleteCookies("JSESSIONID")
                .logoutSuccessHandler((request, response, authentication) -> response.setStatus(204)))
            .build();
    }

    private static void writeError(HttpServletResponse response, int status, String code, String message) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write("{\"code\":\"" + code + "\",\"message\":\"" + message + "\"}");
    }
}
