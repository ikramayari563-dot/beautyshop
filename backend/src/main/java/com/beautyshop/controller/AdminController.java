package com.beautyshop.controller;
import com.beautyshop.model.*;
import com.beautyshop.repository.*;
import java.util.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
/** CRUD complet des comptes (lecture détaillée + modification) et modification des catégories. */
@RestController @RequestMapping("/api/admin") @PreAuthorize("hasRole('ADMIN')")
public class AdminController {
  record UserEdit(String firstName, String lastName, String phone, Role role, String shopId, String password) {}
  private final UserRepository users; private final CategoryRepository cats; private final PasswordEncoder enc;
  public AdminController(UserRepository u, CategoryRepository c, PasswordEncoder e) { users = u; cats = c; enc = e; }
  @GetMapping("/users/full")
  public List<Map<String, Object>> full() {
    return users.findAll().stream().map(u -> { var m = new HashMap<String, Object>();
      m.put("id", u.getId()); m.put("email", u.getEmail()); m.put("firstName", u.getFirstName()); m.put("lastName", u.getLastName());
      m.put("phone", u.getPhone()); m.put("role", u.getRole()); m.put("shopId", u.getShopId()); m.put("active", u.isActive()); return (Map<String, Object>) m; }).toList();
  }
  @PutMapping("/users/{id}")
  public Map<String, Object> edit(@PathVariable String id, @RequestBody UserEdit e) {
    var u = users.findById(id).orElseThrow();
    if (e.firstName() != null) u.setFirstName(e.firstName()); if (e.lastName() != null) u.setLastName(e.lastName());
    if (e.phone() != null) u.setPhone(e.phone()); if (e.role() != null) u.setRole(e.role());
    if (e.shopId() != null) u.setShopId(e.shopId().isBlank() ? null : e.shopId());
    if (e.password() != null && !e.password().isBlank()) u.setPassword(enc.encode(e.password()));
    users.save(u); return Map.of("id", id);
  }
  @PutMapping("/categories/{id}")
  public Category editCat(@PathVariable String id, @RequestBody Category c) { if (!cats.existsById(id)) throw new NoSuchElementException(); c.id = id; return cats.save(c); }
}
