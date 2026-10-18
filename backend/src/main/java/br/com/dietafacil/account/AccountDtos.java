package br.com.dietafacil.account;

import jakarta.validation.constraints.*;

public final class AccountDtos {
  private AccountDtos() {}

  public record Email(
      @NotBlank @jakarta.validation.constraints.Email @Size(max = 254) String email) {}

  public record Reset(
      @NotBlank @Size(max = 100) String token,
      @NotBlank @Size(min = 10, max = 72) String password) {}

  public record Token(@NotBlank @Size(max = 100) String token) {}

  public record Delete(
      @NotBlank @Size(max = 72) String password,
      @Pattern(regexp = "EXCLUIR") @NotNull String confirmation) {}

  public record Status(
      boolean emailVerified, boolean emailVerificationRequired, boolean recoveryAvailable) {}
}
