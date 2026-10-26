package com.beautyshop.controller;
import com.beautyshop.model.*;
import com.beautyshop.repository.*;
import java.util.*;
import org.springframework.http.HttpStatus; import org.springframework.http.ResponseEntity; import org.springframework.web.server.ResponseStatusException;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
/** Avis, chatbot, facture, CRUD admin (produits, catégories, utilisateurs), statistiques. */
@RestController @RequestMapping("/api")
public class ExtraController {
  record ReviewReq(String productId, int rating, String text, String photo) {}
  record DiagReq(String skinType, List<String> concerns, double budget) {}
  record NewUser(String email, String password, String firstName, String lastName, String phone, Role role) {}
  private static final Map<String, String> ADVICE = Map.of(
    "GRASSE", "Peau grasse : nettoyez matin et soir avec un gel doux, hydratez avec une texture légère, évitez les produits comédogènes.",
    "SECHE", "Peau sèche : privilégiez les soins riches (acide hyaluronique, céramides), appliquez sur peau légèrement humide.",
    "MIXTE", "Peau mixte : adaptez les soins par zone (zone T plus légère, joues plus nourries).",
    "SENSIBLE", "Peau sensible : choisissez des produits sans parfum, testez toujours sur une petite zone, appliquez la crème apaisante matin et soir.",
    "NORMALE", "Peau normale : gardez une routine simple (nettoyage, hydratation, protection solaire).");
  private static final Map<String, String> DIAG = Map.of(
    "GRASSE", "Votre peau produit un excès de sébum : elle brille, les pores sont dilatés et des imperfections peuvent apparaître.",
    "SECHE", "Votre peau manque de lipides et d'eau : elle tire, peut peler et paraître terne.",
    "MIXTE", "Votre peau est grasse sur la zone T (front, nez, menton) et normale à sèche sur les joues.",
    "SENSIBLE", "Votre peau réagit facilement (rougeurs, picotements) : sa barrière cutanée est fragile.",
    "NORMALE", "Votre peau est équilibrée : ni trop grasse ni trop sèche.");
  private final ProductRepository products; private final CategoryRepository cats; private final OrderRepository orders;
  private final UserRepository users; private final CommentRepository comments;
  private final ChatbotSessionRepository sessions; private final PasswordEncoder enc;
  public ExtraController(ProductRepository p, CategoryRepository c, OrderRepository o, UserRepository u,
      CommentRepository cm, ChatbotSessionRepository s, PasswordEncoder e) {
    products = p; cats = c; orders = o; users = u; comments = cm; sessions = s; enc = e;
  }
  private void checkCat(Product p) { if (p.categoryId == null || !cats.existsById(p.categoryId)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Catégorie inexistante"); }
  // ----- produit + facture -----
  @GetMapping("/products/{id}") public Product product(@PathVariable String id) { return products.findById(id).orElseThrow(); }
  @GetMapping("/orders/{id}")
  public Order order(@PathVariable String id, Authentication a) {
    var o = orders.findById(id).orElseThrow();
    boolean staff = a.getAuthorities().stream().anyMatch(g -> g.getAuthority().equals("ROLE_ADMIN") || g.getAuthority().equals("ROLE_BOUTIQUE"));
    if (!staff && !o.userEmail.equals(a.getName())) throw new NoSuchElementException();
    return o;
  }
  // ----- avis -----
  @GetMapping("/products/{id}/reviews")
  public Map<String, Object> reviews(@PathVariable String id) {
    var l = comments.findByProductIdAndStatus(id, "APPROVED");
    double avg = l.stream().mapToInt(c -> c.rating).average().orElse(0);
    return Map.of("average", Math.round(avg * 10) / 10.0, "count", l.size(), "reviews", l);
  }
  @PostMapping("/reviews")
  public ResponseEntity<?> review(@RequestBody ReviewReq r, Authentication a) {
    if (r.rating() < 1 || r.rating() > 5) return ResponseEntity.badRequest().body(Map.of("error", "Note entre 1 et 5"));
    var u = users.findByEmail(a.getName()).orElseThrow();
    boolean bought = orders.findByUserEmailOrderByCreatedAtDesc(a.getName()).stream().anyMatch(o -> o.items.stream().anyMatch(i -> r.productId().equals(i.productId)));
    if (!bought) return ResponseEntity.status(403).body(Map.of("error", "Avis réservé aux acheteurs de ce produit"));
    var c = new Comment(); c.photo = r.photo();
    c.productId = r.productId(); c.rating = r.rating(); c.text = r.text(); c.userEmail = u.getEmail();
    c.userName = u.getFirstName() + " " + u.getLastName();
    return ResponseEntity.ok(comments.save(c));
  }
  @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMIN')") @GetMapping("/admin/reviews") public List<Comment> pending() { return comments.findByStatus("PENDING"); }
  @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMIN')") @PutMapping("/admin/reviews/{id}/approve")
  public Comment approve(@PathVariable String id) { var c = comments.findById(id).orElseThrow(); c.status = "APPROVED"; return comments.save(c); }
  @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMIN')") @PutMapping("/admin/reviews/{id}/reply")
  public Comment reply(@PathVariable String id, @RequestParam String text) { var c = comments.findById(id).orElseThrow(); c.reply = text; return comments.save(c); }
  @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMIN')") @DeleteMapping("/admin/reviews/{id}") public void delReview(@PathVariable String id) { comments.deleteById(id); }
  // ----- chatbot -----
  @PostMapping("/chatbot/diagnose")
  public Map<String, Object> diagnose(@RequestBody DiagReq r, Authentication a) {
    List<String> cs = r.concerns() == null ? List.of() : r.concerns();
    var recs = products.findAll().stream().filter(p -> p.stock > 0 && (r.budget() <= 0 || p.price <= r.budget())).map(p -> {
      int s = 0; var why = new ArrayList<String>();
      if (p.skinTypes != null && p.skinTypes.contains(r.skinType())) { s += 2; why.add("adapté aux peaux " + r.skinType().toLowerCase()); }
      if (p.concerns != null) for (String c : cs) if (p.concerns.contains(c)) { s++; why.add("cible : " + c.toLowerCase()); }
      return Map.<String, Object>of("id", p.id, "name", p.name, "price", p.price, "score", s, "why", String.join(", ", why));
    }).filter(m -> (int) m.get("score") > 0).sorted((x, y) -> (int) y.get("score") - (int) x.get("score")).limit(3).toList();
    String diag = DIAG.getOrDefault(r.skinType(), "") + (cs.isEmpty() ? "" : " Préoccupations identifiées : " + String.join(", ", cs).toLowerCase() + ".");
    var s = new ChatbotSession(); s.userEmail = a.getName(); s.skinType = r.skinType(); s.concerns = cs; s.diagnosis = diag;
    s.recommended = recs.stream().map(m -> (String) m.get("name")).toList(); sessions.save(s);
    return Map.of("diagnosis", diag, "advice", ADVICE.getOrDefault(r.skinType(), ""), "recommendations", recs);
  }
  @GetMapping("/chatbot/history") public List<ChatbotSession> history(Authentication a) { return sessions.findByUserEmailOrderByCreatedAtDesc(a.getName()); }
  // ----- admin : produits, catégories, utilisateurs, stats -----
  @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMIN')") @PostMapping("/admin/products") public Product addProduct(@RequestBody Product p) { p.id = null; checkCat(p); return products.save(p); }
  @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMIN')") @PutMapping("/admin/products/{id}") public Product editProduct(@PathVariable String id, @RequestBody Product p) { p.id = id; checkCat(p); return products.save(p); }
  @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMIN')") @DeleteMapping("/admin/products/{id}") public void delProduct(@PathVariable String id) { products.deleteById(id); }
  @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMIN')") @PostMapping("/admin/categories") public Category addCat(@RequestBody Category c) { c.id = null; return cats.save(c); }
  @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMIN')") @DeleteMapping("/admin/categories/{id}") public void delCat(@PathVariable String id) { if (products.existsByCategoryId(id)) throw new ResponseStatusException(HttpStatus.CONFLICT, "Catégorie encore utilisée par des produits"); cats.deleteById(id); }
  @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMIN')") @PostMapping("/admin/users")
  public ResponseEntity<?> createUser(@RequestBody NewUser n) {
    if (users.findByEmail(n.email()).isPresent()) return ResponseEntity.status(409).body(Map.of("error", "Email déjà utilisé"));
    var u = new User(); u.setEmail(n.email()); u.setPassword(enc.encode(n.password())); u.setFirstName(n.firstName());
    u.setLastName(n.lastName()); u.setPhone(n.phone()); u.setRole(n.role() == null ? Role.CLIENT : n.role());
    users.save(u); return ResponseEntity.ok(Map.of("id", u.getId()));
  }
  @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMIN')") @DeleteMapping("/admin/users/{id}") public void delUser(@PathVariable String id) { var u = users.findById(id).orElseThrow(); if (orders.existsByUserEmail(u.getEmail())) throw new ResponseStatusException(HttpStatus.CONFLICT, "Client encore référencé par des commandes"); users.deleteById(id); }
  @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMIN')") @GetMapping("/admin/stats")
  public Map<String, Object> stats() {
    var all = orders.findAll();
    return Map.<String, Object>of("users", users.count(), "products", products.count(), "orders", all.size(),
        "revenue", all.stream().mapToDouble(o -> o.total).sum());
  }
}
