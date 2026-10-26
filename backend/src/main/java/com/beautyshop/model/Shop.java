package com.beautyshop.model;
import org.springframework.data.annotation.Id; import org.springframework.data.mongodb.core.mapping.Document;
@Document("shops") public class Shop { @Id public String id; public String name, city, address; public boolean active = true; }
