package com.beautyshop.config;
import com.beautyshop.security.JwtUtil;
import java.util.List;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.web.socket.config.annotation.*;
/** STOMP sur /ws. Le JWT est exigé dans l'en-tête Authorization de la trame CONNECT. */
@Configuration @EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
  private final JwtUtil jwt;
  public WebSocketConfig(JwtUtil jwt) { this.jwt = jwt; }
  @Override public void registerStompEndpoints(StompEndpointRegistry r) { r.addEndpoint("/ws").setAllowedOriginPatterns("*"); }
  @Override public void configureMessageBroker(MessageBrokerRegistry r) {
    r.enableSimpleBroker("/queue", "/topic"); r.setApplicationDestinationPrefixes("/app"); r.setUserDestinationPrefix("/user");
  }
  @Override public void configureClientInboundChannel(ChannelRegistration reg) {
    reg.interceptors(new ChannelInterceptor() {
      @Override public Message<?> preSend(Message<?> msg, MessageChannel ch) {
        var acc = MessageHeaderAccessor.getAccessor(msg, StompHeaderAccessor.class);
        if (acc != null && StompCommand.CONNECT.equals(acc.getCommand())) {
          String h = acc.getFirstNativeHeader("Authorization");
          if (h == null || !h.startsWith("Bearer ")) throw new IllegalArgumentException("Non authentifié");
          var c = jwt.parse(h.substring(7));
          acc.setUser(new UsernamePasswordAuthenticationToken(c.getSubject(), null, List.of(new SimpleGrantedAuthority("ROLE_" + c.get("role", String.class)))));
        }
        return msg;
      }
    });
  }
}
