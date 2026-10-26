package com.beautyshop.controller;
import java.security.Principal;
import java.util.Map;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
/** Signalisation WebRTC : relaie offer / answer / ice / hangup vers l'autre utilisateur. */
@Controller
public class SignalController {
  record Sig(String to, String type, String payload) {}
  private final SimpMessagingTemplate ws;
  public SignalController(SimpMessagingTemplate ws) { this.ws = ws; }
  @MessageMapping("/signal")
  public void signal(Sig s, Principal p) {
    ws.convertAndSendToUser(s.to(), "/queue/signal", Map.of("from", p.getName(), "type", s.type(), "payload", s.payload() == null ? "" : s.payload()));
  }
}
