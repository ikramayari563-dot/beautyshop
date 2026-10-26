package com.beautyshop.controller;
import com.beautyshop.model.User;
import com.beautyshop.repository.UserRepository;
import java.util.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/profile")
public class ProfileController {
  record Info(String firstName, String lastName, String phone) {}
  record Pwd(String oldPassword, String newPassword) {}
  private final UserRepository users; private final PasswordEncoder enc;
  public ProfileController(UserRepository u, PasswordEncoder e) { users = u; enc = e; }
  private Map<String, Object> view(User u) {
    return Map.of("email", u.getEmail(), "firstName", u.getFirstName(), "lastName", u.getLastName(), "phone", u.getPhone() == null ? "" : u.getPhone(), "role", u.getRole());
  }
  @GetMapping public Map<String, Object> get(Authentication a) { return view(users.findByEmail(a.getName()).orElseThrow()); }
  @PutMapping public Map<String, Object> put(@RequestBody Info i, Authentication a) {
    var u = users.findByEmail(a.getName()).orElseThrow(); u.setFirstName(i.firstName()); u.setLastName(i.lastName()); u.setPhone(i.phone());
    return view(users.save(u));
  }
  @PutMapping("/password")
  public ResponseEntity<?> pwd(@RequestBody Pwd p, Authentication a) {
    var u = users.findByEmail(a.getName()).orElseThrow();
    if (!enc.matches(p.oldPassword(), u.getPassword())) return ResponseEntity.badRequest().body(Map.of("error", "Ancien mot de passe incorrect"));
    if (p.newPassword() == null || p.newPassword().length() < 6) return ResponseEntity.badRequest().body(Map.of("error", "6 caractères minimum"));
    u.setPassword(enc.encode(p.newPassword())); users.save(u); return ResponseEntity.ok(Map.of("message", "Mot de passe modifié"));
  }
}
