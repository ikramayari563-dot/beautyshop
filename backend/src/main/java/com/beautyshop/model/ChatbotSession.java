package com.beautyshop.model;
import java.time.Instant;
import java.util.List;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
@Document("chatbot_sessions")
public class ChatbotSession {
  @Id public String id;
  public String userEmail, skinType, diagnosis; public List<String> concerns, recommended;
  public Instant createdAt = Instant.now();
}
