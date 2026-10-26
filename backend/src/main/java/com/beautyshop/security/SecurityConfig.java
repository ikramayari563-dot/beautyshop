package com.beautyshop.security;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.*;
@Configuration @org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity
public class SecurityConfig {
  @Bean PasswordEncoder encoder() { return new BCryptPasswordEncoder(); }
  @Bean SecurityFilterChain chain(HttpSecurity http, JwtFilter f) throws Exception {
    http.csrf(c -> c.disable()).cors(c -> {})
      .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
      .authorizeHttpRequests(a -> a
        .requestMatchers("/api/auth/**", "/swagger-ui/**", "/v3/api-docs/**", "/ws/**").permitAll()
        .requestMatchers(HttpMethod.GET, "/api/products/**", "/api/categories/**").permitAll()
        .requestMatchers("/api/admin/**").hasRole("ADMIN")
        .requestMatchers("/api/finance/**", "/api/export/**", "/api/inventory/**").hasAnyRole("ADMIN", "MANAGER", "BOUTIQUE")
        .requestMatchers("/api/manager/**").hasAnyRole("ADMIN", "MANAGER")
        .requestMatchers("/api/shop/**").hasAnyRole("ADMIN", "BOUTIQUE")
        .anyRequest().authenticated())
      .addFilterBefore(f, UsernamePasswordAuthenticationFilter.class);
    return http.build();
  }
  @Bean CorsConfigurationSource cors(@Value("${app.cors.origins}") String origins) {
    var c = new CorsConfiguration();
    c.setAllowedOrigins(List.of(origins.split(",")));
    c.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
    c.setAllowedHeaders(List.of("*"));
    var s = new UrlBasedCorsConfigurationSource(); s.registerCorsConfiguration("/**", c); return s;
  }
}
