package com.beautyshop.config;
import com.beautyshop.model.ShopStock;
import com.beautyshop.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
/** Répartit le stock existant entre les boutiques (une seule fois) et rattache le compte boutique à la 1re boutique. */
@Component @Order(2)
public class StockSeeder implements CommandLineRunner {
  private final ShopRepository shops; private final ShopStockRepository stocks;
  private final ProductRepository products; private final UserRepository users;
  public StockSeeder(ShopRepository s, ShopStockRepository ss, ProductRepository p, UserRepository u) { shops = s; stocks = ss; products = p; users = u; }
  @Override public void run(String... args) {
    var list = shops.findAll(); if (list.isEmpty()) return;
    users.findByEmail("boutique@beautyshop.com").ifPresent(u -> { if (u.getShopId() == null) { u.setShopId(list.get(0).id); users.save(u); } });
    if (stocks.count() > 0) return;
    for (var p : products.findAll()) {
      int left = p.stock, n = list.size();
      for (int i = 0; i < n; i++) {
        var st = new ShopStock(); st.shopId = list.get(i).id; st.productId = p.id;
        st.quantity = i == n - 1 ? left : p.stock / n; left -= st.quantity; stocks.save(st);
      }
    }
  }
}
