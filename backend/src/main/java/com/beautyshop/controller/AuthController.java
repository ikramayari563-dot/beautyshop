package com.beautyshop.controller;
import com.beautyshop.model.*;
import com.beautyshop.repository.UserRepository;
import com.beautyshop.security.JwtUtil;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.*;
import org.slf4j.*;
import org.springframework.http.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/auth")
public class AuthController {
  private static final Logger log = LoggerFactory.getLogger(AuthController.class);
  record RegisterReq(@Email @NotBlank String email, @Size(min = 6) String password,
      @NotBlank String firstName, @NotBlank String lastName, String phone) {}
  record LoginReq(@NotBlank String email, @NotBlank String password) {}
  record ForgotReq(@Email @NotBlank String email) {}
  record ResetReq(@NotBlank String token, @Size(min = 6) String password) {}
  private final UserRepository users; private final PasswordEncoder enc; private final JwtUtil jwt;
  public AuthController(UserRepository u, PasswordEncoder e, JwtUtil j) { users = u; enc = e; jwt = j; }

  private Map<String, Object> token(User u) {
    return Map.of("token", jwt.generate(u.getEmail(), u.getRole().name()), "email", u.getEmail(),
        "role", u.getRole(), "firstName", u.getFirstName(), "lastName", u.getLastName());
  }
  @PostMapping("/register")
  public ResponseEntity<?> register(@Valid @RequestBody RegisterReq r) {
    if (users.findByEmail(r.email()).isPresent())
      return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "Email déjà utilisé"));
    var u = new User(); u.setEmail(r.email()); u.setPassword(enc.encode(r.password()));
    u.setFirstName(r.firstName()); u.setLastName(r.lastName()); u.setPhone(r.phone());
    u.setRole(Role.CLIENT); // sécurité : l'inscription publique crée toujours un CLIENT
    return ResponseEntity.ok(token(users.save(u)));
  }
  @PostMapping("/login")
  public ResponseEntity<?> login(@Valid @RequestBody LoginReq r) {
    var u = users.findByEmail(r.email()).orElse(null);
    if (u == null || !u.isActive() || !enc.matches(r.password(), u.getPassword()))
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Identifiants invalides"));
    return ResponseEntity.ok(token(u));
  }
  @PostMapping("/forgot-password")
  public Map<String, String> forgot(@Valid @RequestBody ForgotReq r) {
    users.findByEmail(r.email()).ifPresent(u -> {
      u.setResetToken(UUID.randomUUID().toString()); users.save(u);
      // TODO étape 2 : envoi réel par SMTP (JavaMailSender). En dev, le lien est journalisé.
      log.info("Lien de reset : http://localhost:4200/reset-password?token={}", u.getResetToken());
    });
    return Map.of("message", "Si l'email existe, un lien a été envoyé");
  }
  @PostMapping("/reset-password")
  public ResponseEntity<?> reset(@Valid @RequestBody ResetReq r) {
    var u = users.findByResetToken(r.token()).orElse(null);
    if (u == null) return ResponseEntity.badRequest().body(Map.of("error", "Token invalide"));
    u.setPassword(enc.encode(r.password())); u.setResetToken(null); users.save(u);
    return ResponseEntity.ok(Map.of("message", "Mot de passe mis à jour"));
  }
}
