package com.beautyshop.model;
import java.time.Instant;
import java.util.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
@Document("orders")
public class Order {
  @Id public String id;
  public String userEmail, paymentMethod, status = "PENDING"; // PENDING>CONFIRMED>SHIPPED>DELIVERED
  public String shopId, address; public double total; public Instant createdAt = Instant.now();
  public List<Item> items = new ArrayList<>();
  public static class Item { public String productId, name; public double price; public int qty; }
}
