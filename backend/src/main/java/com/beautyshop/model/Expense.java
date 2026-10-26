package com.beautyshop.model;
import java.time.Instant; import org.springframework.data.annotation.Id; import org.springframework.data.mongodb.core.mapping.Document;
@Document("expenses") public class Expense { @Id public String id; public String shopId, label; public double amount; public Instant createdAt = Instant.now(); }
