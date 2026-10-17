package br.com.dietafacil.auth;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import static org.assertj.core.api.Assertions.assertThat;

@ActiveProfiles("prod")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class SecureCookieHttpTest {
    @Value("${local.server.port}") private int port;

    @Test
    void productionProfileMarksSessionCookieSecureAndHttpOnly() throws Exception {
        var response = HttpClient.newHttpClient().send(HttpRequest.newBuilder(
            URI.create("http://127.0.0.1:" + port + "/api/auth/csrf")).GET().build(), HttpResponse.BodyHandlers.ofString());
        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.headers().firstValue("set-cookie").orElseThrow()).contains("Secure", "HttpOnly", "SameSite=Lax");
        // This verifies cookie configuration, not a real TLS deployment.
    }
}
