package com.beautyshop.controller;
import com.beautyshop.model.*;
import com.beautyshop.repository.*;
import java.time.Instant;
import java.util.*;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
/** Conversations (individuelles/groupes) et messages. Livraison temps réel + notifications via STOMP. */
@RestController @RequestMapping("/api")
public class MessagingController {
  record ConvReq(String name, List<String> members, boolean group) {}
  record MsgReq(String type, String text, String fileName, String data) {}
  private final ConversationRepository convs; private final MessageRepository msgs;
  private final UserRepository users; private final SimpMessagingTemplate ws;
  public MessagingController(ConversationRepository c, MessageRepository m, UserRepository u, SimpMessagingTemplate w) { convs = c; msgs = m; users = u; ws = w; }

  @GetMapping("/users/directory")
  public List<Map<String, Object>> directory(Authentication a) {
    return users.findAll().stream().filter(u -> u.isActive() && !u.getEmail().equals(a.getName()))
      .map(u -> Map.<String, Object>of("email", u.getEmail(), "name", u.getFirstName() + " " + u.getLastName(), "role", u.getRole())).toList();
  }
  @GetMapping("/conversations") public List<Conversation> mine(Authentication a) { return convs.findByMemberEmailsContainingOrderByLastAtDesc(a.getName()); }
  @GetMapping("/admin/conversations") public List<Conversation> all() { return convs.findAll(); }
  @PostMapping("/conversations")
  public ResponseEntity<?> create(@RequestBody ConvReq r, Authentication a) {
    var m = new LinkedHashSet<String>(r.members() == null ? List.of() : r.members()); m.add(a.getName());
    if (m.size() < 2) return ResponseEntity.badRequest().body(Map.of("error", "Choisissez au moins un participant"));
    boolean group = r.group() || m.size() > 2;
    if (!group) {
      var ex = convs.findByMemberEmailsContainingOrderByLastAtDesc(a.getName()).stream().filter(c -> !c.group && new HashSet<>(c.memberEmails).equals(m)).findFirst();
      if (ex.isPresent()) return ResponseEntity.ok(ex.get());
    }
    var c = new Conversation(); c.name = r.name(); c.group = group; c.memberEmails = new ArrayList<>(m);
    return ResponseEntity.ok(convs.save(c));
  }
  private boolean admin(Authentication a) { return a.getAuthorities().stream().anyMatch(g -> g.getAuthority().equals("ROLE_ADMIN")); }
  @GetMapping("/conversations/{id}/messages")
  public List<Message> messages(@PathVariable String id, Authentication a) {
    var c = convs.findById(id).orElseThrow();
    if (!admin(a) && !c.memberEmails.contains(a.getName())) throw new NoSuchElementException();
    return msgs.findByConversationIdOrderByCreatedAtAsc(id);
  }
  @PostMapping("/conversations/{id}/messages")
  public ResponseEntity<?> send(@PathVariable String id, @RequestBody MsgReq r, Authentication a) {
    var c = convs.findById(id).orElseThrow();
    if (!c.memberEmails.contains(a.getName())) throw new NoSuchElementException();
    if (r.data() != null && r.data().length() > 7_000_000) return ResponseEntity.badRequest().body(Map.of("error", "Fichier trop gros (5 Mo max)"));
    var u = users.findByEmail(a.getName()).orElseThrow(); var m = new Message();
    m.conversationId = id; m.sender = u.getEmail(); m.senderName = u.getFirstName() + " " + u.getLastName();
    m.type = r.type() == null ? "TEXT" : r.type(); m.text = r.text(); m.fileName = r.fileName(); m.data = r.data();
    msgs.save(m); c.lastAt = Instant.now(); convs.save(c);
    String preview = "TEXT".equals(m.type) ? m.text : ("IMAGE".equals(m.type) ? "📷 Photo" : "📎 " + m.fileName);
    for (String e : c.memberEmails) if (!e.equals(a.getName())) {
      ws.convertAndSendToUser(e, "/queue/messages", m);
      ws.convertAndSendToUser(e, "/queue/notifications", Map.of("conversationId", id, "from", m.senderName, "preview", preview));
    }
    return ResponseEntity.ok(m);
  }
}
