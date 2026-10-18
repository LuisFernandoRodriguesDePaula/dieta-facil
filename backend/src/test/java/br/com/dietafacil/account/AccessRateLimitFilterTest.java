package br.com.dietafacil.account;

import static org.assertj.core.api.Assertions.*;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.*;

class AccessRateLimitFilterTest {
  @Test
  void limitsAuthenticationAttemptsWithoutTrustingForwardedHeaders() throws Exception {
    var limiter = new AccessRateLimitFilter(true);
    for (int i = 0; i < 21; i++) {
      var request = new MockHttpServletRequest("POST", "/api/auth/login");
      request.setRemoteAddr("127.0.0.1");
      request.addHeader("X-Forwarded-For", "192.0.2." + i);
      var response = new MockHttpServletResponse();
      limiter.doFilter(request, response, new MockFilterChain());
      assertThat(response.getStatus()).isEqualTo(i < 20 ? 200 : 429);
    }
  }
}
