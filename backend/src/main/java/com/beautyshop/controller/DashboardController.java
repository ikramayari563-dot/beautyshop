package com.beautyshop.controller;
import com.beautyshop.model.*;
import com.beautyshop.repository.*;
import java.time.*;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
/** Indicateurs du tableau de bord selon le rôle : ADMIN et MANAGER (réseau), BOUTIQUE (sa boutique), CLIENT (ses données). */
@RestController @RequestMapping("/api")
public class DashboardController {
  private final OrderRepository orders; private final ExpenseRepository expenses; private final ShopRepository shops;
  private final ShopStockRepository stocks; private final ProductRepository products; private final UserRepository users;
  private final CommentRepository comments; private final ConversationRepository convs; private final ChatbotSessionRepository sessions;
  public DashboardController(OrderRepository o, ExpenseRepository e, ShopRepository s, ShopStockRepository ss, ProductRepository p,
      UserRepository u, CommentRepository c, ConversationRepository cv, ChatbotSessionRepository cs) {
    orders = o; expenses = e; shops = s; stocks = ss; products = p; users = u; comments = c; convs = cv; sessions = cs;
  }
  private Map<String, Long> byStatus(List<Order> l) { return l.stream().collect(Collectors.groupingBy(o -> o.status, Collectors.counting())); }
  @GetMapping("/dashboard")
  public Map<String, Object> dashboard(Authentication a) {
    var u = users.findByEmail(a.getName()).orElseThrow(); var out = new LinkedHashMap<String, Object>(); out.put("role", u.getRole());
    if (u.getRole() == Role.CLIENT) {
      var mine = orders.findByUserEmailOrderByCreatedAtDesc(u.getEmail()); var ss = sessions.findByUserEmailOrderByCreatedAtDesc(u.getEmail());
      out.put("orders", mine.size()); out.put("spent", mine.stream().mapToDouble(o -> o.total).sum()); out.put("byStatus", byStatus(mine));
      out.put("recent", mine.stream().limit(5).toList()); out.put("consultations", ss.size()); out.put("lastDiagnosis", ss.isEmpty() ? "" : ss.get(0).diagnosis);
      return out;
    }
    String sid = u.getRole() == Role.BOUTIQUE ? u.getShopId() : null;
    var os = orders.findAll().stream().filter(o -> sid == null || sid.equals(o.shopId)).toList();
    var paid = os.stream().filter(o -> !"PENDING".equals(o.status)).toList();
    double rev = paid.stream().mapToDouble(o -> o.total).sum();
    double exp = expenses.findAll().stream().filter(e -> sid == null || sid.equals(e.shopId)).mapToDouble(e -> e.amount).sum();
    out.put("revenue", rev); out.put("expenses", exp); out.put("profit", rev - exp); out.put("orders", os.size());
    out.put("pending", os.stream().filter(o -> "PENDING".equals(o.status)).count()); out.put("byStatus", byStatus(os));
    var today = LocalDate.now(ZoneOffset.UTC); var days = new ArrayList<Map<String, Object>>();
    for (int i = 6; i >= 0; i--) {
      var d = today.minusDays(i);
      double t = paid.stream().filter(o -> o.createdAt.atZone(ZoneOffset.UTC).toLocalDate().equals(d)).mapToDouble(o -> o.total).sum();
      days.add(Map.<String, Object>of("day", d.toString().substring(5), "total", t));
    }
    out.put("salesByDay", days);
    var qty = new HashMap<String, Integer>(); os.forEach(o -> o.items.forEach(i -> qty.merge(i.name, i.qty, Integer::sum)));
    out.put("topProducts", qty.entrySet().stream().sorted((x, y) -> y.getValue() - x.getValue()).limit(5)
        .map(e -> Map.<String, Object>of("name", e.getKey(), "qty", e.getValue())).toList());
    var pn = products.findAll().stream().collect(Collectors.toMap(p -> p.id, p -> p.name));
    var sn = shops.findAll().stream().collect(Collectors.toMap(s -> s.id, s -> s.name));
    out.put("lowStock", stocks.findAll().stream().filter(s -> s.quantity < 10 && (sid == null || sid.equals(s.shopId))).limit(20)
        .map(s -> Map.<String, Object>of("shop", sn.getOrDefault(s.shopId, "?"), "product", pn.getOrDefault(s.productId, "?"), "quantity", s.quantity)).toList());
    out.put("recent", os.stream().sorted(Comparator.comparing((Order o) -> o.createdAt).reversed()).limit(5).toList());
    if (sid == null) out.put("perShop", shops.findAll().stream().map(s -> Map.<String, Object>of("name", s.name,
        "revenue", paid.stream().filter(o -> s.id.equals(o.shopId)).mapToDouble(o -> o.total).sum(),
        "orders", os.stream().filter(o -> s.id.equals(o.shopId)).count())).toList());
    if (u.getRole() == Role.ADMIN) {
      out.put("usersByRole", users.findAll().stream().collect(Collectors.groupingBy(x -> x.getRole().name(), Collectors.counting())));
      out.put("products", products.count()); out.put("pendingReviews", comments.findByStatus("PENDING").size()); out.put("conversations", convs.count());
    }
    return out;
  }
}
