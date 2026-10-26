package com.beautyshop.model;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
@Document("categories")
public class Category { @Id public String id; public String name, description; }
