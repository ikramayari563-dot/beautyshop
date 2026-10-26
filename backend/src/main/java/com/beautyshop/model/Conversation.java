package com.beautyshop.model;
import java.time.Instant;
import java.util.List;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
@Document("conversations")
public class Conversation {
  @Id public String id;
  public String name; public boolean group; public List<String> memberEmails;
  public Instant createdAt = Instant.now(), lastAt = Instant.now();
}
