package com.beautyshop.model;
import java.time.Instant;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
@Document("comments")
public class Comment {
  @Id public String id;
  public String photo, productId, userEmail, userName, text, reply, status = "PENDING"; // PENDING / APPROVED
  public int rating; public Instant createdAt = Instant.now();
}
