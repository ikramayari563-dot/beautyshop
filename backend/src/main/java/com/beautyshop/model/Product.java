package com.beautyshop.model;
import java.util.List;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
@Document("products")
public class Product {
  @Id public String id;
  public String name, description, categoryId, imageUrl, ownerShopId; public List<String> images;
  public double price; public int stock;
  public List<String> skinTypes, concerns;
}
