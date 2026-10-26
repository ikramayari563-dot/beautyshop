package com.beautyshop.controller;
import com.beautyshop.model.*;
import com.beautyshop.repository.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
/** Une boutique gère ses propres produits (ownerShopId). La quantité initiale = champ stock ; ensuite via l'inventaire. */
@RestController @RequestMapping("/api/inventory/products") @PreAuthorize("hasAnyRole('ADMIN','BOUTIQUE')")
public class BoutiqueProductController {
  private final ProductRepository products; private final CategoryRepository cats; private final ShopStockRepository stocks;
  private final OrderRepository orders; private final UserRepository users;
  public BoutiqueProductController(ProductRepository p, CategoryRepository c, ShopStockRepository s, OrderRepository o, UserRepository u) { products = p; cats = c; stocks = s; orders = o; users = u; }
  private User me(Authentication a) { return users.findByEmail(a.getName()).orElseThrow(); }
  private Product owned(String id, Authentication a) {
    var u = me(a); var p = products.findById(id).orElseThrow();
    if (u.getRole() != Role.ADMIN && !(u.getShopId() != null && u.getShopId().equals(p.ownerShopId))) throw new NoSuchElementException();
    return p;
  }
  private void cat(Product p) { if (p.categoryId == null || !cats.existsById(p.categoryId)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Catégorie inexistante"); }
  @GetMapping public List<Product> mine(Authentication a) {
    var u = me(a); return products.findAll().stream().filter(p -> u.getRole() == Role.ADMIN || (u.getShopId() != null && u.getShopId().equals(p.ownerShopId))).toList();
  }
  @PostMapping public Product add(@RequestBody Product p, Authentication a) {
    var u = me(a); if (u.getRole() != Role.BOUTIQUE || u.getShopId() == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Réservé à un compte boutique rattaché à une boutique");
    cat(p); p.id = null; p.ownerShopId = u.getShopId(); int q = Math.max(0, p.stock); p.stock = q; products.save(p);
    var st = new ShopStock(); st.shopId = u.getShopId(); st.productId = p.id; st.quantity = q; stocks.save(st); return p;
  }
  @PutMapping("/{id}") public Product edit(@PathVariable String id, @RequestBody Product in, Authentication a) {
    var p = owned(id, a); cat(in); p.name = in.name; p.description = in.description; p.price = in.price; p.categoryId = in.categoryId;
    p.skinTypes = in.skinTypes; p.concerns = in.concerns; p.images = in.images; return products.save(p);
  }
  @DeleteMapping("/{id}") public void del(@PathVariable String id, Authentication a) {
    var p = owned(id, a);
    if (orders.findAll().stream().anyMatch(o -> o.items.stream().anyMatch(i -> id.equals(i.productId)))) throw new ResponseStatusException(HttpStatus.CONFLICT, "Produit déjà commandé");
    stocks.findByProductId(id).forEach(stocks::delete); products.delete(p);
  }
}
