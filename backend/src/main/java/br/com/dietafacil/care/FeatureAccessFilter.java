package br.com.dietafacil.care;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

public class FeatureAccessFilter extends OncePerRequestFilter {
  private final FeatureService features;

  public FeatureAccessFilter(FeatureService features) {
    this.features = features;
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest req, HttpServletResponse res, FilterChain chain)
      throws IOException, ServletException {
    var auth = SecurityContextHolder.getContext().getAuthentication();
    var path = req.getRequestURI();
    if (auth != null
        && auth.isAuthenticated()
        && !auth.getName().equals("anonymousUser")
        && path.startsWith("/api/")) {
      var f = features.get(auth.getName());
      String reason = null;
      if ((path.startsWith("/api/inventory") || path.startsWith("/api/shopping"))
          && !f.inventoryEnabled())
        reason = "Estoque, compras e preparo estão desativados. Consulte Recursos Premium.";
      boolean write = !java.util.Set.of("GET", "HEAD", "OPTIONS").contains(req.getMethod());
      if (f.role().equals("CLIENT")
          && ((path.equals("/api/plan") && write)
              || (path.startsWith("/api/foods") && write)
              || (path.equals("/api/plan/substitutions") && write)
              || path.startsWith("/api/professional/")))
        reason = "A dieta e as alternativas são configuradas pelo nutricionista.";
      if (reason != null) {
        res.setStatus(403);
        res.setContentType("application/json;charset=UTF-8");
        res.getWriter().write("{\"code\":\"FEATURE_DISABLED\",\"message\":\"" + reason + "\"}");
        return;
      }
    }
    chain.doFilter(req, res);
  }
}
