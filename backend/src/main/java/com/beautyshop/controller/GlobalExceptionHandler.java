package com.beautyshop.controller;
import java.util.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
@RestControllerAdvice
public class GlobalExceptionHandler {
  @ExceptionHandler(NoSuchElementException.class)
  ResponseEntity<?> notFound(Exception e) { return ResponseEntity.status(404).body(Map.of("error", "Introuvable")); }
  @ExceptionHandler(MethodArgumentNotValidException.class)
  ResponseEntity<?> invalid(MethodArgumentNotValidException e) {
    return ResponseEntity.badRequest().body(Map.of("error", e.getBindingResult().getFieldErrors().stream()
        .map(f -> f.getField() + " : " + f.getDefaultMessage()).toList().toString()));
  }
  @ExceptionHandler(org.springframework.web.server.ResponseStatusException.class)
  ResponseEntity<?> status(org.springframework.web.server.ResponseStatusException e) {
    return ResponseEntity.status(e.getStatusCode()).body(Map.of("error", String.valueOf(e.getReason())));
  }
}
