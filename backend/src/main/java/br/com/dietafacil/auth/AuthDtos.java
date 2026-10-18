package br.com.dietafacil.auth;

import br.com.dietafacil.profile.AppUser;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public final class AuthDtos {
  private AuthDtos() {}

  public record Registration(
      @NotBlank @Size(max = 100) String name,
      @NotBlank @Email @Size(max = 254) String email,
      @NotBlank @Size(min = 10, max = 72) String password,
      @NotBlank @Size(max = 100) String timezone) {}

  public record Login(
      @NotBlank @Email @Size(max = 254) String email, @NotBlank @Size(max = 72) String password) {}

  public record ProfileUpdate(
      @NotBlank @Size(max = 100) String name, @NotBlank @Size(max = 100) String timezone) {}

  public record Registered(
      UUID id, String name, String email, String timezone, boolean emailVerificationRequired) {}

  public record Profile(UUID id, String name, String email, String timezone) {
    public static Profile from(AppUser user) {
      return new Profile(user.getId(), user.getName(), user.getEmail(), user.getTimezone());
    }
  }
}
