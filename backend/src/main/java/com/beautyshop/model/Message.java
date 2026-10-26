package com.beautyshop.model;
import java.time.Instant;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
@Document("messages")
public class Message {
  @Id public String id;
  public String conversationId, sender, senderName, type = "TEXT"; // TEXT / IMAGE / FILE
  public String text, fileName, data;                                // data = data-URL base64 (image/fichier)
  public Instant createdAt = Instant.now();
}
