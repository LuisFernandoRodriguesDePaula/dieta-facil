package br.com.dietafacil.account;

import br.com.dietafacil.profile.UserRepository;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

public class CredentialSessionFilter extends OncePerRequestFilter {
  private final UserRepository users;

  public CredentialSessionFilter(UserRepository users) {
    this.users = users;
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    var auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth != null && auth.isAuthenticated() && !(auth instanceof AnonymousAuthenticationToken)) {
      var user = users.findByEmail(auth.getName());
      var session = request.getSession(false);
      var version = session == null ? null : session.getAttribute("credentialVersion");
      if (user.isEmpty()
          || !(version instanceof Long)
          || ((Long) version).longValue() != user.get().getCredentialVersion()) {
        if (session != null) session.invalidate();
        SecurityContextHolder.clearContext();
        if (request.getRequestURI().startsWith("/api/")
            && !request.getRequestURI().startsWith("/api/auth/")) {
          response.setStatus(401);
          response.setContentType("application/json;charset=UTF-8");
          response
              .getWriter()
              .write(
                  "{\"code\":\"SESSION_ENDED\",\"message\":\"Entre novamente para continuar.\"}");
          return;
        }
      }
    }
    chain.doFilter(request, response);
  }
}
