package br.com.dietafacil.auth;

import br.com.dietafacil.profile.AppUser;
import br.com.dietafacil.profile.UserRepository;
import java.nio.charset.StandardCharsets;
import java.time.DateTimeException;
import java.time.ZoneId;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {
  private final UserRepository users;
  private final PasswordEncoder encoder;

  public AuthService(UserRepository users, PasswordEncoder encoder) {
    this.users = users;
    this.encoder = encoder;
  }

  public static String normalizeEmail(String email) {
    return email.strip().toLowerCase(Locale.ROOT);
  }

  public static String validTimezone(String timezone) {
    try {
      return ZoneId.of(timezone).getId();
    } catch (DateTimeException exception) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Fuso horário inválido.");
    }
  }

  @Transactional
  public AuthDtos.Profile register(AuthDtos.Registration input) {
    if (input.password().getBytes(StandardCharsets.UTF_8).length > 72) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "A senha deve ter até 72 bytes em UTF-8.");
    }
    var timezone = validTimezone(input.timezone());
    var user =
        new AppUser(
            input.name().strip(),
            normalizeEmail(input.email()),
            encoder.encode(input.password()),
            timezone);
    if (input.role() != null && !java.util.Set.of("CLIENT", "NUTRITIONIST").contains(input.role()))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Perfil inválido.");
    user.setAccountRole(input.role() == null ? "CLIENT" : input.role());
    return AuthDtos.Profile.from(users.saveAndFlush(user));
  }

  public AppUser currentUser(String email) {
    return users
        .findByEmail(email)
        .orElseThrow(
            () ->
                new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED, "Entre novamente para continuar."));
  }

  @Transactional
  public AuthDtos.Profile update(String email, AuthDtos.ProfileUpdate input) {
    var user = currentUser(email);
    user.updateProfile(input.name().strip(), validTimezone(input.timezone()));
    return AuthDtos.Profile.from(user);
  }
}
