package com.beautyshop.model;
import org.springframework.data.annotation.Id; import org.springframework.data.mongodb.core.mapping.Document;
@Document("shop_stock") public class ShopStock { @Id public String id; public String shopId, productId; public int quantity; }
