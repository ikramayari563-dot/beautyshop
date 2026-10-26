package com.beautyshop.model;
import java.time.Instant; import org.springframework.data.annotation.Id; import org.springframework.data.mongodb.core.mapping.Document;
@Document("payments") public class Payment { @Id public String id; public String orderId, method, status, transactionId; public double amount; public Instant createdAt = Instant.now(); }
