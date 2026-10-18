package br.com.dietafacil.profile;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "users")
public class AppUser {
  @Id private UUID id;
  private String name;
  private String email;
  private String passwordHash;
  private String timezone;
  private Instant createdAt;
  private Instant emailVerifiedAt;
  private long credentialVersion;
  private String accountRole = "CLIENT";

  public String getAccountRole() {
    return accountRole;
  }

  public void setAccountRole(String role) {
    accountRole = role;
  }

  protected AppUser() {}

  public AppUser(String name, String email, String passwordHash, String timezone) {
    this.id = UUID.randomUUID();
    this.name = name;
    this.email = email;
    this.passwordHash = passwordHash;
    this.timezone = timezone;
    this.createdAt = Instant.now();
  }

  public Instant getEmailVerifiedAt() {
    return emailVerifiedAt;
  }

  public long getCredentialVersion() {
    return credentialVersion;
  }

  public UUID getId() {
    return id;
  }

  public String getName() {
    return name;
  }

  public String getEmail() {
    return email;
  }

  public String getPasswordHash() {
    return passwordHash;
  }

  public String getTimezone() {
    return timezone;
  }

  public void updateProfile(String name, String timezone) {
    this.name = name;
    this.timezone = timezone;
  }
}
