package com.beautyshop.config;
import com.beautyshop.model.*;
import com.beautyshop.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
/** Crée les 4 comptes de test (mots de passe hachés BCrypt) s'ils n'existent pas. */
@Component @org.springframework.core.annotation.Order(1)
public class DataSeeder implements CommandLineRunner {
  private final UserRepository repo; private final PasswordEncoder enc;
  public DataSeeder(UserRepository r, PasswordEncoder e) { repo = r; enc = e; }
  @Override public void run(String... args) {
    seed("admin", "admin123", Role.ADMIN, "Admin");
    seed("manager", "manager123", Role.MANAGER, "Manager");
    seed("boutique", "boutique123", Role.BOUTIQUE, "Boutique");
    seed("client", "client123", Role.CLIENT, "Client");
  }
  private void seed(String name, String pwd, Role role, String first) {
    String email = name + "@beautyshop.com";
    if (repo.findByEmail(email).isPresent()) return;
    var u = new User(); u.setEmail(email); u.setPassword(enc.encode(pwd)); u.setRole(role);
    u.setFirstName(first); u.setLastName("BeautyShop"); repo.save(u);
  }
}
