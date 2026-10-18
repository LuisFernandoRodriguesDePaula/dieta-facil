package br.com.dietafacil.account;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.time.*;
import java.util.*;
import org.springframework.web.filter.OncePerRequestFilter;

public class AccessRateLimitFilter extends OncePerRequestFilter {
  private record Bucket(Instant start, int attempts) {}

  private final Map<String, Bucket> buckets = new LinkedHashMap<>(256, 0.75f, true);
  private final boolean enabled;
  private final Clock clock;

  public AccessRateLimitFilter(boolean enabled) {
    this(enabled, Clock.systemUTC());
  }

  AccessRateLimitFilter(boolean enabled, Clock clock) {
    this.enabled = enabled;
    this.clock = clock;
  }

  private synchronized boolean allowed(String key) {
    var now = clock.instant();
    var bucket = buckets.get(key);
    if (bucket == null || bucket.start().plusSeconds(900).isBefore(now))
      bucket = new Bucket(now, 0);
    if (buckets.size() >= 10000 && !buckets.containsKey(key))
      buckets.remove(buckets.keySet().iterator().next());
    buckets.put(key, new Bucket(bucket.start(), bucket.attempts() + 1));
    return bucket.attempts() < 20;
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws IOException, ServletException {
    if (enabled
        && request.getMethod().equals("POST")
        && Set.of(
                "/api/auth/login",
                "/api/auth/register",
                "/api/auth/forgot-password",
                "/api/auth/resend-verification",
                "/api/auth/reset-password",
                "/api/auth/verify-email")
            .contains(request.getRequestURI())
        && !allowed(request.getRemoteAddr() + ":" + request.getRequestURI())) {
      response.setStatus(429);
      response.setHeader("Retry-After", "900");
      response.setContentType("application/json;charset=UTF-8");
      response
          .getWriter()
          .write(
              "{\"code\":\"TOO_MANY_ATTEMPTS\",\"message\":\"Muitas tentativas. Aguarde alguns"
                  + " minutos antes de tentar novamente.\"}");
      return;
    }
    chain.doFilter(request, response);
  }
}
