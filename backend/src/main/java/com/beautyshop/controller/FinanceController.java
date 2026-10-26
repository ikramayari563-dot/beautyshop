package com.beautyshop.controller;
import com.beautyshop.model.*;
import com.beautyshop.repository.*;
import com.lowagie.text.Document;
import com.lowagie.text.Paragraph;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import java.io.ByteArrayOutputStream;
import java.util.*;
import java.util.stream.Collectors;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
/** Boutiques, inventaire par boutique, compte financier (revenus - dépenses) et exports PDF/Excel. */
@RestController @RequestMapping("/api")
public class FinanceController {
  record ExpenseReq(String label, double amount, String shopId) {}
  private final ShopRepository shops; private final ShopStockRepository stocks; private final ProductRepository products;
  private final OrderRepository orders; private final ExpenseRepository expenses; private final UserRepository users;
  public FinanceController(ShopRepository s, ShopStockRepository ss, ProductRepository p, OrderRepository o, ExpenseRepository e, UserRepository u) {
    shops = s; stocks = ss; products = p; orders = o; expenses = e; users = u;
  }
  private User me(Authentication a) { return users.findByEmail(a.getName()).orElseThrow(); }
  /** Un compte BOUTIQUE est toujours limité à sa boutique ; ADMIN/MANAGER peuvent choisir (null = toutes). */
  private String scope(Authentication a, String shopId) { var u = me(a); return u.getRole() == Role.BOUTIQUE ? u.getShopId() : shopId; }
  /** Revenus = commandes non PENDING ; dépenses = table expenses ; bénéfice = revenus - dépenses. */
  private Map<String, Object> sum(String sid, String name) {
    double rev = orders.findAll().stream().filter(o -> (sid == null || sid.equals(o.shopId)) && !"PENDING".equals(o.status)).mapToDouble(o -> o.total).sum();
    double exp = expenses.findAll().stream().filter(e -> sid == null || sid.equals(e.shopId)).mapToDouble(e -> e.amount).sum();
    return Map.<String, Object>of("shopId", sid == null ? "ALL" : sid, "name", name, "revenue", rev, "expenses", exp, "profit", rev - exp);
  }
  @GetMapping("/shops") public List<Shop> shops() { return shops.findAll(); }
  @GetMapping("/finance")
  public Map<String, Object> finance(@RequestParam(required = false) String shopId, Authentication a) {
    String sid = scope(a, shopId);
    var per = shops.findAll().stream().filter(s -> sid == null || s.id.equals(sid)).map(s -> sum(s.id, s.name)).toList();
    var ex = expenses.findAll().stream().filter(e -> sid == null || sid.equals(e.shopId)).toList();
    return Map.of("total", sum(sid, sid == null ? "Toutes les boutiques" : "Boutique"), "perShop", per, "expenses", ex);
  }
  @PostMapping("/finance/expenses")
  public Expense addExpense(@RequestBody ExpenseReq r, Authentication a) {
    var u = me(a); if (u.getRole() == Role.MANAGER) throw new NoSuchElementException();
    var e = new Expense(); e.shopId = u.getRole() == Role.BOUTIQUE ? u.getShopId() : r.shopId(); e.label = r.label(); e.amount = r.amount();
    return expenses.save(e);
  }
  @GetMapping("/inventory")
  public List<Map<String, Object>> inventory(@RequestParam(required = false) String shopId, Authentication a) {
    String sid = scope(a, shopId);
    var pm = products.findAll().stream().collect(Collectors.toMap(p -> p.id, p -> p));
    var sm = shops.findAll().stream().collect(Collectors.toMap(s -> s.id, s -> s.name));
    return stocks.findAll().stream().filter(s -> sid == null || sid.equals(s.shopId)).map(s -> {
      var p = pm.get(s.productId);
      return Map.<String, Object>of("id", s.id, "shopId", s.shopId, "shop", sm.getOrDefault(s.shopId, "?"), "product", p == null ? "?" : p.name,
          "categoryId", p == null || p.categoryId == null ? "" : p.categoryId, "quantity", s.quantity, "low", s.quantity < 10);
    }).toList();
  }
  @PutMapping("/inventory/{id}")
  public ShopStock adjust(@PathVariable String id, @RequestParam int quantity, Authentication a) {
    var u = me(a); if (u.getRole() == Role.MANAGER || quantity < 0) throw new NoSuchElementException();
    var s = stocks.findById(id).orElseThrow();
    if (u.getRole() == Role.BOUTIQUE && !s.shopId.equals(u.getShopId())) throw new NoSuchElementException();
    s.quantity = quantity; stocks.save(s);
    products.findById(s.productId).ifPresent(p -> { p.stock = stocks.findByProductId(p.id).stream().mapToInt(x -> x.quantity).sum(); products.save(p); });
    return s;
  }
  @SuppressWarnings("unchecked")
  @GetMapping("/export/{fmt}")
  public ResponseEntity<byte[]> export(@PathVariable String fmt, @RequestParam(required = false) String shopId, Authentication a) throws Exception {
    var f = finance(shopId, a); var rows = new ArrayList<Object[]>();
    rows.add(new Object[]{"Boutique", "Revenus", "Dépenses", "Bénéfice"});
    for (var m : (List<Map<String, Object>>) f.get("perShop")) rows.add(new Object[]{m.get("name"), m.get("revenue"), m.get("expenses"), m.get("profit")});
    var t = (Map<String, Object>) f.get("total"); rows.add(new Object[]{"TOTAL", t.get("revenue"), t.get("expenses"), t.get("profit")});
    var out = new ByteArrayOutputStream(); String type, ext;
    if (fmt.equals("excel")) {
      try (var wb = new XSSFWorkbook()) {
        var sh = wb.createSheet("Finance"); int i = 0;
        for (Object[] r : rows) { var x = sh.createRow(i++);
          for (int c = 0; c < r.length; c++) { if (r[c] instanceof Number n) x.createCell(c).setCellValue(n.doubleValue()); else x.createCell(c).setCellValue(String.valueOf(r[c])); } }
        wb.write(out);
      }
      type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"; ext = "xlsx";
    } else {
      var d = new Document(); PdfWriter.getInstance(d, out); d.open(); d.add(new Paragraph("BeautyShop - Rapport financier"));
      var tb = new PdfPTable(4); for (Object[] r : rows) for (Object c : r) tb.addCell(String.valueOf(c));
      d.add(tb); d.close(); type = "application/pdf"; ext = "pdf";
    }
    return ResponseEntity.ok().header("Content-Disposition", "attachment; filename=rapport." + ext).contentType(MediaType.parseMediaType(type)).body(out.toByteArray());
  }
}
