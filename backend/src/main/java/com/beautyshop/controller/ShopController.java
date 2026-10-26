package com.beautyshop.controller;
import com.beautyshop.model.*;
import com.beautyshop.repository.*;
import java.util.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api")
public class ShopController {
  record Line(String productId, int qty) {}
  record OrderReq(List<Line> items, String paymentMethod, String shopId, String address, String cardNumber) {}
  private final ProductRepository products; private final CategoryRepository cats;
  private final OrderRepository orders; private final UserRepository users;
  private final ShopStockRepository stocks; private final PaymentRepository pays;
  public ShopController(ProductRepository p, CategoryRepository c, OrderRepository o, UserRepository u, ShopStockRepository ss, PaymentRepository pa) {
    products = p; cats = c; orders = o; users = u; stocks = ss; pays = pa;
  }
  @GetMapping("/products") public List<Product> products() { return products.findAll(); }
  @GetMapping("/categories") public List<Category> categories() { return cats.findAll(); }

  /** Crée la commande : prix et stock sont vérifiés côté serveur (jamais confiance au client). */
  @PostMapping("/orders")
  public ResponseEntity<?> order(@RequestBody OrderReq r, Authentication a) {
    if (r.items() == null || r.items().isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "Panier vide"));
    users.findByEmail(a.getName()).orElseThrow();   // la commande exige un client existant
    if (r.address() == null || r.address().isBlank()) return ResponseEntity.badRequest().body(Map.of("error", "Adresse de livraison requise"));
    if ("CARD".equals(r.paymentMethod()) && (r.cardNumber() == null || r.cardNumber().endsWith("0000"))) {   // simulation d'un refus
      var f = new Payment(); f.method = "CARD"; f.status = "FAILED"; f.transactionId = "TXN-" + UUID.randomUUID(); pays.save(f);
      return ResponseEntity.status(402).body(Map.of("error", "Paiement refusé (simulation)"));
    }
    var o = new Order(); o.userEmail = a.getName(); o.paymentMethod = r.paymentMethod(); o.address = r.address();
    var toSave = new ArrayList<Product>(); var ss = new ArrayList<ShopStock>(); o.shopId = r.shopId();
    for (Line l : r.items()) {
      Product p = products.findById(l.productId()).orElseThrow();
      var st = stocks.findByShopIdAndProductId(r.shopId() == null ? "" : r.shopId(), p.id).orElse(null);
      if (st == null || l.qty() <= 0 || st.quantity < l.qty())
        return ResponseEntity.badRequest().body(Map.of("error", "Stock insuffisant dans cette boutique : " + p.name));
      st.quantity -= l.qty(); p.stock -= l.qty(); ss.add(st); toSave.add(p);
      var it = new Order.Item(); it.productId = p.id; it.name = p.name; it.price = p.price; it.qty = l.qty();
      o.items.add(it); o.total += p.price * l.qty();
    }
    products.saveAll(toSave); stocks.saveAll(ss);
    var saved = orders.save(o); var pm = new Payment(); pm.orderId = saved.id; pm.method = r.paymentMethod(); pm.amount = saved.total;
    pm.status = "COD".equals(pm.method) ? "PENDING" : "PAID"; pm.transactionId = "TXN-" + UUID.randomUUID(); pays.save(pm);   // CARD/PAYPAL simulés => PAID
    return ResponseEntity.ok(saved);
  }
  @GetMapping("/orders/mine") public List<Order> mine(Authentication a) { return orders.findByUserEmailOrderByCreatedAtDesc(a.getName()); }
  @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMIN','BOUTIQUE')") @GetMapping("/shop/orders") public List<Order> all(Authentication a) {   // une boutique ne voit que ses commandes
    var u = users.findByEmail(a.getName()).orElseThrow();
    return orders.findAllByOrderByCreatedAtDesc().stream().filter(o -> u.getRole() != Role.BOUTIQUE || (u.getShopId() != null && u.getShopId().equals(o.shopId))).toList();
  }
  @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMIN','BOUTIQUE')") @PutMapping("/shop/orders/{id}/status")
  public Order status(@PathVariable String id, @RequestParam String value, Authentication a) {
    if (!List.of("CONFIRMED", "SHIPPED", "DELIVERED").contains(value)) throw new NoSuchElementException();
    var o = orders.findById(id).orElseThrow(); var u = users.findByEmail(a.getName()).orElseThrow();
    if (u.getRole() == Role.BOUTIQUE && !(u.getShopId() != null && u.getShopId().equals(o.shopId))) throw new NoSuchElementException();
    o.status = value; return orders.save(o);
  }
  @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMIN','MANAGER')") @GetMapping("/manager/stock") public List<Product> stock() { return products.findAll(); }
  @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMIN')") @GetMapping("/admin/users")
  public List<Map<String, Object>> users() {
    return users.findAll().stream().map(u -> Map.<String, Object>of("id", u.getId(), "email", u.getEmail(),
        "name", u.getFirstName() + " " + u.getLastName(), "role", u.getRole(), "active", u.isActive())).toList();
  }
  @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMIN')") @PutMapping("/admin/users/{id}/toggle")
  public Map<String, Object> toggle(@PathVariable String id) {
    var u = users.findById(id).orElseThrow(); u.setActive(!u.isActive()); users.save(u);
    return Map.of("active", u.isActive());
  }
}
